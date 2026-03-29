const ui = {
  accountBadge: document.getElementById("accountBadge"),
  loginPrompt: document.getElementById("loginPrompt"),
  statsBar: document.getElementById("statsBar"),
  cookiesStopped: document.getElementById("cookiesStopped"),
  privacyConcerns: document.getElementById("privacyConcerns"),
  blockedSites: document.getElementById("blockedSites"),
  preferencesSummary: document.getElementById("preferencesSummary"),
  preferenceList: document.getElementById("preferenceList")
};

const CATEGORY_LABELS = {
  cookies: "Cookie tracking",
  location: "Location leakage",
  financial: "Financial data",
  health: "Health signals",
  identity: "Identity markers",
  social: "Social profiling"
};

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

function loadState() {
  chrome.runtime.sendMessage({ type: "PRIVATE_C_GET_STATE" }, (response) => {
    if (chrome.runtime.lastError || !response?.ok) {
      renderLoggedOut();
      return;
    }

    const state = response.state;
    if (!state?.isLoggedIn) {
      renderLoggedOut();
      return;
    }

    renderLoggedIn(state);
  });
}

document.getElementById("openDashboard")?.addEventListener("click", () => {
  const url = chrome.runtime.getURL("dashboard/dist/index.html");
  chrome.tabs.create({ url });
});

loadState();
