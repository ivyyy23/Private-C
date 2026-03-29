function removeExistingWarning() {
  const existing = document.getElementById("private-c-threat-warning");
  if (existing) {
    existing.remove();
  }
}

const SHIELD_SVG = `
<svg class="pcw-shield" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path d="M12 2.5 20 5.2v5.8c0 4.2-2.8 8.2-8 9.8-5.2-1.6-8-5.6-8-9.8V5.2L12 2.5Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="miter"/>
</svg>`;

const BADGE_SHIELD_SVG = `
<svg class="pcb-shield" width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path d="M12 2.5 20 5.2v5.8c0 4.2-2.8 8.2-8 9.8-5.2-1.6-8-5.6-8-9.8V5.2L12 2.5Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="miter"/>
</svg>`;

const BADGE_AUTO_HIDE_MS = 5000;

let badgeTimerId = null;
let badgeAnimId = null;

function clearBadgeTimers() {
  if (badgeTimerId != null) {
    clearTimeout(badgeTimerId);
    badgeTimerId = null;
  }
  if (badgeAnimId != null) {
    clearTimeout(badgeAnimId);
    badgeAnimId = null;
  }
}

function removePageBadge() {
  clearBadgeTimers();
  document.getElementById("private-c-page-badge")?.remove();
}

/**
 * Floating Private-C chip: shows ~5s then fades away if untouched.
 * Shield icon opens site cookie/tracker preferences (first visit or revisit).
 * If needPrivacyChoice, row + "Select options" do the same.
 */
function mountPageBadge(payload) {
  const host = typeof payload?.host === "string" ? payload.host.trim().toLowerCase() : "";
  const needPrivacyChoice = !!payload?.needPrivacyChoice;
  if (!host) return;

  removePageBadge();

  const wrap = document.createElement("aside");
  wrap.id = "private-c-page-badge";
  wrap.setAttribute("aria-label", needPrivacyChoice ? "Private-C — choose cookie and tracker options" : "Private-C");

  let expanded = false;
  let hiding = false;

  function openSitePreferences() {
    if (expanded || hiding) return;
    expanded = true;
    removePageBadge();
    if (needPrivacyChoice) {
      mountFirstVisitChoice(host);
      return;
    }
    chrome.runtime.sendMessage({ type: "PRIVATE_C_GET_STATE" }, (res) => {
      void chrome.runtime?.lastError;
      const allow = !!(res?.ok && res?.state?.allowAllTrackingByHost?.[host]);
      mountFirstVisitChoice(host, { revisit: true, initialAllowAll: allow });
    });
  }

  function startHideSequence() {
    if (expanded || hiding) return;
    hiding = true;
    wrap.classList.add("pcb-hiding");
    badgeAnimId = setTimeout(() => {
      badgeAnimId = null;
      wrap.remove();
    }, 420);
  }

  const row = document.createElement("div");
  row.className = "pcb-row";

  const iconWrap = document.createElement("div");
  iconWrap.className = "pcb-icon-wrap pcb-icon-action";
  iconWrap.innerHTML = BADGE_SHIELD_SVG;
  iconWrap.setAttribute("role", "button");
  iconWrap.setAttribute("tabindex", "0");
  iconWrap.setAttribute(
    "aria-label",
    needPrivacyChoice ? "Open site privacy options" : "Open site preferences for this page"
  );
  iconWrap.addEventListener("click", (e) => {
    e.stopPropagation();
    openSitePreferences();
  });
  iconWrap.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openSitePreferences();
    }
  });

  const textCol = document.createElement("div");
  textCol.className = "pcb-textcol";

  const brand = document.createElement("span");
  brand.className = "pcb-brand";
  brand.textContent = "Private-C";
  textCol.appendChild(brand);

  if (needPrivacyChoice) {
    const sub = document.createElement("span");
    sub.className = "pcb-sub";
    sub.textContent = "Tap shield or set cookies / trackers";
    textCol.appendChild(sub);
    row.classList.add("pcb-row-clickable");
    row.addEventListener("click", (e) => {
      if (e.target.closest(".pcb-select-btn") || e.target.closest(".pcb-icon-action")) return;
      openSitePreferences();
    });
  }

  row.appendChild(iconWrap);
  row.appendChild(textCol);
  wrap.appendChild(row);

  if (needPrivacyChoice) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pcb-select-btn";
    btn.textContent = "Select options";
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      openSitePreferences();
    });
    wrap.appendChild(btn);
  }

  document.documentElement.appendChild(wrap);

  badgeTimerId = setTimeout(() => {
    badgeTimerId = null;
    if (!expanded) {
      startHideSequence();
    }
  }, BADGE_AUTO_HIDE_MS);
}

