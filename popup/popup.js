/**
 * This file is the extension *toolbar menu* (click the icon). It is NOT the on-page bottom banner
 * that appears on websites and auto-dismisses — that UI lives in content/threat-warning.js.
 */

if (typeof chrome !== "undefined" && chrome.runtime?.getURL) {
  const logo = document.getElementById("popupLogo");
  if (logo) {
    const url = chrome.runtime.getURL("assets/Logo.png");
    logo.src = `${url}?v=2`;
    logo.alt = "Private-C";
  }
  const openSetupLink = document.getElementById("openSetupLink");
  if (openSetupLink) {
    openSetupLink.href = chrome.runtime.getURL("dashboard/dist/index.html#/auth/login");
  }
}

const ui = {
  accountBadge: document.getElementById("accountBadge"),
  loginPrompt: document.getElementById("loginPrompt"),
  statsBar: document.getElementById("statsBar"),
  cookiesStopped: document.getElementById("cookiesStopped"),
  privacyConcerns: document.getElementById("privacyConcerns"),
  blockedSites: document.getElementById("blockedSites"),
  preferencesSummary: document.getElementById("preferencesSummary"),
  preferenceList: document.getElementById("preferenceList"),
  thisPageSection: document.getElementById("thisPageSection"),
  popupSiteHostname: document.getElementById("popupSiteHostname"),
  popupPageUrlFull: document.getElementById("popupPageUrlFull"),
  popupSiteMeta: document.getElementById("popupSiteMeta"),
  popupSessionTrackers: document.getElementById("popupSessionTrackers"),
  pageScanAgent: document.getElementById("pageScanAgent"),
  focusThisTab: document.getElementById("focusThisTab"),
  openPageNewTab: document.getElementById("openPageNewTab"),
  sitePrefsInline: document.getElementById("sitePrefsInline"),
  siteRulesSummary: document.getElementById("siteRulesSummary"),
  prefBlock: document.getElementById("prefBlock"),
  prefAllow: document.getElementById("prefAllow"),
  openGranularChoices: document.getElementById("openGranularChoices"),
  saveSitePrefs: document.getElementById("saveSitePrefs"),
  sitePrefsStatus: document.getElementById("sitePrefsStatus"),
  tabTrackersWrap: document.getElementById("tabTrackersWrap"),
  tabTrackersList: document.getElementById("tabTrackersList"),
  tabTrackersEmpty: document.getElementById("tabTrackersEmpty"),
  onPageBannerHint: document.getElementById("onPageBannerHint"),
  showToolbarSitePrefs: document.getElementById("showToolbarSitePrefs"),
};

/** When user chooses “set here instead” before completing the on-page banner flow */
let preferToolbarSitePrefsForHost = "";

/** Must match background/background.js */
const PC_STORAGE_LOG_KEY = "privateCTrackerLog";
const PC_STORAGE_STATE_KEY = "privateCState";
const PC_TAB_SCAN_PREFIX = "tabScan_";

const CATEGORY_LABELS = {
  cookies: "Cookie tracking",
  location: "Location leakage",
  financial: "Financial data",
  health: "Health signals",
  identity: "Identity markers",
  social: "Social profiling",
};

let popupTabId = null;
let popupHost = "";
let allowAllChoice = false;

function syncPrefToggles() {
  ui.prefBlock?.classList.toggle("toggle-active", !allowAllChoice);
  ui.prefAllow?.classList.toggle("toggle-active", allowAllChoice);
}

function formatScanSummary(scan) {
  if (!scan?.signals) {
    return "Running page check… If this stays empty, refresh the tab and open the popup again.";
  }
  const s = scan.signals;
  const parts = [];
  if (s.thirdPartyScripts > 0) {
    parts.push(
      `${s.thirdPartyScripts} third-party script load${s.thirdPartyScripts === 1 ? "" : "s"} (${s.thirdPartyScriptHostCount || 0} host${(s.thirdPartyScriptHostCount || 0) === 1 ? "" : "s"})`
    );
  }
  if (s.crossOriginFrames > 0) {
    parts.push(`${s.crossOriginFrames} embedded frame${s.crossOriginFrames === 1 ? "" : "s"} from other sites`);
  }
  if (s.crossOriginImages > 0) {
    parts.push(`${s.crossOriginImages} cross-origin image${s.crossOriginImages === 1 ? "" : "s"}`);
  }
  if (s.firstPartyCookieChunks > 0) {
    parts.push(`${s.firstPartyCookieChunks} readable first-party cookie name${s.firstPartyCookieChunks === 1 ? "" : "s"}`);
  }
  let text = parts.length
    ? `Page check: ${parts.join(" · ")}.`
    : "Page check: no third-party scripts or cross-origin embeds detected in the DOM snapshot.";
  const hints = (s.trackerHints || []).slice(0, 5);
  if (hints.length) {
    text += ` Third-party script hosts (sample): ${hints.join(", ")}.`;
  }
  return text;
}

