function removeExistingWarning() {
  const existing = document.getElementById("private-c-threat-warning");
  if (existing) {
    existing.remove();
  }
}

/**
 * Fixed-position overlays must not be children of a transformed <body> (common on SPAs) or they
 * clip or mis-position. Use a zero-size portal on <html> so panels anchor to the viewport.
 * Set document.documentElement.dataset.privateCUseBodyPortal = "1" to force body append (escape hatch).
 */
function getPrivateCOverlayRoot() {
  let root = document.getElementById("private-c-overlay-root");
  if (root) return root;
  root = document.createElement("div");
  root.id = "private-c-overlay-root";
  root.setAttribute("data-private-c-portal", "1");
  root.style.cssText = [
    "position:fixed",
    "top:0",
    "left:0",
    "width:0",
    "height:0",
    "overflow:visible",
    "pointer-events:none",
    "z-index:2147483646",
    "margin:0",
    "padding:0",
    "border:0",
    "background:transparent",
  ].join(";");
  document.documentElement.appendChild(root);
  return root;
}

function privateCAppendToPage(node) {
  const mount = () => {
    if (node.style && !node.style.pointerEvents) {
      node.style.pointerEvents = "auto";
    }
    if (document.documentElement?.dataset?.privateCUseBodyPortal === "1") {
      const body = document.body;
      if (body) {
        body.appendChild(node);
        return;
      }
    }
    getPrivateCOverlayRoot().appendChild(node);
  };
  if (document.documentElement && (document.body || document.readyState !== "loading")) {
    mount();
    return;
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount, { once: true });
  } else {
    mount();
  }
}

/**
 * Auto-dismiss timers — these apply ONLY to on-page UI injected into the tab.
 * They are NOT the extension toolbar popup (icon click); that popup stays open until you close it.
 */
/** Bottom-of-page or corner “privacy choice” panel — Block all / Allow all / Select choices. */
const PRIVACY_PANEL_AUTO_MS = 90000;

const privacyPromptQueue = [];
let privacyPromptActive = false;
let privacyPanelTimer = null;
let spaMutationObserver = null;

function clearPrivacyPanelTimer() {
  if (privacyPanelTimer != null) {
    clearTimeout(privacyPanelTimer);
    privacyPanelTimer = null;
  }
}

function defaultGranularSiteRules() {
  return {
    mode: "custom",
    version: 1,
    cookies: "essential_only",
    trackers: {
      social: false,
      analytics: false,
      fingerprinting: false,
      third_party: false,
      block_ip_endpoints: true,
    },
    storage: { blockLocal: false, blockSession: false, allowSelectedOnly: true },
    permissions: { geoBlocked: false, cameraBlocked: false, micBlocked: false, askEveryTime: true },
    accountProtection: { warnLogin: false, scanPolicyBeforeLogin: false, delaySubmit: false },
  };
}

function enqueuePrivacyPrompt(host) {
  privacyPromptQueue.push(host);
  drainPrivacyPromptQueue();
}

function drainPrivacyPromptQueue() {
  if (privacyPromptActive) return;
  const host = privacyPromptQueue.shift();
  if (!host) return;
  privacyPromptActive = true;
  mountPrivacyDecisionPanel(host, () => {
    privacyPromptActive = false;
    drainPrivacyPromptQueue();
  });
}

function brandLogoUrl() {
  try {
    return `${chrome.runtime.getURL("assets/Logo.png")}?v=2`;
  } catch {
    return "";
  }
}

function removePageBadge() {
  document.getElementById("private-c-page-badge")?.remove();
}

/**
 * First-visit: queued bottom on-page banner (NOT the toolbar popup).
 * Returning visits: same Block / Allow / Select UI anchored bottom-right (matches overlay controls).
 */
function mountPageBadge(payload) {
  const host = typeof payload?.host === "string" ? payload.host.trim().toLowerCase() : "";
  const needPrivacyChoice = !!payload?.needPrivacyChoice;
  if (!host) return;

  removePageBadge();

  if (needPrivacyChoice) {
    enqueuePrivacyPrompt(host);
    return;
  }

  mountPrivacyDecisionPanel(host, () => {}, { placement: "corner" });
}

