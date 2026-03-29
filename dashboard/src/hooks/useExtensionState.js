import { useEffect, useState } from "react";

export function useExtensionState() {
  const [state, setState] = useState(null);
  const [hasChrome, setHasChrome] = useState(false);

  useEffect(() => {
    if (typeof chrome === "undefined" || !chrome.storage?.local) {
      setHasChrome(false);
      setState(null);
      return;
    }

    setHasChrome(true);

    chrome.storage.local.get("privateCState", (r) => {
      if (chrome.runtime?.lastError) {
        setState(null);
        return;
      }
      setState(r.privateCState ?? null);
    });

    const onChange = (changes, area) => {
      if (area === "local" && changes.privateCState) {
        setState(changes.privateCState.newValue ?? null);
      }
    };
    chrome.storage.onChanged.addListener(onChange);
    return () => chrome.storage.onChanged.removeListener(onChange);
  }, []);

  return { state, hasChrome };
}
