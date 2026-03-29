importScripts("trackerCatalog.js");

/** Bundled API base (not user-configurable). Set at build/deploy if needed. */
const DEFAULT_API_BASE = "http://127.0.0.1:3847";

const TRACKER_LOG_KEY = "privateCTrackerLog";
const TRACKER_HIT_TOTAL_KEY = "privateCTrackerHitTotal";
const TRACKER_LOG_MAX = 350;
const pendingTrackerHits = new Map();
let trackerFlushTimer = null;

function defaultAuth() {
  return {
    stage: "guest",
    emailVerified: false,
    verificationSentAt: null,
    onboardingComplete: false,
  };
}

function defaultProtectionPrefs() {
  return {
    siteSecurityAlerts: true,
    trackers: true,
    privacyViolations: true,
    screenScrollMonitoring: false,
    timeSpentAntiDetailing: false,
    cookiesBackground: true,
    backgroundMicrophone: true,
    backgroundCamera: true,
    hiddenBackgroundTasks: true,
  };
}

function defaultNotificationPrefs() {
  return {
    trackerPopupAlerts: true,
    cookieCutterAlerts: true,
    siteRiskAlerts: true,
    cameraMicrophoneAlerts: true,
    backgroundTaskAlerts: true,
    privacyPolicySummaryAlerts: false,
  };
}

function defaultAudio() {
  return {
    level: "medium",
    elevenLabsApiKey: "",
    elevenLabsVoiceId: "21m00Tcm4TlvDq8ikWAM",
  };
}

const DEFAULT_STATE = {
  isLoggedIn: false,
  account: {
    email: "",
    createdAt: null,
  },
  preferences: {
    cookies: true,
    location: true,
    financial: true,
    health: true,
    identity: true,
    social: true,
  },
  auth: defaultAuth(),
  protectionPrefs: defaultProtectionPrefs(),
  notificationPrefs: defaultNotificationPrefs(),
  audio: defaultAudio(),
  stats: {
    cookiesStopped: 0,
    privacyConcerns: 0,
    blockedSites: 0,
    /** Legacy / manual; live network tally is privateCTrackerHitTotal */
    trackersDetected: 0,
  },
  blockedSitesByHost: {},
  /** Hostname → user chose "allow all cookies/trackers" for this site. */
  allowAllTrackingByHost: {},
  /** Hostname → user completed the first-visit privacy prompt (any choice). */
  firstVisitDecided: {},
};

const THREAT_HOSTS = {
  "malware-test.example": {
    severity: "high",
    reason: "Known malware distribution patterns detected",
    assistantLine:
      "High-risk site flagged. I recommend closing this session and avoiding downloads.",
  },
  "track-heavy.example": {
    severity: "medium",
    reason: "Aggressive cross-site tracking scripts identified",
    assistantLine:
      "Tracker activity detected. Cookie Cutter recommends blocking background session tracking.",
  },
  "phishy-login.example": {
    severity: "high",
    reason: "Phishing-like login behavior patterns detected",
    assistantLine:
      "Credential trap suspected. Do not enter passwords or MFA on this page.",
  },
};