function mountThreatWarning(payload) {
  removePageBadge();
  removePrivacyDecisionPanel();
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
  const twLogo = document.createElement("img");
  twLogo.className = "pcw-brand-logo";
  twLogo.src = brandLogoUrl();
  twLogo.alt = "";
  twLogo.width = 18;
  twLogo.height = 18;
  iconWrap.appendChild(twLogo);

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

  privateCAppendToPage(wrap);

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

function removePrivacyDecisionPanel() {
  clearPrivacyPanelTimer();
  document.getElementById("private-c-privacy-panel")?.remove();
}

function removeGranularOptionsSheet() {
  document.getElementById("private-c-granular-sheet")?.remove();
}

function removeFirstVisitChoice() {
  document.getElementById("private-c-first-visit")?.remove();
  firstVisitMountHost = null;
}

function mergeSiteRulesFromState(host, state) {
  const raw = state?.sitePrivacyRules?.[host];
  const base = defaultGranularSiteRules();
  if (!raw || typeof raw !== "object") {
    return { ...base };
  }
  if (raw.mode === "allow_all") {
    return { ...base, mode: "allow_all" };
  }
  if (raw.mode === "block_all") {
    return {
      mode: "custom",
      version: 1,
      cookies: "block_all",
      trackers: {
        social: true,
        analytics: true,
        fingerprinting: true,
        third_party: true,
        block_ip_endpoints: true,
      },
      storage: { ...base.storage, ...(raw.storage || {}) },
      permissions: { ...base.permissions, ...(raw.permissions || {}) },
      accountProtection: { ...base.accountProtection, ...(raw.accountProtection || {}) },
    };
  }
  return {
    mode: "custom",
    version: 1,
    cookies: raw.cookies ?? base.cookies,
    trackers: { ...base.trackers, ...(raw.trackers || {}) },
    storage: { ...base.storage, ...(raw.storage || {}) },
    permissions: { ...base.permissions, ...(raw.permissions || {}) },
    accountProtection: { ...base.accountProtection, ...(raw.accountProtection || {}) },
  };
}

/** Human-readable cookie / policy line for on-page UI */
function summarizeCookiePolicyLine(rules) {
  if (!rules || rules.mode === "allow_all") {
    return "Cookies & trackers: all third parties allowed for this site.";
  }
  const c = rules.cookies || "essential_only";
  const cookieMap = {
    essential_only: "Cookies: essential / first-party focused (third-party restricted).",
    block_analytics: "Cookies: analytics cookies blocked.",
    block_advertising: "Cookies: advertising cookies blocked.",
    block_all: "Cookies: strict blocking for tracking-style cookies.",
  };
  return cookieMap[c] || "Cookies: custom settings.";
}

/**
 * On-page privacy panel (inside the website, not the toolbar icon). Placement: centered bottom bar
 * or bottom-right corner — same actions either way.
 * Auto-hides after PRIVACY_PANEL_AUTO_MS; timer pauses while you hover or focus inside.
 */
function mountPrivacyDecisionPanel(host, onDone, options = {}) {
  const h = typeof host === "string" ? host.trim().toLowerCase() : "";
  if (!h) return;

  const placement = options.placement === "corner" ? "corner" : "bar";

  removePrivacyDecisionPanel();
  removeGranularOptionsSheet();
  removePageBadge();

  const wrap = document.createElement("section");
  wrap.id = "private-c-privacy-panel";
  if (placement === "corner") {
    wrap.classList.add("pcp-corner");
  }
  wrap.setAttribute("aria-label", "Private-C site privacy — on this webpage");
  wrap.tabIndex = -1;

  const finish = () => {
    removePrivacyDecisionPanel();
    firstVisitMountHost = null;
    if (typeof onDone === "function") onDone();
  };

  const schedulePanelDismiss = () => {
    clearPrivacyPanelTimer();
    privacyPanelTimer = setTimeout(() => {
      privacyPanelTimer = null;
      if (document.documentElement.contains(wrap)) {
        wrap.classList.add("pcp-fade");
        setTimeout(finish, 360);
      }
    }, PRIVACY_PANEL_AUTO_MS);
  };

  wrap.addEventListener("mouseenter", () => {
    clearPrivacyPanelTimer();
  });
  wrap.addEventListener("mouseleave", () => {
    schedulePanelDismiss();
  });
  wrap.addEventListener("focusin", () => {
    clearPrivacyPanelTimer();
  });
  wrap.addEventListener("focusout", (e) => {
    if (!wrap.contains(e.relatedTarget)) {
      schedulePanelDismiss();
    }
  });

  schedulePanelDismiss();

  const head = document.createElement("div");
  head.className = "pcp-head";

  const brand = document.createElement("span");
  brand.className = "pcp-brand";
  brand.textContent = "Private-C";

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "pcp-x";
  closeBtn.setAttribute("aria-label", "Dismiss");
  closeBtn.innerHTML =
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  closeBtn.addEventListener("click", (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    clearPrivacyPanelTimer();
    wrap.classList.add("pcp-fade");
    setTimeout(finish, 360);
  });

  head.appendChild(brand);
  head.appendChild(closeBtn);

  const title = document.createElement("p");
  title.className = "pcp-title";
  title.textContent = "On this page — choose cookies & trackers";

  const hostEl = document.createElement("p");
  hostEl.className = "pcp-host";
  hostEl.textContent = h;

  const statusEl = document.createElement("p");
  statusEl.className = "pcp-status";
  statusEl.textContent =
    "This bar is on the website itself (not the extension icon). It will hide after a while if you move away — hover here to pause the timer. Use Block all (recommended), Allow all, or Select choices.";

  const actions = document.createElement("div");
  actions.className = "pcp-actions";

  function wirePrimary(btn, allowAll) {
    btn.addEventListener("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      clearPrivacyPanelTimer();
      chrome.runtime.sendMessage(
        { type: "PRIVATE_C_SITE_PRIVACY_CHOICE", payload: { host: h, allowAll } },
        () => {
          void chrome.runtime?.lastError;
          wrap.classList.add("pcp-fade");
          setTimeout(finish, 200);
        }
      );
    });
  }

  const btnBlock = document.createElement("button");
  btnBlock.type = "button";
  btnBlock.className = "pcp-btn pcp-btn-primary";
  btnBlock.textContent = "Block all";
  wirePrimary(btnBlock, false);

  const btnAllow = document.createElement("button");
  btnAllow.type = "button";
  btnAllow.className = "pcp-btn";
  btnAllow.textContent = "Allow all";
  wirePrimary(btnAllow, true);

  function openGranularFromPanel(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    clearPrivacyPanelTimer();
    wrap.remove();
    chrome.runtime.sendMessage({ type: "PRIVATE_C_GET_STATE" }, (res) => {
      void chrome.runtime?.lastError;
      const state = res?.state || {};
      mountGranularOptionsSheet(h, {
        initialRules: mergeSiteRulesFromState(h, state),
        allowAllHost: !!state.allowAllTrackingByHost?.[h],
        onClose: finish,
      });
    });
  }

  const btnOpts = document.createElement("button");
  btnOpts.type = "button";
  btnOpts.className = "pcp-btn pcp-btn-stack";
  btnOpts.setAttribute("aria-label", "Select choices — open detailed privacy controls");
  const optLine1 = document.createElement("span");
  optLine1.className = "pcp-btn-line";
  optLine1.textContent = "Select choices";
  const optLine2 = document.createElement("span");
  optLine2.className = "pcp-btn-sub";
  optLine2.textContent = "Detailed controls";
  btnOpts.appendChild(optLine1);
  btnOpts.appendChild(optLine2);
  btnOpts.addEventListener("click", openGranularFromPanel);

  actions.appendChild(btnBlock);
  actions.appendChild(btnAllow);
  actions.appendChild(btnOpts);

  wrap.appendChild(head);
  wrap.appendChild(title);
  wrap.appendChild(hostEl);
  wrap.appendChild(statusEl);
  wrap.appendChild(actions);

  chrome.runtime.sendMessage({ type: "PRIVATE_C_GET_STATE" }, (res) => {
    void chrome.runtime?.lastError;
    const state = res?.state;
    if (!state) return;
    const siteRule = state.sitePrivacyRules?.[h];
    const allowAll = !!state.allowAllTrackingByHost?.[h];
    const decided = !!state.firstVisitDecided?.[h];
    if (!decided && !siteRule && !allowAll) return;
    let line = "";
    if (allowAll || siteRule?.mode === "allow_all") {
      line = "Saved for this site: Allow all — third-party cookies and trackers permitted.";
    } else if (siteRule?.mode === "block_all") {
      line = "Saved for this site: Block all — third-party trackers restricted.";
    } else if (siteRule?.mode === "custom" && siteRule) {
      line = summarizeCookiePolicyLine(siteRule);
    } else if (decided) {
      line = "Saved for this site: Block all — third-party trackers restricted.";
    }
    if (line) statusEl.textContent = line;
  });

  privateCAppendToPage(wrap);
}