function mountThreatWarning(payload) {
  removePageBadge();
  removeExistingWarning();

  const wrap = document.createElement("section");
  wrap.id = "private-c-threat-warning";
  if (payload.severity === "medium") {
    wrap.classList.add("private-c-medium");
  }

  const head = document.createElement("div");
  head.className = "pcw-head";

  const brand = document.createElement("span");
  brand.className = "pcw-brand";
  brand.textContent = "Private-C";

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "pcw-close";
  closeBtn.setAttribute("aria-label", "Dismiss notification");
  closeBtn.innerHTML =
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';

  head.appendChild(brand);
  head.appendChild(closeBtn);

  const row = document.createElement("div");
  row.className = "pcw-row";

  const iconWrap = document.createElement("div");
  iconWrap.className = "pcw-icon-wrap";
  iconWrap.innerHTML = SHIELD_SVG;

  const col = document.createElement("div");
  col.className = "pcw-col";

  const dialogue = document.createElement("p");
  dialogue.className = "pcw-dialogue";
  dialogue.textContent =
    payload.assistantLine || "Anomaly detected. Review the technical readout and proceed with caution.";

  const pSite = document.createElement("p");
  pSite.className = "pcw-meta";
  const strongSite = document.createElement("strong");
  strongSite.textContent = "Site";
  pSite.appendChild(strongSite);
  pSite.appendChild(document.createTextNode(": "));
  pSite.appendChild(document.createTextNode(String(payload.host ?? "")));

  const pRisk = document.createElement("p");
  pRisk.className = "pcw-meta";
  const strongRisk = document.createElement("strong");
  strongRisk.textContent = "Signal";
  pRisk.appendChild(strongRisk);
  pRisk.appendChild(document.createTextNode(": "));
  pRisk.appendChild(document.createTextNode(String(payload.reason ?? "")));

  const actions = document.createElement("div");
  actions.className = "pcw-actions";

  const dismissBtn = document.createElement("button");
  dismissBtn.type = "button";
  dismissBtn.className = "ghost";
  dismissBtn.textContent = "Dismiss";

  const ackBtn = document.createElement("button");
  ackBtn.type = "button";
  ackBtn.className = "primary";
  ackBtn.textContent = "Acknowledge";

  actions.appendChild(dismissBtn);
  actions.appendChild(ackBtn);

  col.appendChild(dialogue);
  col.appendChild(pSite);
  col.appendChild(pRisk);
  col.appendChild(actions);

  row.appendChild(iconWrap);
  row.appendChild(col);
  wrap.appendChild(head);
  wrap.appendChild(row);

  document.documentElement.appendChild(wrap);

  let touchStartX = 0;
  let touchStartY = 0;

  const close = () => {
    wrap.remove();
    chrome.runtime.sendMessage({ type: "PRIVATE_C_DISMISS_THREAT" });
  };

  closeBtn.addEventListener("click", close);
  dismissBtn.addEventListener("click", close);
  ackBtn.addEventListener("click", close);

  wrap.addEventListener(
    "touchstart",
    (e) => {
      if (!e.touches[0]) return;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    },
    { passive: true }
  );

  wrap.addEventListener(
    "touchend",
    (e) => {
      if (!e.changedTouches[0]) return;
      const dx = e.changedTouches[0].clientX - touchStartX;
      const dy = e.changedTouches[0].clientY - touchStartY;
      if (Math.abs(dx) > 72 && Math.abs(dx) > Math.abs(dy)) {
        close();
      }
    },
    { passive: true }
  );
}

