/**
 * Merges EasyPrivacy-style host rules into the working tracker catalog.
 * Depends on trackerCatalog.js (PC_TRACKER_STATIC_RULES, PC_TRACKER_RULES).
 */
(function () {
  const DYNAMIC_STORAGE_KEY = "privateCTrackerDynamicRules";
  const EASYPRIVACY_URL = "https://easylist.to/easylist/easyprivacy.txt";
  const MAX_DYNAMIC_RULES = 8000;

  function parseEasyPrivacyHosts(text) {
    const out = new Set();
    for (const line of String(text).split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("!") || t.startsWith("[")) continue;
      if (t.startsWith("@@")) continue;
      const m = t.match(/^\|\|([^/^|]+)/);
      if (!m) continue;
      let dom = m[1].toLowerCase();
      if (dom.startsWith("*.")) dom = dom.slice(2);
      if (!dom || dom.includes("*") || dom.includes("#")) continue;
      out.add(dom);
    }
    return [...out];
  }

  function rebuildWorkingRules(dynamicRows) {
    const staticRef = self.PC_TRACKER_STATIC_RULES || self.PC_TRACKER_RULES;
    if (!Array.isArray(staticRef) || staticRef.length === 0) {
      console.warn("Private-C: built-in tracker catalog missing; dynamic rules skipped");
      return;
    }
    const staticSuffixes = new Set(staticRef.map((r) => r.suffix));
    const merged = staticRef.slice();
    for (const row of dynamicRows) {
      if (!row?.suffix || staticSuffixes.has(row.suffix)) continue;
      staticSuffixes.add(row.suffix);
      merged.push({
        suffix: row.suffix,
        category: row.category || "blocklist",
        label: row.label || `EasyPrivacy · ${row.suffix}`,
      });
    }
    merged.sort((a, b) => b.suffix.length - a.suffix.length);
    self.PC_TRACKER_RULES = merged;
  }

  /**
   * Load cached dynamic rules from storage (call after service worker start).
   */
  self.pcLoadDynamicTrackerRules = async function pcLoadDynamicTrackerRules() {
    try {
      const data = await chrome.storage.local.get(DYNAMIC_STORAGE_KEY);
      const rows = Array.isArray(data[DYNAMIC_STORAGE_KEY]) ? data[DYNAMIC_STORAGE_KEY] : [];
      rebuildWorkingRules(rows);
    } catch (e) {
      console.warn("Private-C dynamic tracker load", e?.message || e);
    }
  };

  /**
   * Fetch EasyPrivacy, store, and rebuild catalog (weekly alarm or manual).
   */
  self.pcRefreshTrackerListFromEasyPrivacy = async function pcRefreshTrackerListFromEasyPrivacy() {
    const res = await fetch(EASYPRIVACY_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`EasyPrivacy HTTP ${res.status}`);
    const text = await res.text();
    const hosts = parseEasyPrivacyHosts(text);
    const staticRef = self.PC_TRACKER_STATIC_RULES || self.PC_TRACKER_RULES;
    if (!Array.isArray(staticRef) || staticRef.length === 0) {
      throw new Error("Built-in tracker catalog not loaded");
    }
    const staticSuffixes = new Set(staticRef.map((r) => r.suffix));
    const dynamicRows = [];
    for (const suffix of hosts) {
      if (staticSuffixes.has(suffix)) continue;
      dynamicRows.push({
        suffix,
        category: "blocklist",
        label: `EasyPrivacy · ${suffix}`,
      });
      if (dynamicRows.length >= MAX_DYNAMIC_RULES) break;
    }
    await chrome.storage.local.set({ [DYNAMIC_STORAGE_KEY]: dynamicRows });
    rebuildWorkingRules(dynamicRows);
    return { count: dynamicRows.length };
  };
})();