function readGranularForm(wrap) {
  const cookie = wrap.querySelector('input[name="pc-cookies"]:checked')?.value || "essential_only";
  return {
    mode: "custom",
    version: 1,
    cookies: cookie,
    trackers: {
      social: !!wrap.querySelector('[data-pc-track="social"]')?.checked,
      analytics: !!wrap.querySelector('[data-pc-track="analytics"]')?.checked,
      fingerprinting: !!wrap.querySelector('[data-pc-track="fingerprinting"]')?.checked,
      third_party: !!wrap.querySelector('[data-pc-track="third_party"]')?.checked,
    },
    storage: {
      blockLocal: !!wrap.querySelector('[data-pc-st="local"]')?.checked,
      blockSession: !!wrap.querySelector('[data-pc-st="session"]')?.checked,
      allowSelectedOnly: !!wrap.querySelector('[data-pc-st="selected"]')?.checked,
    },
    permissions: {
      geoBlocked: !!wrap.querySelector('[data-pc-perm="geo"]')?.checked,
      cameraBlocked: !!wrap.querySelector('[data-pc-perm="cam"]')?.checked,
      micBlocked: !!wrap.querySelector('[data-pc-perm="mic"]')?.checked,
      askEveryTime: !!wrap.querySelector('[data-pc-perm="ask"]')?.checked,
    },
    accountProtection: {
      warnLogin: !!wrap.querySelector('[data-pc-acct="warn"]')?.checked,
      scanPolicyBeforeLogin: !!wrap.querySelector('[data-pc-acct="scan"]')?.checked,
      delaySubmit: !!wrap.querySelector('[data-pc-acct="delay"]')?.checked,
    },
  };
}

