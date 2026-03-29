import { useEffect, useState } from "react";

export const TRACKER_LOG_STORAGE_KEY = "privateCTrackerLog";
export const TRACKER_HIT_TOTAL_KEY = "privateCTrackerHitTotal";

/** Live rows from background network observer (chrome.storage.local). */
export function useTrackerLog() {
  const [log, setLog] = useState([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof chrome === "undefined" || !chrome.storage?.local) {
      setHydrated(true);
      return;
    }

    chrome.storage.local.get(TRACKER_LOG_STORAGE_KEY, (r) => {
      if (chrome.runtime?.lastError) {
        setLog([]);
        setHydrated(true);
        return;
      }
      setLog(Array.isArray(r[TRACKER_LOG_STORAGE_KEY]) ? r[TRACKER_LOG_STORAGE_KEY] : []);
      setHydrated(true);
    });

    const onChange = (changes, area) => {
      if (area === "local" && changes[TRACKER_LOG_STORAGE_KEY]) {
        setLog(changes[TRACKER_LOG_STORAGE_KEY].newValue || []);
      }
    };
    chrome.storage.onChanged.addListener(onChange);
    return () => chrome.storage.onChanged.removeListener(onChange);
  }, []);

  return { log, hydrated };
}

/** Monotonic count of tracker-classified network requests (all sites). */
export function useTrackerHitTotal() {
  const [total, setTotal] = useState(null);

  useEffect(() => {
    if (typeof chrome === "undefined" || !chrome.storage?.local) {
      setTotal(null);
      return;
    }

    chrome.storage.local.get(TRACKER_HIT_TOTAL_KEY, (r) => {
      if (chrome.runtime?.lastError) {
        setTotal(0);
        return;
      }
      setTotal(typeof r[TRACKER_HIT_TOTAL_KEY] === "number" ? r[TRACKER_HIT_TOTAL_KEY] : 0);
    });

    const onChange = (changes, area) => {
      if (area === "local" && changes[TRACKER_HIT_TOTAL_KEY]) {
        const v = changes[TRACKER_HIT_TOTAL_KEY].newValue;
        setTotal(typeof v === "number" ? v : 0);
      }
    };
    chrome.storage.onChanged.addListener(onChange);
    return () => chrome.storage.onChanged.removeListener(onChange);
  }, []);

  return total;
}
