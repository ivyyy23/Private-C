import { useEffect, useState } from "react";
import { isStandaloneDashboard, STANDALONE_STATE_KEY } from "../lib/standaloneStorage.js";

function enrichPrivateCState(raw) {
  if (!raw || typeof raw !== "object") return null;
  return {
    ...raw,
    allowAllTrackingByHost: { ...(raw.allowAllTrackingByHost || {}) },
    firstVisitDecided: { ...(raw.firstVisitDecided || {}) },
  };
}

function readStandaloneState() {
  try {
    const s = localStorage.getItem(STANDALONE_STATE_KEY);
    return enrichPrivateCState(s ? JSON.parse(s) : null);
  } catch {
    return null;
  }
}

export function useExtensionState() {
  const [state, setState] = useState(null);
  const [hasChrome, setHasChrome] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (isStandaloneDashboard()) {
      setHasChrome(true);
      setState(readStandaloneState());
      setHydrated(true);
      const onMutate = () => setState(readStandaloneState());
      window.addEventListener("privatec-standalone-mutate", onMutate);
      return () => window.removeEventListener("privatec-standalone-mutate", onMutate);
    }

    if (typeof chrome === "undefined" || !chrome.storage?.local) {
      setHasChrome(false);
      setState(null);
      setHydrated(true);
      return;
    }

    setHasChrome(true);

    chrome.storage.local.get("privateCState", (r) => {
      if (chrome.runtime?.lastError) {
        setState(null);
        setHydrated(true);
        return;
      }
      setState(enrichPrivateCState(r.privateCState));
      setHydrated(true);
    });

    const onChange = (changes, area) => {
      if (area === "local" && changes.privateCState) {
        setState(enrichPrivateCState(changes.privateCState.newValue));
      }
    };
    chrome.storage.onChanged.addListener(onChange);
    return () => chrome.storage.onChanged.removeListener(onChange);
  }, []);

  return { state, hasChrome, hydrated };
}