function applyGranularRulesToForm(wrap, r) {
  const setRadio = (name, val) => {
    const el = wrap.querySelector(`input[name="${name}"][value="${val}"]`);
    if (el) el.checked = true;
  };
  setRadio("pc-cookies", r.cookies || "essential_only");
  const tk = r.trackers || {};
  const setCk = (sel, v) => {
    const el = wrap.querySelector(sel);
    if (el) el.checked = !!v;
  };
  setCk('[data-pc-track="social"]', tk.social);
  setCk('[data-pc-track="analytics"]', tk.analytics);
  setCk('[data-pc-track="fingerprinting"]', tk.fingerprinting);
  setCk('[data-pc-track="third_party"]', tk.third_party);
  setCk('[data-pc-track="block_ip_endpoints"]', tk.block_ip_endpoints !== false);
  const st = r.storage || {};
  setCk('[data-pc-st="local"]', st.blockLocal);
  setCk('[data-pc-st="session"]', st.blockSession);
  setCk('[data-pc-st="selected"]', st.allowSelectedOnly !== false);
  const pm = r.permissions || {};
  setCk('[data-pc-perm="geo"]', pm.geoBlocked);
  setCk('[data-pc-perm="cam"]', pm.cameraBlocked);
  setCk('[data-pc-perm="mic"]', pm.micBlocked);
  setCk('[data-pc-perm="ask"]', pm.askEveryTime !== false);
  const ac = r.accountProtection || {};
  setCk('[data-pc-acct="warn"]', ac.warnLogin);
  setCk('[data-pc-acct="scan"]', ac.scanPolicyBeforeLogin);
  setCk('[data-pc-acct="delay"]', ac.delaySubmit);
}

/**
 * Granular site rules sheet (sharp corners, theme-aligned). Saves via PRIVATE_C_SITE_PRIVACY_RULES.
 */
