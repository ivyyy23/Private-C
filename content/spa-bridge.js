/**
 * document_start: detect SPA navigations (pushState / replaceState / popstate).
 * Background re-applies DNR + asks content to revalidate scans without full reload.
 */
(function privateCSpaBridge() {
  function notify() {
    try {
      chrome.runtime.sendMessage({
        type: "PRIVATE_C_SPA_NAV",
        payload: { href: location.href, host: location.hostname },
      });
    } catch {
      /* extension context invalid */
    }
  }

  const wrap = (fn) =>
    function patched() {
      const ret = fn.apply(this, arguments);
      queueMicrotask(notify);
      return ret;
    };

  history.pushState = wrap(history.pushState);
  history.replaceState = wrap(history.replaceState);
  window.addEventListener("popstate", () => queueMicrotask(notify), false);
})();