function shouldOfferFirstVisitChoice(url, host) {
  if (!url || !host) return false;
  if (!/^https?:\/\//i.test(url)) return false;
  const h = host.toLowerCase();
  if (h === "localhost" || h === "127.0.0.1" || h.endsWith(".localhost")) return false;
  return true;
}

/** Show floating Private-C chip on normal web pages (not localhost). */
function isPageBadgeEligible(url) {
  try {
    const u = new URL(url);
    if (!/^https?:$/i.test(u.protocol)) return false;
    const h = u.hostname.toLowerCase();
    if (h === "localhost" || h === "127.0.0.1" || h.endsWith(".localhost")) return false;
    return true;
  } catch {
    return false;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function tabScanSessionKey(tabId) {
  return `tabScan_${tabId}`;
}

chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.session.remove(tabScanSessionKey(tabId)).catch(() => {});
});

function truncateUrl(url, max) {
  if (!url || url.length <= max) return url || "";
  return url.slice(0, max) + "…";
}

function trackerLogKey(sourceSite, trackerDomain) {
  return `${sourceSite}\n${trackerDomain}`;
}

function enrichTrackerStorageEntry(base) {
  const label = base.label || base.tracker_domain;
  const site = base.source_site;
  const action = base.action || "observed";
  return {
    ...base,
    plain_reason: `${label} was contacted while you browsed ${site}. This host is classified as ${base.category} tracking or analytics.`,
    technical_reason: `Network ${base.last_resource_type || "request"} to ${base.tracker_domain}. Last URL sample: ${base.last_sample_url || "—"}`,
    recommendation:
      action === "allowed (site)"
        ? "This site is set to “Allow all,” so Private-C still records the request for transparency."
        : "Shown from live browser network activity. Use Block (cookies & trackers) for this site in the toolbar popup to record a stricter preference.",
  };
}

function mergeTrackerBatchIntoLog(log, batch) {
  let totalNewHits = 0;
  const next = [...log];
  for (const b of batch) {
    totalNewHits += b.hit_count;
    const idx = next.findIndex((e) => e.source_site === b.source_site && e.tracker_domain === b.tracker_domain);
    if (idx >= 0) {
      const existing = next[idx];
      next[idx] = enrichTrackerStorageEntry({
        ...existing,
        hit_count: (existing.hit_count || 1) + b.hit_count,
        timestamp: new Date(b.last_ts).toISOString(),
        last_resource_type: b.last_resource_type,
        last_sample_url: b.last_sample_url,
        action: b.action,
        label: b.label || existing.label,
        category: b.category || existing.category,
      });
    } else {
      next.unshift(
        enrichTrackerStorageEntry({
          id: crypto.randomUUID(),
          tracker_domain: b.tracker_domain,
          source_site: b.source_site,
          category: b.category,
          label: b.label,
          action: b.action,
          timestamp: new Date(b.last_ts).toISOString(),
          hit_count: b.hit_count,
          last_resource_type: b.last_resource_type,
          last_sample_url: b.last_sample_url,
        })
      );
    }
  }
  next.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return { log: next.length > TRACKER_LOG_MAX ? next.slice(0, TRACKER_LOG_MAX) : next, totalNewHits };
}

function queueTrackerNetworkHit({ pageHost, trackerHost, rule, resourceType, url, allowedBySite }) {
  const key = trackerLogKey(pageHost, trackerHost);
  const prev = pendingTrackerHits.get(key);
  const action = allowedBySite ? "allowed (site)" : "observed";
  if (prev) {
    prev.hit_count += 1;
    prev.last_resource_type = resourceType;
    prev.last_sample_url = truncateUrl(url, 220);
    prev.last_ts = Date.now();
    prev.action = action;
  } else {
    pendingTrackerHits.set(key, {
      source_site: pageHost,
      tracker_domain: trackerHost,
      category: rule.category,
      label: rule.label,
      hit_count: 1,
      last_resource_type: resourceType,
      last_sample_url: truncateUrl(url, 220),
      last_ts: Date.now(),
      action,
    });
  }
  scheduleTrackerFlush();
}

function scheduleTrackerFlush() {
  if (trackerFlushTimer) {
    clearTimeout(trackerFlushTimer);
  }
  trackerFlushTimer = setTimeout(() => {
    trackerFlushTimer = null;
    flushTrackerHitsToStorage().catch((e) => console.warn("Private-C tracker log flush", e));
  }, 500);
}

async function flushTrackerHitsToStorage() {
  if (pendingTrackerHits.size === 0) return;
  const batch = [...pendingTrackerHits.values()];
  pendingTrackerHits.clear();

  const data = await chrome.storage.local.get([TRACKER_LOG_KEY, TRACKER_HIT_TOTAL_KEY]);
  const prevLog = Array.isArray(data[TRACKER_LOG_KEY]) ? data[TRACKER_LOG_KEY] : [];
  const { log, totalNewHits } = mergeTrackerBatchIntoLog(prevLog, batch);
  const prevTotal = typeof data[TRACKER_HIT_TOTAL_KEY] === "number" ? data[TRACKER_HIT_TOTAL_KEY] : 0;

  await chrome.storage.local.set({
    [TRACKER_LOG_KEY]: log,
    [TRACKER_HIT_TOTAL_KEY]: prevTotal + totalNewHits,
  });
}

function isThirdPartyRequest(pageUrl, requestUrl) {
  try {
    const pu = new URL(pageUrl);
    const ru = new URL(requestUrl);
    if (!/^https?:$/i.test(pu.protocol) || !/^https?:$/i.test(ru.protocol)) return false;
    const ph = pu.hostname.toLowerCase();
    const rh = ru.hostname.toLowerCase();
    return rh !== ph;
  } catch {
    return false;
  }
}

chrome.webRequest.onCompleted.addListener(
  (details) => {
    if (details.tabId == null || details.tabId < 0) return;
    if (details.type === "main_frame") return;
    let reqHost;
    try {
      reqHost = new URL(details.url).hostname.toLowerCase();
    } catch {
      return;
    }
    const rule = self.pcClassifyTrackerHost(reqHost);
    if (!rule) return;

    chrome.tabs.get(details.tabId, (tab) => {
      if (chrome.runtime.lastError || !tab?.url) return;
      if (!isThirdPartyRequest(tab.url, details.url)) return;

      getStateForTrackerListener()
        .then((state) => {
          if (state.protectionPrefs?.trackers === false) return;
          let pageHost;
          try {
            pageHost = new URL(tab.url).hostname.toLowerCase();
          } catch {
            return;
          }
          const allowAll = !!state.allowAllTrackingByHost?.[pageHost];
          queueTrackerNetworkHit({
            pageHost,
            trackerHost: reqHost,
            rule,
            resourceType: details.type,
            url: details.url,
            allowedBySite: allowAll,
          });
        })
        .catch(() => {});
    });
  },
  { urls: ["<all_urls>"] }
);

/**
 * Content scripts often are not ready when tabs.onUpdated fires "complete".
 * Retry sendMessage, then programmatically inject the script once and retry.
 */
async function postToContentScript(tabId, message) {
  if (tabId == null || tabId < 0) {
    return false;
  }
  const delays = [0, 40, 100, 200, 400, 700, 1100];
  for (const ms of delays) {
    if (ms) await sleep(ms);
    try {
      await chrome.tabs.sendMessage(tabId, message);
      return true;
    } catch {
      /* receiving end not ready */
    }
  }
  try {
    await chrome.scripting.executeScript({
      target: { tabId, allFrames: false },
      files: ["content/threat-warning.js"],
    });
    await sleep(100);
    await chrome.tabs.sendMessage(tabId, message);
    return true;
  } catch (e) {
    console.debug("Private-C postToContentScript failed:", e?.message || e);
    return false;
  }
}

function mergeDeep(target, source) {
  const out = { ...target };
  if (!source || typeof source !== "object") {
    return out;
  }
  for (const k of Object.keys(source)) {
    const sv = source[k];
    const tv = target[k];
    if (sv && typeof sv === "object" && !Array.isArray(sv) && tv && typeof tv === "object" && !Array.isArray(tv)) {
      out[k] = mergeDeep(tv, sv);
    } else {
      out[k] = sv;
    }
  }
  return out;
}

function normalizeState(raw) {
  if (!raw || typeof raw !== "object") {
    return structuredClone(DEFAULT_STATE);
  }
  const s = { ...DEFAULT_STATE, ...raw };
  s.account = { ...DEFAULT_STATE.account, ...raw.account };
  s.preferences = { ...DEFAULT_STATE.preferences, ...raw.preferences };
  s.stats = { ...DEFAULT_STATE.stats, ...raw.stats };
  s.auth = { ...defaultAuth(), ...(raw.auth || {}) };
  s.protectionPrefs = { ...defaultProtectionPrefs(), ...(raw.protectionPrefs || {}) };
  s.notificationPrefs = { ...defaultNotificationPrefs(), ...(raw.notificationPrefs || {}) };
  s.audio = { ...defaultAudio(), ...(raw.audio || {}) };
  s.blockedSitesByHost = { ...(raw.blockedSitesByHost || {}) };
  s.allowAllTrackingByHost = { ...DEFAULT_STATE.allowAllTrackingByHost, ...(raw.allowAllTrackingByHost || {}) };
  s.firstVisitDecided = { ...DEFAULT_STATE.firstVisitDecided, ...(raw.firstVisitDecided || {}) };

  if (raw.isLoggedIn && raw.auth === undefined) {
    s.auth = {
      ...s.auth,
      stage: "ready",
      emailVerified: true,
      onboardingComplete: true,
    };
  }
  return s;
}

function getApiBase() {
  return DEFAULT_API_BASE;
}

async function getOrCreateClientId() {
  const data = await chrome.storage.local.get("privateCClientId");
  if (data.privateCClientId) {
    return data.privateCClientId;
  }
  const clientId = crypto.randomUUID();
  await chrome.storage.local.set({ privateCClientId: clientId });
  return clientId;
}

let syncTimer = null;
function scheduleServerSync() {
  clearTimeout(syncTimer);
  syncTimer = setTimeout(async () => {
    try {
      const state = await getState();
      const clientId = await getOrCreateClientId();
      const base = getApiBase();
      await fetch(`${base}/api/state`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, state }),
      });
    } catch (e) {
      console.debug("Private-C server sync skipped (is the API running?)", e?.message || e);
    }
  }, 1000);
}