function formatSessionTrackersLine(list) {
  const rows = Array.isArray(list) ? list : [];
  if (rows.length === 0) {
    return "Live network: no catalog-matched third-party tracker hosts for this tab yet.";
  }
  let hits = 0;
  rows.forEach((t) => {
    hits += Math.max(1, Number(t.hit_count) || 1);
  });
  return `Live network: ${rows.length} tracker host${rows.length === 1 ? "" : "s"} · ${hits} contact${hits === 1 ? "" : "s"} logged for this tab.`;
}

function renderTabTrackers(list, eligible) {
  if (!ui.tabTrackersList || !ui.tabTrackersWrap || !ui.tabTrackersEmpty) return;
  ui.tabTrackersList.innerHTML = "";
  if (!eligible) {
    ui.tabTrackersWrap.classList.add("hidden");
    ui.tabTrackersEmpty.classList.add("hidden");
    return;
  }
  const rows = Array.isArray(list) ? list : [];
  ui.tabTrackersWrap.classList.remove("hidden");
  if (rows.length === 0) {
    ui.tabTrackersEmpty.classList.remove("hidden");
    return;
  }
  ui.tabTrackersEmpty.classList.add("hidden");
  rows.slice(0, 20).forEach((t) => {
    const li = document.createElement("li");
    const hits = t.hit_count > 1 ? ` · ${t.hit_count}×` : "";
    const label = t.label || t.tracker_domain;
    li.textContent = `${label} (${t.category || "tracker"})${hits}`;
    if (t.last_sample_url) {
      li.title = t.last_sample_url;
    }
    ui.tabTrackersList.appendChild(li);
  });
}

function effectiveTabUrl(tab) {
  if (!tab) return "";
  const u = tab.url || tab.pendingUrl;
  return typeof u === "string" ? u : "";
}

function setSiteHero(tab) {
  if (!ui.popupSiteHostname) return;

  const pageUrl = effectiveTabUrl(tab);
  if (!tab || !pageUrl) {
    ui.popupSiteHostname.textContent = "—";
    if (ui.popupPageUrlFull) {
      ui.popupPageUrlFull.textContent = "";
      ui.popupPageUrlFull.removeAttribute("title");
    }
    if (ui.popupSiteMeta) ui.popupSiteMeta.textContent = "No active browser tab.";
    if (ui.popupSessionTrackers) ui.popupSessionTrackers.textContent = "";
    return;
  }

  let displayHost = tab.host || "";
  if (!displayHost) {
    try {
      displayHost = new URL(pageUrl).hostname;
    } catch {
      displayHost = "";
    }
  }
  ui.popupSiteHostname.textContent = displayHost || "Page";

  if (ui.popupPageUrlFull) {
    ui.popupPageUrlFull.textContent = pageUrl;
    ui.popupPageUrlFull.title = pageUrl;
  }

  if (ui.popupSiteMeta) {
    if (tab.eligible && (tab.host || displayHost)) {
      ui.popupSiteMeta.textContent =
        "HTTPS site — per-site controls and live tracker list apply.";
    } else {
      ui.popupSiteMeta.textContent =
        "Built-in or restricted page — open a normal https website for full site tools and live tracker logging.";
    }
  }
}

