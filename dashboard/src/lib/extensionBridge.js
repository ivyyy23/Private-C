export function getExtensionState() {
  return new Promise((resolve, reject) => {
    if (typeof chrome === "undefined" || !chrome.runtime?.sendMessage) {
      resolve(null);
      return;
    }
    chrome.runtime.sendMessage({ type: "PRIVATE_C_GET_STATE" }, (res) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(res?.ok ? res.state : null);
    });
  });
}

export function patchExtensionState(payload) {
  return new Promise((resolve, reject) => {
    if (typeof chrome === "undefined" || !chrome.runtime?.sendMessage) {
      reject(new Error("Extension APIs unavailable"));
      return;
    }
    chrome.runtime.sendMessage({ type: "PRIVATE_C_PATCH_STATE", payload }, (res) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (!res?.ok) {
        reject(new Error(res?.error || "Patch failed"));
        return;
      }
      resolve(res.state);
    });
  });
}
