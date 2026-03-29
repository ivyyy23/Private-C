if (typeof chrome !== "undefined" && chrome.runtime?.getURL) {
  const logo = document.getElementById("popupLogo");
  if (logo) {
    logo.src = chrome.runtime.getURL("assets/logo.png");
    logo.alt = "Private-C";
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
  pageHost: document.getElementById("pageHost"),
  pageScanAgent: document.getElementById("pageScanAgent"),
  focusThisTab: document.getElementById("focusThisTab"),
  openPageNewTab: document.getElementById("openPageNewTab"),
  sitePrefsInline: document.getElementById("sitePrefsInline"),
  prefBlock: document.getElementById("prefBlock"),
  prefAllow: document.getElementById("prefAllow"),
  saveSitePrefs: document.getElementById("saveSitePrefs"),
  sitePrefsStatus: document.getElementById("sitePrefsStatus"),
  tabTrackersWrap: document.getElementById("tabTrackersWrap"),
  tabTrackersList: document.getElementById("tabTrackersList"),
  tabTrackersEmpty: document.getElementById("tabTrackersEmpty"),
};

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
  ui.prefBlock.classList.toggle("toggle-active", !allowAllChoice);
  ui.prefAllow.classList.toggle("toggle-active", allowAllChoice);
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

function renderTabTrackers(list, eligible) {
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
  rows.slice(0, 14).forEach((t) => {
    const li = document.createElement("li");
    const hits = t.hit_count > 1 ? ` · ${t.hit_count}×` : "";
    li.textContent = `${t.tracker_domain} (${t.category || "tracker"})${hits}`;
    ui.tabTrackersList.appendChild(li);
  });
}

function renderThisPage(ctx) {
  popupTabId = null;
  popupHost = "";

  ui.thisPageSection.classList.remove("hidden");
  ui.sitePrefsStatus.textContent = "";
  ui.focusThisTab.hidden = true;
  ui.openPageNewTab.hidden = true;
  ui.sitePrefsInline.classList.add("hidden");
  ui.tabTrackersWrap.classList.add("hidden");
  ui.tabTrackersEmpty.classList.add("hidden");

  const tab = ctx.tab;
  if (!tab || !tab.url) {
    ui.pageHost.textContent = "";
    ui.pageScanAgent.textContent = "No active tab.";
    renderTabTrackers([], false);
    return;
  }

  ui.pageHost.textContent = tab.host || tab.url;

  if (!tab.eligible || !tab.host) {
    ui.pageScanAgent.textContent =
      "Open a normal website (https) in this tab to run the on-page cookie and tracker check and set site preferences here.";
    renderTabTrackers([], false);
    return;
  }

  popupTabId = tab.id;
  popupHost = tab.host;
  ui.focusThisTab.hidden = false;
  ui.openPageNewTab.hidden = false;
  ui.openPageNewTab.href = tab.url;

  ui.pageScanAgent.textContent = ctx.scan ? formatScanSummary(ctx.scan) : formatScanSummary(null);

  renderTabTrackers(ctx.trackersForTab, true);

  if (ctx.sitePrefs) {
    ui.sitePrefsInline.classList.remove("hidden");
    allowAllChoice = !!ctx.sitePrefs.allowAll;
    syncPrefToggles();
  }
}

function renderLoggedOut() {
  ui.accountBadge.textContent = "Guest";
  ui.loginPrompt.classList.remove("hidden");
  ui.statsBar.classList.add("hidden");
  ui.preferencesSummary.classList.add("hidden");
}

function renderLoggedIn(state) {
  ui.accountBadge.textContent = state.account?.email || "Signed in";
  ui.loginPrompt.classList.add("hidden");
  ui.statsBar.classList.remove("hidden");
  ui.preferencesSummary.classList.remove("hidden");

  ui.cookiesStopped.textContent = String(state.stats?.cookiesStopped || 0);
  ui.privacyConcerns.textContent = String(state.stats?.privacyConcerns || 0);
  ui.blockedSites.textContent = String(state.stats?.blockedSites || 0);

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

function loadPopup() {
  chrome.runtime.sendMessage({ type: "PRIVATE_C_GET_POPUP_CONTEXT" }, (response) => {
    if (chrome.runtime.lastError || !response?.ok) {
      renderThisPage({ tab: null, scan: null, sitePrefs: null });
      renderLoggedOut();
      return;
    }

    renderThisPage(response);

    if (response.state?.isLoggedIn) {
      renderLoggedIn(response.state);
    } else {
      renderLoggedOut();
    }
  });
}

ui.prefBlock.addEventListener("click", () => {
  allowAllChoice = false;
  syncPrefToggles();
});

ui.prefAllow.addEventListener("click", () => {
  allowAllChoice = true;
  syncPrefToggles();
});

ui.saveSitePrefs.addEventListener("click", () => {
  if (!popupHost) return;
  ui.sitePrefsStatus.textContent = "";
  chrome.runtime.sendMessage(
    {
      type: "PRIVATE_C_SITE_PRIVACY_CHOICE",
      payload: { host: popupHost, allowAll: allowAllChoice },
    },
    (r) => {
      if (chrome.runtime.lastError) {
        ui.sitePrefsStatus.textContent = "Could not save. Try again.";
        return;
      }
      if (r?.ok) {
        ui.sitePrefsStatus.textContent = "Saved for this site.";
      } else {
        ui.sitePrefsStatus.textContent = "Save failed.";
      }
    }
  );
});

ui.focusThisTab.addEventListener("click", () => {
  if (popupTabId == null) return;
  chrome.tabs.update(popupTabId, { active: true }, () => {
    void chrome.runtime?.lastError;
    window.close();
  });
});

ui.openPageNewTab.addEventListener("click", (e) => {
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