let firstVisitMountHost = null;

function removeFirstVisitChoice() {
  const el = document.getElementById("private-c-first-visit");
  if (el) {
    el.remove();
  }
  firstVisitMountHost = null;
}

function mountFirstVisitChoice(host, options = {}) {
  const h = typeof host === "string" ? host.trim().toLowerCase() : "";
  if (!h) return;
  const revisit = !!options.revisit;
  const initialAllowAll = !!options.initialAllowAll;
  if (firstVisitMountHost === h && document.getElementById("private-c-first-visit")) {
    return;
  }
  removePageBadge();
  removeFirstVisitChoice();
  firstVisitMountHost = h;

  let allowAll = initialAllowAll;

  const wrap = document.createElement("section");
  wrap.id = "private-c-first-visit";

  const head = document.createElement("div");
  head.className = "pcf-head";

  const brand = document.createElement("span");
  brand.className = "pcf-brand";
  brand.textContent = "Private-C";

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "pcf-close";
  closeBtn.setAttribute(
    "aria-label",
    revisit ? "Close without saving" : "Close and block trackers on this site"
  );
  closeBtn.innerHTML =
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';

  head.appendChild(brand);
  head.appendChild(closeBtn);

  const title = document.createElement("p");
  title.className = "pcf-title";
  title.textContent = revisit ? "Site preferences" : "First visit to this site";

  const hostEl = document.createElement("p");
  hostEl.className = "pcf-host";
  hostEl.textContent = h;

  const hint = document.createElement("p");
  hint.className = "pcf-hint";
  hint.textContent = revisit
    ? "Update how Private-C treats cookies and trackers on this site. Save to apply."
    : "Choose how Private-C should treat cookies and trackers here. You can change this later under Blocked sites.";

  const toggleRow = document.createElement("div");
  toggleRow.className = "pcf-toggle-row";
  toggleRow.setAttribute("role", "group");
  toggleRow.setAttribute("aria-label", "Cookies and trackers");

  const btnBlock = document.createElement("button");
  btnBlock.type = "button";
  btnBlock.className = "pcf-toggle-btn pcf-toggle-active";
  btnBlock.textContent = "Block";

  const btnAllow = document.createElement("button");
  btnAllow.type = "button";
  btnAllow.className = "pcf-toggle-btn";
  btnAllow.textContent = "Allow all";

  function syncToggle() {
    if (allowAll) {
      btnBlock.classList.remove("pcf-toggle-active");
      btnAllow.classList.add("pcf-toggle-active");
    } else {
      btnAllow.classList.remove("pcf-toggle-active");
      btnBlock.classList.add("pcf-toggle-active");
    }
  }

  btnBlock.addEventListener("click", () => {
    allowAll = false;
    syncToggle();
  });
  btnAllow.addEventListener("click", () => {
    allowAll = true;
    syncToggle();
  });

  toggleRow.appendChild(btnBlock);
  toggleRow.appendChild(btnAllow);

  syncToggle();

  const continueBtn = document.createElement("button");
  continueBtn.type = "button";
  continueBtn.className = "pcf-continue";
  continueBtn.textContent = revisit ? "Save preferences" : "Save choice";

  function submit(allow) {
    const finalAllow = typeof allow === "boolean" ? allow : allowAll;
    chrome.runtime.sendMessage(
      {
        type: "PRIVATE_C_SITE_PRIVACY_CHOICE",
        payload: { host: h, allowAll: finalAllow },
      },
      () => {
        void chrome.runtime?.lastError;
        removeFirstVisitChoice();
      }
    );
  }

  continueBtn.addEventListener("click", () => submit());

  if (revisit) {
    closeBtn.addEventListener("click", () => removeFirstVisitChoice());
  } else {
    closeBtn.addEventListener("click", () => submit(false));
  }

  wrap.appendChild(head);
  wrap.appendChild(title);
  wrap.appendChild(hostEl);
  wrap.appendChild(hint);
  wrap.appendChild(toggleRow);
  wrap.appendChild(continueBtn);

  document.documentElement.appendChild(wrap);
}