function mountGranularOptionsSheet(host, opts = {}) {
  const h = typeof host === "string" ? host.trim().toLowerCase() : "";
  if (!h) return;

  removeGranularOptionsSheet();
  removeFirstVisitChoice();

  let initial = opts.initialRules || defaultGranularSiteRules();
  if (opts.allowAllHost) {
    initial = { ...defaultGranularSiteRules(), mode: "allow_all" };
  }

  const onClose = typeof opts.onClose === "function" ? opts.onClose : () => {};

  const wrap = document.createElement("section");
  wrap.id = "private-c-granular-sheet";
  wrap.setAttribute("aria-label", "Site privacy options");

  const head = document.createElement("div");
  head.className = "pgs-head";

  const brand = document.createElement("span");
  brand.className = "pgs-brand";
  brand.textContent = "Private-C · Options";

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "pgs-x";
  closeBtn.setAttribute("aria-label", "Close");
  closeBtn.innerHTML =
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6L6 18"/></svg>';

  const closeSheet = () => {
    wrap.remove();
    onClose();
  };

  closeBtn.addEventListener("click", closeSheet);
  head.appendChild(brand);
  head.appendChild(closeBtn);

  const hostEl = document.createElement("p");
  hostEl.className = "pgs-host";
  hostEl.textContent = h;

  const scroll = document.createElement("div");
  scroll.className = "pgs-scroll";

  const allowAllRow = document.createElement("label");
  allowAllRow.className = "pgs-row pgs-allow-all-row";
  const allowAllInput = document.createElement("input");
  allowAllInput.type = "checkbox";
  allowAllInput.setAttribute("data-pc-allow-all", "1");
  const allowAllSpan = document.createElement("span");
  allowAllSpan.textContent = "Allow all third-party trackers and requests for this site";
  allowAllRow.appendChild(allowAllInput);
  allowAllRow.appendChild(allowAllSpan);
  scroll.appendChild(allowAllRow);
  if (initial.mode === "allow_all" || opts.allowAllHost) {
    allowAllInput.checked = true;
  }

  function fieldset(legend) {
    const fs = document.createElement("fieldset");
    fs.className = "pgs-fieldset";
    const lg = document.createElement("legend");
    lg.className = "pgs-legend";
    lg.textContent = legend;
    fs.appendChild(lg);
    return fs;
  }

  function rowCheckbox(label, dataAttr, suffix) {
    const lab = document.createElement("label");
    lab.className = "pgs-row";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.setAttribute(`data-pc-${dataAttr}`, suffix);
    const span = document.createElement("span");
    span.textContent = label;
    lab.appendChild(input);
    lab.appendChild(span);
    return lab;
  }

  const fsCookies = fieldset("Cookies");
  const cookieOpts = [
    ["essential_only", "Essential only"],
    ["block_analytics", "Block analytics cookies"],
    ["block_advertising", "Block advertising cookies"],
    ["block_all", "Block all cookies (tracking requests)"],
  ];
  for (const [val, lab] of cookieOpts) {
    const labEl = document.createElement("label");
    labEl.className = "pgs-row";
    const input = document.createElement("input");
    input.type = "radio";
    input.name = "pc-cookies";
    input.value = val;
    const span = document.createElement("span");
    span.textContent = lab;
    labEl.appendChild(input);
    labEl.appendChild(span);
    fsCookies.appendChild(labEl);
  }

  const fsTrack = fieldset("Trackers");
  fsTrack.appendChild(rowCheckbox("Block social trackers", "track", "social"));
  fsTrack.appendChild(rowCheckbox("Block analytics trackers", "track", "analytics"));
  fsTrack.appendChild(rowCheckbox("Block fingerprinting scripts", "track", "fingerprinting"));
  fsTrack.appendChild(rowCheckbox("Block third-party trackers", "track", "third_party"));
  fsTrack.appendChild(
    rowCheckbox("Block third-party requests to IP addresses (IPv4 / bracketed IPv6)", "track", "block_ip_endpoints")
  );

  const fsSt = fieldset("Storage");
  fsSt.appendChild(rowCheckbox("Block localStorage", "st", "local"));
  fsSt.appendChild(rowCheckbox("Block sessionStorage", "st", "session"));
  fsSt.appendChild(rowCheckbox("Allow selected storage only (strict)", "st", "selected"));

  const fsPerm = fieldset("Permissions");
  fsPerm.appendChild(rowCheckbox("Block geolocation", "perm", "geo"));
  fsPerm.appendChild(rowCheckbox("Block camera", "perm", "cam"));
  fsPerm.appendChild(rowCheckbox("Block microphone", "perm", "mic"));
  fsPerm.appendChild(rowCheckbox("Ask every time (prompt-style sites)", "perm", "ask"));

  const fsAcct = fieldset("Account / login protection");
  fsAcct.appendChild(rowCheckbox("Warn before login", "acct", "warn"));
  fsAcct.appendChild(rowCheckbox("Scan privacy policy before login", "acct", "scan"));
  fsAcct.appendChild(rowCheckbox("Delay form submit until review", "acct", "delay"));

  scroll.appendChild(fsCookies);
  scroll.appendChild(fsTrack);
  scroll.appendChild(fsSt);
  scroll.appendChild(fsPerm);
  scroll.appendChild(fsAcct);

  const infoEl = document.createElement("div");
  infoEl.className = "pgs-info";
  infoEl.setAttribute("role", "status");
  function refreshInfo() {
    if (allowAllInput.checked) {
      infoEl.textContent =
        "Status: Allow all active — third-party cookies and tracker requests are permitted for this site.";
      return;
    }
    const r = readGranularForm(wrap);
    const parts = [summarizeCookiePolicyLine(r)];
    const tk = r.trackers || {};
    const on = [];
    if (tk.social) on.push("social");
    if (tk.analytics) on.push("analytics");
    if (tk.fingerprinting) on.push("fingerprinting");
    if (tk.third_party) on.push("third-party");
    if (tk.block_ip_endpoints !== false) on.push("IP endpoints");
    parts.push(
      on.length
        ? `Trackers: blocking ${on.join(", ")}.`
        : "Trackers: no extra category blocks selected (catalog rules may still apply)."
    );
    infoEl.textContent = parts.join(" ");
  }
  allowAllInput.addEventListener("change", refreshInfo);
  scroll.addEventListener("change", refreshInfo);

  const saveRow = document.createElement("div");
  saveRow.className = "pgs-save-row";

  const saveBtn = document.createElement("button");
  saveBtn.type = "button";
  saveBtn.className = "pgs-save";
  saveBtn.textContent = "Save & apply";
  saveBtn.addEventListener("click", () => {
    if (wrap.querySelector("[data-pc-allow-all]")?.checked) {
      chrome.runtime.sendMessage(
        { type: "PRIVATE_C_SITE_PRIVACY_RULES", payload: { host: h, rules: { mode: "allow_all" } } },
        () => {
          void chrome.runtime?.lastError;
          refreshAccountProtectionHooks();
          closeSheet();
        }
      );
      return;
    }
    const rules = readGranularForm(wrap);
    chrome.runtime.sendMessage(
      { type: "PRIVATE_C_SITE_PRIVACY_RULES", payload: { host: h, rules } },
      () => {
        void chrome.runtime?.lastError;
        refreshAccountProtectionHooks();
        closeSheet();
      }
    );
  });

  saveRow.appendChild(saveBtn);
  wrap.appendChild(head);
  wrap.appendChild(hostEl);
  wrap.appendChild(infoEl);
  wrap.appendChild(scroll);
  wrap.appendChild(saveRow);
  applyGranularRulesToForm(wrap, initial);
  refreshInfo();
  privateCAppendToPage(wrap);
}