async function getState() {
  const data = await chrome.storage.local.get("privateCState");
  return normalizeState(data.privateCState);
}

/** Short-lived cache so webRequest onCompleted does not await storage on every hit. */
let trackerListenerStateCache = null;
let trackerListenerStateCacheUntil = 0;

async function getStateForTrackerListener() {
  const now = Date.now();
  if (trackerListenerStateCache && now < trackerListenerStateCacheUntil) {
    return trackerListenerStateCache;
  }
  const s = await getState();
  trackerListenerStateCache = s;
  trackerListenerStateCacheUntil = now + 400;
  return s;
}

async function setState(nextState) {
  trackerListenerStateCache = null;
  trackerListenerStateCacheUntil = 0;
  await chrome.storage.local.set({ privateCState: nextState });
  scheduleServerSync();
}

function ttsRateForLevel(level) {
  if (level === "low") {
    return 0.85;
  }
  if (level === "high") {
    return 1.12;
  }
  if (level === "full") {
    return 1.0;
  }
  return 1.0;
}

function maybeSpeakThreat(state, line) {
  const level = state.audio?.level;
  if (!level || level === "off") {
    return;
  }
  if (!state.notificationPrefs?.siteRiskAlerts) {
    return;
  }
  const text =
    level === "full"
      ? `Private-C alert. ${line} ${state.protectionPrefs?.trackers ? "Tracker shields are active." : ""}`
      : line;
  try {
    if (chrome.tts) {
      chrome.tts.speak(text, {
        rate: ttsRateForLevel(level),
        enqueue: false,
      });
    }
  } catch (e) {
    console.debug("Private-C TTS skipped", e);
  }
}

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === "install") {
    await setState(normalizeState(null));
    chrome.tabs.create({
      url: chrome.runtime.getURL("dashboard/dist/index.html#/auth/login"),
    });
  }
});

