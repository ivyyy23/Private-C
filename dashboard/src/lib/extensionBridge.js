import { isStandaloneDashboard, STANDALONE_STATE_KEY, notifyStandaloneMutate } from "./standaloneStorage.js";

function mergeDeep(target, source) {
  const out = { ...(target && typeof target === "object" ? target : {}) };
  if (!source || typeof source !== "object") return out;
  for (const k of Object.keys(source)) {
    const sv = source[k];
    const tv = out[k];
    if (sv && typeof sv === "object" && !Array.isArray(sv) && tv && typeof tv === "object" && !Array.isArray(tv)) {
      out[k] = mergeDeep(tv, sv);
    } else {
      out[k] = sv;
    }
  }
  return out;
}

function readStandaloneStateRaw() {
  try {
    const s = localStorage.getItem(STANDALONE_STATE_KEY);
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}

function writeStandaloneStateMerged(payload) {
  const prev = readStandaloneStateRaw() || {};
  const next = mergeDeep(prev, payload);
  localStorage.setItem(STANDALONE_STATE_KEY, JSON.stringify(next));
  notifyStandaloneMutate();
  return next;
}

export function getExtensionState() {
  return new Promise((resolve, reject) => {
    if (isStandaloneDashboard()) {
      resolve(readStandaloneStateRaw());
      return;
    }
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
    if (isStandaloneDashboard()) {
      try {
        resolve(writeStandaloneStateMerged(payload));
      } catch (e) {
        reject(e instanceof Error ? e : new Error(String(e)));
      }
      return;
    }
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
