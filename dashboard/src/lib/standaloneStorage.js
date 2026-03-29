/** Vite env: set VITE_STANDALONE_DASHBOARD=true for presentation / dev without the extension. */
export function isStandaloneDashboard() {
  return import.meta.env?.VITE_STANDALONE_DASHBOARD === "true";
}

export const STANDALONE_STATE_KEY = "privateCStandaloneState";

export function notifyStandaloneMutate() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("privatec-standalone-mutate"));
}
