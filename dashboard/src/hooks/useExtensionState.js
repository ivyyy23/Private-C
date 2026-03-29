import { useEffect, useState } from "react";

function enrichPrivateCState(raw) {
  if (!raw || typeof raw !== "object") return null;
  return {
    ...raw,
    allowAllTrackingByHost: { ...(raw.allowAllTrackingByHost || {}) },
    firstVisitDecided: { ...(raw.firstVisitDecided || {}) },
  };
}

export function useExtensionState() {
  const [state, setState] = useState(null);
  const [hasChrome, setHasChrome] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
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