chrome.runtime.onStartup.addListener(() => {
  scheduleServerSync();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "PRIVATE_C_SITE_SCAN_RESULT") {
    const tabId = sender.tab?.id;
    const payload = message.payload;
    if (tabId == null || !payload?.host) {
      sendResponse({ ok: false });
      return false;
    }
    chrome.storage.session
      .set({ [tabScanSessionKey(tabId)]: payload })
      .then(() => sendResponse({ ok: true }))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }

  if (message?.type === "PRIVATE_C_GET_POPUP_CONTEXT") {
    (async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const state = await getState();
        if (!tab?.id || !tab.url) {
          sendResponse({ ok: true, tab: null, scan: null, sitePrefs: null, state });
          return;
        }
        let host = "";
        let eligible = false;
        try {
          const u = new URL(tab.url);
          host = u.hostname.toLowerCase();
          eligible = isPageBadgeEligible(tab.url);
        } catch {
          /* ignore */
        }
        let scan = null;
        try {
          const data = await chrome.storage.session.get(tabScanSessionKey(tab.id));
          scan = data[tabScanSessionKey(tab.id)] ?? null;
        } catch {
          /* ignore */
        }
        let trackersForTab = [];
        try {
          const logData = await chrome.storage.local.get(TRACKER_LOG_KEY);
          const fullLog = Array.isArray(logData[TRACKER_LOG_KEY]) ? logData[TRACKER_LOG_KEY] : [];
          trackersForTab = host ? fullLog.filter((e) => e.source_site === host).slice(0, 20) : [];
        } catch {
          /* ignore */
        }
        sendResponse({
          ok: true,
          tab: { id: tab.id, url: tab.url, host, eligible },
          scan,
          trackersForTab,
          sitePrefs:
            eligible && host
              ? {
                  allowAll: !!state.allowAllTrackingByHost?.[host],
                  decided: !!state.firstVisitDecided?.[host],
                }
              : null,
          state,
        });
      } catch (e) {
        sendResponse({ ok: false, error: String(e) });
      }
    })();
    return true;
  }

  if (message?.type === "PRIVATE_C_GET_STATE") {
    getState().then((state) => sendResponse({ ok: true, state }));
    return true;
  }

  if (message?.type === "PRIVATE_C_PATCH_STATE") {
    getState()
      .then(async (state) => {
        const next = mergeDeep(state, message.payload || {});
        await setState(next);
        sendResponse({ ok: true, state: next });
      })
      .catch((error) => sendResponse({ ok: false, error: String(error) }));
    return true;
  }

  if (message?.type === "PRIVATE_C_LOGIN") {
    getState()
      .then(async (state) => {
        let nextState = mergeDeep(state, {
          isLoggedIn: true,
          account: {
            email: message.payload?.email || "",
            createdAt: state.account.createdAt || Date.now(),
          },
          preferences: {
            ...state.preferences,
            ...message.payload?.preferences,
          },
        });
        if (nextState.isLoggedIn && nextState.auth?.stage === "guest") {
          nextState = mergeDeep(nextState, {
            auth: { stage: "ready", emailVerified: true, onboardingComplete: true },
          });
        }
        await setState(nextState);
        sendResponse({ ok: true, state: nextState });
      })
      .catch((error) => sendResponse({ ok: false, error: String(error) }));
    return true;
  }

  if (message?.type === "PRIVATE_C_SET_PREFERENCES") {
    getState()
      .then(async (state) => {
        const nextState = mergeDeep(state, {
          preferences: {
            ...state.preferences,
            ...message.payload,
          },
        });
        await setState(nextState);
        sendResponse({ ok: true, state: nextState });
      })
      .catch((error) => sendResponse({ ok: false, error: String(error) }));
    return true;
  }

  if (message?.type === "PRIVATE_C_DISMISS_THREAT") {
    sendResponse({ ok: true });
    return false;
  }

  if (message?.type === "PRIVATE_C_SITE_PRIVACY_CHOICE") {
    const host = typeof message.payload?.host === "string" ? message.payload.host.trim().toLowerCase() : "";
    const allowAll = !!message.payload?.allowAll;
    if (!host) {
      sendResponse({ ok: false, error: "missing host" });
      return false;
    }
    getState()
      .then(async (state) => {
        const next = mergeDeep(state, {
          firstVisitDecided: { ...state.firstVisitDecided, [host]: true },
          allowAllTrackingByHost: { ...state.allowAllTrackingByHost, [host]: allowAll },
        });
        await setState(next);
        sendResponse({ ok: true });
      })
      .catch((e) => sendResponse({ ok: false, error: String(e) }));
    return true;
  }

  if (message?.type === "PRIVATE_C_SYNC_NOW") {
    scheduleServerSync();
    sendResponse({ ok: true });
    return false;
  }

  return false;
});