function mountFirstVisitChoice(host, options = {}) {
  const h = typeof host === "string" ? host.trim().toLowerCase() : "";
  if (!h) return;
  const revisit = !!options.revisit;

  if (firstVisitMountHost === h && document.getElementById("private-c-granular-sheet")) {
    return;
  }
  removePageBadge();
  removePrivacyDecisionPanel();
  removeFirstVisitChoice();
  firstVisitMountHost = h;

  if (revisit) {
    chrome.runtime.sendMessage({ type: "PRIVATE_C_GET_STATE" }, (res) => {
      void chrome.runtime?.lastError;
      const state = res?.state || {};
      mountGranularOptionsSheet(h, {
        initialRules: mergeSiteRulesFromState(h, state),
        allowAllHost: !!state.allowAllTrackingByHost?.[h],
        onClose: () => {
          firstVisitMountHost = null;
        },
      });
    });
    return;
  }

  enqueuePrivacyPrompt(h);
}

let pcLoginBannerEl = null;
let pcLoginObserver = null;
let pcSubmitCaptureAttached = false;
let pcSpaScanTimer = null;
let pcLoginProbeTimer = null;

function removeLoginBanner() {
  pcLoginBannerEl?.remove();
  pcLoginBannerEl = null;
}

function showLoginPrivacyBanner(host, ap) {
  if (pcLoginBannerEl) return;
  const strip = document.createElement("div");
  strip.id = "private-c-login-strip";
  strip.className = "pcl-strip";
  const parts = [];
  if (ap.warnLogin) parts.push("Login field detected — confirm you trust this site.");
  if (ap.scanPolicyBeforeLogin) parts.push("Review the privacy policy before signing in.");
  strip.textContent = parts.join(" ");
  const dismiss = document.createElement("button");
  dismiss.type = "button";
  dismiss.className = "pcl-dismiss";
  dismiss.textContent = "Dismiss";
  dismiss.addEventListener("click", () => strip.remove());
  strip.appendChild(dismiss);
  privateCAppendToPage(strip);
  pcLoginBannerEl = strip;
}

