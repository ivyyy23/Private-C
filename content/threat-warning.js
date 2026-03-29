function removeExistingWarning() {
  const existing = document.getElementById("private-c-threat-warning");
  if (existing) {
    existing.remove();
  }
}

function mountThreatWarning(payload) {
  removeExistingWarning();

  const wrap = document.createElement("section");
  wrap.id = "private-c-threat-warning";
  if (payload.severity === "medium") {
    wrap.classList.add("private-c-medium");
  }

  const row = document.createElement("div");
  row.className = "pcw-row";

  const img = document.createElement("img");
  img.className = "pcw-char";
  img.alt = "";
  img.src = chrome.runtime.getURL("assets/private-c-spy.svg");

  const col = document.createElement("div");
  col.className = "pcw-col";

  const label = document.createElement("p");
  label.className = "pcw-label";
  label.textContent = "Private-C";

  const dialogue = document.createElement("p");
  dialogue.className = "pcw-dialogue";
  dialogue.textContent =
    payload.assistantLine ||
    "Anomaly detected. Review the technical readout and proceed with caution.";

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
  dismissBtn.id = "private-c-dismiss";
  dismissBtn.textContent = "Dismiss";

  const ackBtn = document.createElement("button");
  ackBtn.type = "button";
  ackBtn.className = "primary";
  ackBtn.id = "private-c-ack";
  ackBtn.textContent = "Acknowledge";

  actions.appendChild(dismissBtn);
  actions.appendChild(ackBtn);

  col.appendChild(label);
  col.appendChild(dialogue);
  col.appendChild(pSite);
  col.appendChild(pRisk);
  col.appendChild(actions);

  row.appendChild(img);
  row.appendChild(col);
  wrap.appendChild(row);

  document.documentElement.appendChild(wrap);

  const close = () => {
    wrap.remove();
    chrome.runtime.sendMessage({ type: "PRIVATE_C_DISMISS_THREAT" });
  };

  dismissBtn.addEventListener("click", close);
  ackBtn.addEventListener("click", close);
}

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "PRIVATE_C_THREAT_FOUND") {
    mountThreatWarning(message.payload);
  }
});