chrome.tabs.onUpdated.addListener(async (_tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete" || !tab.url) {
    return;
  }

  try {
    const currentUrl = new URL(tab.url);
    const host = currentUrl.hostname.toLowerCase();
    const state = await getState();

    const nextState = {
      ...state,
      stats: { ...state.stats },
    };

    const allowAll = !!state.allowAllTrackingByHost?.[host];
    const decided = !!state.firstVisitDecided?.[host];

    if (isPageBadgeEligible(tab.url)) {
      await postToContentScript(tab.id, {
        type: "PRIVATE_C_PAGE_BADGE",
        payload: {
          host,
          needPrivacyChoice: shouldOfferFirstVisitChoice(tab.url, host) && !decided,
        },
      });
    }

    const threat = THREAT_HOSTS[host];
    if (threat && !state.blockedSitesByHost[host] && !allowAll) {
      nextState.stats.blockedSites = state.stats.blockedSites + 1;
      nextState.blockedSitesByHost = {
        ...state.blockedSitesByHost,
        [host]: true,
      };

      let assistantLine = threat.assistantLine || threat.reason;
      const heuristicScore = threat.severity === "high" ? "risky" : "caution";
      try {
        const base = getApiBase();
        const res = await fetch(`${base}/api/site-evaluation`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            host,
            url: tab.url,
            pageText: threat.reason,
            heuristicScore,
          }),
        });
        const data = await res.json();
        if (data?.ok && typeof data.explanation === "string" && data.explanation.trim()) {
          assistantLine = data.explanation.trim();
        }
      } catch (e) {
        console.debug("Private-C site-evaluation skipped", e?.message || e);
      }

      await postToContentScript(tab.id, {
        type: "PRIVATE_C_THREAT_FOUND",
        payload: {
          host,
          severity: threat.severity,
          reason: threat.reason,
          assistantLine,
        },
      });

      maybeSpeakThreat(state, assistantLine);
    }

    await setState(nextState);
  } catch (error) {
    console.warn("Private-C URL parsing failed", error);
  }
});