function installLoginSentinelForHost(host, ap) {
  if (pcLoginObserver) {
    pcLoginObserver.disconnect();
    pcLoginObserver = null;
  }
  if (!ap?.warnLogin && !ap?.scanPolicyBeforeLogin) {
    removeLoginBanner();
    return;
  }
  const probe = () => {
    if (document.querySelector('input[type="password"]:not([disabled])')) {
      showLoginPrivacyBanner(host, ap);
    }
  };
  probe();
  pcLoginObserver = new MutationObserver(() => {
    clearTimeout(pcLoginProbeTimer);
    pcLoginProbeTimer = setTimeout(probe, 280);
  });
  pcLoginObserver.observe(document.documentElement, { childList: true, subtree: true });
}

function installDelayedSubmitIfNeeded(host, ap) {
  if (!ap?.delaySubmit || pcSubmitCaptureAttached) return;
  pcSubmitCaptureAttached = true;
  document.addEventListener(
    "submit",
    (ev) => {
      const form = ev.target;
      if (!(form instanceof HTMLFormElement)) return;
      if (!form.querySelector('input[type="password"]')) return;
      if (form.dataset.pcDelayOk === "1") {
        delete form.dataset.pcDelayOk;
        return;
      }
      ev.preventDefault();
      ev.stopPropagation();
      const ok = globalThis.confirm(
        "Private-C: this form may send your credentials. Submit only if you trust this site."
      );
      if (ok) {
        form.dataset.pcDelayOk = "1";
        form.requestSubmit();
      }
    },
    true
  );
}

function refreshAccountProtectionHooks() {
  if (!isPrivacyScanEligiblePage()) return;
  const host = location.hostname.toLowerCase();
  chrome.runtime.sendMessage({ type: "PRIVATE_C_GET_STATE" }, (res) => {
    void chrome.runtime?.lastError;
    const ap = res?.state?.sitePrivacyRules?.[host]?.accountProtection;
    removeLoginBanner();
    if (ap && (ap.warnLogin || ap.scanPolicyBeforeLogin)) {
      installLoginSentinelForHost(host, ap);
    }
    if (ap?.delaySubmit) {
      installDelayedSubmitIfNeeded(host, ap);
    }
  });
}

function startSpaMutationObserver() {
  if (spaMutationObserver || !isPrivacyScanEligiblePage()) return;
  let t;
  const tick = () => {
    clearTimeout(t);
    t = setTimeout(() => {
      runPagePrivacyAgentScan();
      refreshAccountProtectionHooks();
    }, 450);
  };
  spaMutationObserver = new MutationObserver(tick);
  spaMutationObserver.observe(document.documentElement, { childList: true, subtree: true });
}

/** One listener only — programmatic re-injection must not stack handlers. */
const PC_LISTENER_KEY = "__privateCThreatOnMessage";
if (!globalThis[PC_LISTENER_KEY]) {
  globalThis[PC_LISTENER_KEY] = true;
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "PRIVATE_C_REFRESH_PAGE_SCAN_FROM_POPUP") {
      schedulePagePrivacyAgentScan();
      return false;
    }
    if (message?.type === "PRIVATE_C_OPEN_SITE_OPTIONS") {
      const host = location.hostname.toLowerCase();
      if (!host || !isPrivacyScanEligiblePage()) {
        return false;
      }
      chrome.runtime.sendMessage({ type: "PRIVATE_C_GET_STATE" }, (res) => {
        void chrome.runtime?.lastError;
        try {
          const state = res?.state || {};
          mountGranularOptionsSheet(host, {
            initialRules: mergeSiteRulesFromState(host, state),
            allowAllHost: !!state.allowAllTrackingByHost?.[host],
            onClose: () => {},
          });
          sendResponse({ ok: true });
        } catch (e) {
          sendResponse({ ok: false, error: String(e) });
        }
      });
      return true;
    }
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
    if (message?.type === "PRIVATE_C_PAGE_REVALIDATE") {
      schedulePagePrivacyAgentScan();
      refreshAccountProtectionHooks();
    }
    return false;
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
  setTimeout(() => {
    startSpaMutationObserver();
    refreshAccountProtectionHooks();
  }, 400);
}

schedulePagePrivacyAgentScan();