/** One listener only — programmatic re-injection must not stack handlers. */
const PC_LISTENER_KEY = "__privateCThreatOnMessage";
if (!globalThis[PC_LISTENER_KEY]) {
  globalThis[PC_LISTENER_KEY] = true;
  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === "PRIVATE_C_THREAT_FOUND") {
      mountThreatWarning(message.payload);
    }
    if (message?.type === "PRIVATE_C_PAGE_BADGE") {
      mountPageBadge(message.payload);
    }
    if (message?.type === "PRIVATE_C_SHOW_SITE_CHOICE") {
      mountPageBadge({
        host: message.payload?.host,
        needPrivacyChoice: true,
      });
    }
  });
}

function isPrivacyScanEligiblePage() {
  try {
    if (!/^https?:$/i.test(location.protocol)) return false;
    const h = location.hostname.toLowerCase();
    if (h === "localhost" || h === "127.0.0.1" || h.endsWith(".localhost")) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Lightweight on-page agent: third-party scripts, cross-origin frames, cookie footprint, tracker-like hosts.
 * Results power the toolbar popup without opening the dashboard.
 */
function runPagePrivacyAgentScan() {
  if (!isPrivacyScanEligiblePage()) return;

  const host = location.hostname.toLowerCase();
  const pageUrl = location.href;

  const thirdPartyScriptHosts = new Map();
  for (const s of document.scripts) {
    if (!s.src) continue;
    try {
      const u = new URL(s.src, pageUrl);
      const sh = u.hostname.toLowerCase();
      if (sh && sh !== host) {
        thirdPartyScriptHosts.set(sh, (thirdPartyScriptHosts.get(sh) || 0) + 1);
      }
    } catch {
      /* ignore */
    }
  }

  let crossOriginFrames = 0;
  for (const f of document.querySelectorAll("iframe[src]")) {
    try {
      const u = new URL(f.getAttribute("src") || "", pageUrl);
      if (!/^https?:$/i.test(u.protocol)) continue;
      if (u.hostname.toLowerCase() && u.hostname.toLowerCase() !== host) crossOriginFrames += 1;
    } catch {
      /* ignore */
    }
  }

  let crossOriginImages = 0;
  for (const img of document.querySelectorAll("img[src]")) {
    try {
      const u = new URL(img.getAttribute("src") || "", pageUrl);
      if (!/^https?:$/i.test(u.protocol)) continue;
      if (u.hostname.toLowerCase() && u.hostname.toLowerCase() !== host) crossOriginImages += 1;
    } catch {
      /* ignore */
    }
  }

  const firstPartyCookieChunks = document.cookie ? document.cookie.split(";").filter((c) => c.trim()).length : 0;

  const trackerHints = [...thirdPartyScriptHosts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([d]) => d);

  const thirdPartyScripts = [...thirdPartyScriptHosts.values()].reduce((a, n) => a + n, 0);

  chrome.runtime.sendMessage(
    {
      type: "PRIVATE_C_SITE_SCAN_RESULT",
      payload: {
        url: pageUrl,
        host,
        scannedAt: Date.now(),
        signals: {
          thirdPartyScripts,
          thirdPartyScriptHostCount: thirdPartyScriptHosts.size,
          crossOriginFrames,
          crossOriginImages,
          firstPartyCookieChunks,
          trackerHints,
        },
      },
    },
    () => void chrome.runtime?.lastError
  );
}

function schedulePagePrivacyAgentScan() {
  runPagePrivacyAgentScan();
  setTimeout(runPagePrivacyAgentScan, 2200);
}

schedulePagePrivacyAgentScan();