function renderThisPage(ctx) {
  popupTabId = null;
  popupHost = "";

  const tab = ctx?.tab ?? null;
  setSiteHero(tab);

  if (!ui.thisPageSection || !ui.pageScanAgent) return;
  ui.thisPageSection.classList.remove("hidden");
  ui.onPageBannerHint?.classList.add("hidden");
  if (ui.sitePrefsStatus) ui.sitePrefsStatus.textContent = "";
  if (ui.siteRulesSummary) ui.siteRulesSummary.textContent = "";
  ui.focusThisTab.hidden = true;
  ui.openPageNewTab.hidden = true;
  ui.sitePrefsInline?.classList.add("hidden");
  ui.tabTrackersWrap?.classList.add("hidden");
  ui.tabTrackersEmpty?.classList.add("hidden");

  ui.pageScanAgent.textContent = "Reading this tab…";

  const pageUrl = effectiveTabUrl(tab);
  if (!tab || !pageUrl) {
    ui.pageScanAgent.textContent = "No active tab.";
    renderTabTrackers([], false);
    return;
  }

  const tabHost =
    tab.host ||
    (() => {
      try {
        return new URL(pageUrl).hostname.toLowerCase();
      } catch {
        return "";
      }
    })();

  if (!tab.eligible || !tabHost) {
    ui.pageScanAgent.textContent =
      "Page snapshot runs on standard https sites. This URL does not get the on-page scanner or per-site blocking UI.";
    if (ui.popupSessionTrackers) {
      ui.popupSessionTrackers.textContent =
        "Live tracker list: switch to an https tab (not chrome://, localhost, or file).";
    }
    renderTabTrackers([], false);
    return;
  }

  popupTabId = tab.id;
  popupHost = tabHost;
  ui.focusThisTab.hidden = false;
  ui.openPageNewTab.hidden = false;
  ui.openPageNewTab.href = pageUrl;

  ui.pageScanAgent.textContent = ctx.scan ? formatScanSummary(ctx.scan) : formatScanSummary(null);

  if (ui.popupSessionTrackers) {
    ui.popupSessionTrackers.textContent = formatSessionTrackersLine(ctx.trackersForTab);
  }

  renderTabTrackers(ctx.trackersForTab, true);

  const sp = ctx.sitePrefs;
  if (sp) {
    const decided = !!sp.decided;
    const useToolbarFallback = preferToolbarSitePrefsForHost === tabHost;
    if (!decided && !useToolbarFallback) {
      ui.onPageBannerHint?.classList.remove("hidden");
    } else {
      ui.onPageBannerHint?.classList.add("hidden");
    }
    ui.sitePrefsInline?.classList.remove("hidden");
    allowAllChoice = !!sp.allowAll;
    syncPrefToggles();
    if (ui.siteRulesSummary) {
      if (!decided) {
        ui.siteRulesSummary.textContent =
          "Not saved yet — pick Block all, Allow all, or Select choices, then Save.";
      } else {
        ui.siteRulesSummary.textContent = `Saved rule: ${sp.rulesSummary || "—"}`;
      }
    }
    if (decided && preferToolbarSitePrefsForHost === tabHost) {
      preferToolbarSitePrefsForHost = "";
    }
  } else {
    ui.onPageBannerHint?.classList.add("hidden");
    ui.sitePrefsInline?.classList.remove("hidden");
    allowAllChoice = false;
    syncPrefToggles();
    if (ui.siteRulesSummary) {
      ui.siteRulesSummary.textContent =
        "Pick Block all, Allow all, or Select choices, then Save for this site.";
    }
  }
}

function applyStats(state, live) {
  if (!ui.cookiesStopped || !ui.privacyConcerns || !ui.blockedSites) return;
  ui.cookiesStopped.textContent = String(live?.tabRealtimeContacts ?? 0);
  ui.privacyConcerns.textContent = String(live?.requestsToday ?? 0);
  ui.blockedSites.textContent = String(live?.blockedHostsCount ?? state?.stats?.blockedSites ?? 0);
}

function renderGuestChrome() {
  if (ui.accountBadge) ui.accountBadge.textContent = "Guest";
  ui.loginPrompt?.classList.remove("hidden");
  ui.preferencesSummary?.classList.add("hidden");
}

function renderSignedInChrome(state) {
  if (ui.accountBadge) ui.accountBadge.textContent = state.account?.email || "Signed in";
  ui.loginPrompt?.classList.add("hidden");
  ui.preferencesSummary?.classList.remove("hidden");

  if (!ui.preferenceList) return;
  ui.preferenceList.innerHTML = "";
  const active = Object.entries(state.preferences || {}).filter(([, enabled]) => enabled);

  if (active.length === 0) {
    const li = document.createElement("li");
    li.textContent = "No categories selected";
    ui.preferenceList.appendChild(li);
    return;
  }

  active.forEach(([key]) => {
    const li = document.createElement("li");
    li.textContent = CATEGORY_LABELS[key] || key;
    ui.preferenceList.appendChild(li);
  });
}

let popupDebounceTimer = null;
let lastScanPingTabId = null;

function pingActiveTabForScan(tabId, eligible) {
  if (tabId == null || !eligible) return;
  chrome.tabs.sendMessage(tabId, { type: "PRIVATE_C_REFRESH_PAGE_SCAN_FROM_POPUP" }, () => {
    void chrome.runtime?.lastError;
  });
}

function loadPopup() {
  if (typeof chrome === "undefined" || !chrome.runtime?.sendMessage) {
    if (ui.pageScanAgent) {
      ui.pageScanAgent.textContent = "Open this panel from the Private-C extension toolbar.";
    }
    return;
  }

  chrome.runtime.sendMessage({ type: "PRIVATE_C_GET_POPUP_CONTEXT" }, (response) => {
    const lastErr = chrome.runtime.lastError;
    if (lastErr || !response?.ok) {
      setSiteHero(null);
      renderThisPage({ tab: null, scan: null, sitePrefs: null });
      if (ui.pageScanAgent) {
        ui.pageScanAgent.textContent = lastErr
          ? `Can't reach the extension background (${lastErr.message}). Reload Private-C on chrome://extensions.`
          : `Extension error: ${response?.error || "unknown"}. Try reloading Private-C.`;
      }
      applyStats({}, null);
      renderGuestChrome();
      return;
    }

    renderThisPage(response);
    applyStats(response.state, response.livePopupStats);
    ui.statsBar?.classList.remove("hidden");

    if (response.state?.isLoggedIn) {
      renderSignedInChrome(response.state);
    } else {
      renderGuestChrome();
    }

    const tid = response.tab?.id;
    if (tid != null && response.tab?.eligible && lastScanPingTabId !== tid) {
      lastScanPingTabId = tid;
      pingActiveTabForScan(tid, true);
      setTimeout(() => loadPopup(), 450);
    }
  });
}

