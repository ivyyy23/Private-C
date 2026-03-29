/**
 * Session-scoped Declarative Net Request rules — blocks third-party requests
 * matching the tracker catalog for the current tab + initiator site.
 * Also blocks http(s) URLs whose host is a literal IPv4 or bracketed IPv6 address
 * (regexFilter), since those cannot be expressed as requestDomains entries.
 * Optional trackers.block_ip_endpoints enables IP literal rules without catalog domains.
 * Chromium (Chrome, Edge, Brave). Firefox MV3 DNR may differ.
 */
(function initDnrSession() {
  const SESSION_KEY_PREFIX = "pc_dnr_rule_ids_";

  function sessionKey(tabId) {
    return SESSION_KEY_PREFIX + tabId;
  }

  function collectSuffixes(pred) {
    const set = new Set();
    const rules = self.PC_TRACKER_RULES || [];
    for (let i = 0; i < rules.length; i++) {
      const r = rules[i];
      if (pred(String(r.category || "").toLowerCase())) {
        set.add(r.suffix);
      }
    }
    return [...set];
  }

  function allCatalogSuffixes() {
    const set = new Set();
    const rules = self.PC_TRACKER_RULES || [];
    for (let i = 0; i < rules.length; i++) {
      set.add(rules[i].suffix);
    }
    return [...set];
  }

  /**
   * Map saved site rules → requestDomains to block for this tab.
   */
  function domainsForSiteRules(siteRules) {
    if (!siteRules || typeof siteRules !== "object") return [];
    if (siteRules.mode === "allow_all") return [];

    const d = new Set();
    const add = (arr) => {
      for (let i = 0; i < arr.length; i++) d.add(arr[i]);
    };

    if (siteRules.mode === "block_all" || siteRules.trackers?.third_party || siteRules.cookies === "block_all") {
      add(allCatalogSuffixes());
      return [...d];
    }

    const ck = siteRules.cookies;
    if (ck === "block_analytics") {
      add(collectSuffixes((c) => c === "analytics" || c === "tag manager"));
    }
    if (ck === "block_advertising") {
      add(collectSuffixes((c) => c.includes("ad network") || c.includes("retargeting")));
    }

    const tk = siteRules.trackers || {};
    if (tk.social) {
      add(collectSuffixes((c) => c.includes("social")));
    }
    if (tk.analytics) {
      add(collectSuffixes((c) => c === "analytics" || c === "tag manager" || c.includes("session")));
    }
    if (tk.fingerprinting) {
      add(collectSuffixes((c) => c.includes("fingerprint")));
    }
    if (tk.third_party) {
      add(allCatalogSuffixes());
      return [...d];
    }

    return [...d];
  }

  async function readStoredRuleIds(tabId) {
    try {
      const data = await chrome.storage.session.get(sessionKey(tabId));
      const v = data[sessionKey(tabId)];
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  }

  async function writeStoredRuleIds(tabId, ids) {
    await chrome.storage.session.set({ [sessionKey(tabId)]: ids });
  }

  self.pcClearDNRForTab = async function pcClearDNRForTab(tabId) {
    if (tabId == null || tabId < 0) return;
    if (!chrome.declarativeNetRequest?.updateSessionRules) return;
    const prev = await readStoredRuleIds(tabId);
    if (prev.length) {
      try {
        await chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: prev });
      } catch (e) {
        console.warn("[Private-C] DNR remove failed", e);
      }
    }
    await writeStoredRuleIds(tabId, []);
  };

  self.pcApplyDNRForTab = async function pcApplyDNRForTab(tabId, pageHost, state) {
    if (!chrome.declarativeNetRequest?.updateSessionRules || !chrome.declarativeNetRequest?.getSessionRules) {
      return;
    }
    if (tabId == null || tabId < 0 || !pageHost) return;

    const host = pageHost.toLowerCase();
    await self.pcClearDNRForTab(tabId);

    const allowAll = !!state.allowAllTrackingByHost?.[host];
    if (allowAll) return;

    const siteRules = state.sitePrivacyRules?.[host];
    let domains = domainsForSiteRules(siteRules);

    const decided = !!state.firstVisitDecided?.[host];
    if (!domains.length && decided && !allowAll && (!siteRules || Object.keys(siteRules).length === 0)) {
      domains = allCatalogSuffixes();
    }

    const blockIpLiterals =
      domains.length > 0 || siteRules?.trackers?.block_ip_endpoints === true;

    if (!domains.length && !blockIpLiterals) return;

    const existing = await chrome.declarativeNetRequest.getSessionRules();
    let nextId =
      existing.reduce((m, r) => {
        const id = typeof r.id === "number" ? r.id : 0;
        return id > m ? id : m;
      }, 0) + 1;

    const initiatorDomains = [host];
    if (host.startsWith("www.")) {
      initiatorDomains.push(host.slice(4));
    } else {
      initiatorDomains.push("www." + host);
    }

    const CHUNK = 28;
    const addRules = [];
    const newIds = [];

    const resourceTypes = [
      "script",
      "xmlhttprequest",
      "image",
      "sub_frame",
      "stylesheet",
      "font",
      "media",
      "websocket",
      "other",
    ];

    for (let i = 0; i < domains.length; i += CHUNK) {
      const chunk = domains.slice(i, i + CHUNK);
      const id = nextId++;
      newIds.push(id);
      addRules.push({
        id,
        priority: 2,
        action: { type: "block" },
        condition: {
          tabIds: [tabId],
          initiatorDomains,
          requestDomains: chunk,
          resourceTypes,
        },
      });
    }

    /**
     * Block third-party http(s) requests whose host is a literal IPv4 or bracketed IPv6 address.
     * Trackers often bypass domain lists by calling numeric endpoints; DNR requestDomains cannot list IPs.
     * Uses RE2 regexFilter (declarativeNetRequest).
     */
    if (blockIpLiterals) {
      const ipv4LiteralFilter = "^https?://([0-9]{1,3}\\.){3}[0-9]{1,3}([/:?#]|$)";
      const ipv6BracketLiteralFilter = "^https?://\\[[0-9a-fA-F:%._+\\-]+\\]([/:?#]|$)";
      for (const regexFilter of [ipv4LiteralFilter, ipv6BracketLiteralFilter]) {
        const id = nextId++;
        newIds.push(id);
        addRules.push({
          id,
          priority: 2,
          action: { type: "block" },
          condition: {
            tabIds: [tabId],
            initiatorDomains,
            regexFilter,
            resourceTypes,
          },
        });
      }
    }

    try {
      await chrome.declarativeNetRequest.updateSessionRules({ addRules });
      await writeStoredRuleIds(tabId, newIds);
      if (state.devLogging) {
        console.info("[Private-C] DNR applied", {
          tabId,
          host,
          ruleCount: addRules.length,
          domainCount: domains.length,
          includesIpLiteralRules: true,
        });
      }
    } catch (e) {
      console.warn("[Private-C] DNR apply failed", e);
    }
  };
})();
