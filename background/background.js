const DEFAULT_API_BASE = "http://127.0.0.1:3847";

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
  },
  blockedSitesByHost: {},
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

async function getApiBase() {
  const data = await chrome.storage.local.get("privateCApiBase");
  const url = data.privateCApiBase;
  if (typeof url === "string" && url.trim()) {
    return url.replace(/\/$/, "");
  }
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
      const base = await getApiBase();
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

async function setState(nextState) {
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
    const host = currentUrl.hostname;
    const state = await getState();

    const baseCookieTick = state.preferences.cookies ? Math.floor(Math.random() * 4) + 1 : 0;
    const privacyTick = Object.values(state.preferences).filter(Boolean).length > 0 ? 1 : 0;

    const nextState = {
      ...state,
      stats: {
        ...state.stats,
        cookiesStopped: state.stats.cookiesStopped + baseCookieTick,
        privacyConcerns: state.stats.privacyConcerns + privacyTick,
      },
    };

    const threat = THREAT_HOSTS[host];
    if (threat && !state.blockedSitesByHost[host]) {
      nextState.stats.blockedSites = state.stats.blockedSites + 1;
      nextState.blockedSitesByHost = {
        ...state.blockedSitesByHost,
        [host]: true,
      };

      const assistantLine = threat.assistantLine || threat.reason;

      try {
        await chrome.tabs.sendMessage(tab.id, {
          type: "PRIVATE_C_THREAT_FOUND",
          payload: {
            host,
            severity: threat.severity,
            reason: threat.reason,
            assistantLine,
          },
        });
      } catch {
        /* tab may not have content script (restricted pages) */
      }

      maybeSpeakThreat(state, assistantLine);
    }

    await setState(nextState);
  } catch (error) {
    console.warn("Private-C URL parsing failed", error);
  }
});