function schedulePopupReload() {
  if (popupDebounceTimer != null) {
    clearTimeout(popupDebounceTimer);
  }
  popupDebounceTimer = setTimeout(() => {
    popupDebounceTimer = null;
    loadPopup();
  }, 100);
}

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local") {
    if (changes[PC_STORAGE_LOG_KEY] || changes[PC_STORAGE_STATE_KEY]) {
      schedulePopupReload();
    }
    return;
  }
  if (areaName === "session") {
    const keys = Object.keys(changes);
    if (keys.some((k) => k.startsWith(PC_TAB_SCAN_PREFIX) || k.startsWith("pc_dnr_"))) {
      schedulePopupReload();
    }
  }
});

const POPUP_POLL_MS = 1100;
setInterval(() => loadPopup(), POPUP_POLL_MS);

ui.prefBlock?.addEventListener("click", () => {
  allowAllChoice = false;
  syncPrefToggles();
});

ui.prefAllow?.addEventListener("click", () => {
  allowAllChoice = true;
  syncPrefToggles();
});

ui.showToolbarSitePrefs?.addEventListener("click", () => {
  if (!popupHost) return;
  preferToolbarSitePrefsForHost = popupHost;
  ui.onPageBannerHint?.classList.add("hidden");
  ui.sitePrefsInline?.classList.remove("hidden");
  chrome.runtime.sendMessage({ type: "PRIVATE_C_GET_POPUP_CONTEXT" }, (response) => {
    if (chrome.runtime.lastError || !response?.ok || !response.sitePrefs) return;
    allowAllChoice = !!response.sitePrefs.allowAll;
    syncPrefToggles();
    if (ui.siteRulesSummary && response.sitePrefs.rulesSummary) {
      ui.siteRulesSummary.textContent = `Saved rule: ${response.sitePrefs.rulesSummary}`;
    }
  });
});

ui.openGranularChoices?.addEventListener("click", () => {
  if (popupTabId == null) return;
  if (ui.sitePrefsStatus) ui.sitePrefsStatus.textContent = "";
  chrome.tabs.sendMessage(popupTabId, { type: "PRIVATE_C_OPEN_SITE_OPTIONS" }, (r) => {
    if (chrome.runtime.lastError || r?.ok === false) {
      if (ui.sitePrefsStatus) {
        ui.sitePrefsStatus.textContent = "Focus the page tab and refresh, then try again.";
      }
      return;
    }
    if (ui.sitePrefsStatus) ui.sitePrefsStatus.textContent = "Choices opened on the page.";
    window.close();
  });
});

ui.saveSitePrefs?.addEventListener("click", () => {
  if (!popupHost) return;
  if (ui.sitePrefsStatus) ui.sitePrefsStatus.textContent = "";
  chrome.runtime.sendMessage(
    {
      type: "PRIVATE_C_SITE_PRIVACY_CHOICE",
      payload: { host: popupHost, allowAll: allowAllChoice, tabId: popupTabId },
    },
    (r) => {
      if (chrome.runtime.lastError) {
        if (ui.sitePrefsStatus) ui.sitePrefsStatus.textContent = "Could not save. Try again.";
        return;
      }
      if (r?.ok) {
        if (ui.sitePrefsStatus) ui.sitePrefsStatus.textContent = "Saved for this site.";
        loadPopup();
      } else if (ui.sitePrefsStatus) {
        ui.sitePrefsStatus.textContent = "Save failed.";
      }
    }
  );
});

ui.focusThisTab?.addEventListener("click", () => {
  if (popupTabId == null) return;
  chrome.tabs.update(popupTabId, { active: true }, () => {
    void chrome.runtime?.lastError;
    window.close();
  });
});

ui.openPageNewTab?.addEventListener("click", (e) => {
  const url = ui.openPageNewTab.getAttribute("href");
  if (!url || url === "#") {
    e.preventDefault();
    return;
  }
  e.preventDefault();
  chrome.tabs.create({ url });
});

document.getElementById("openDashboard")?.addEventListener("click", () => {
  const url = chrome.runtime.getURL("dashboard/dist/index.html");
  chrome.tabs.create({ url });
});

loadPopup();
