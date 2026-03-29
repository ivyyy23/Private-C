(function () {
  const setupUrl = chrome.runtime.getURL("dashboard/dist/index.html#/auth/login");
  const link = document.getElementById("continue");
  if (link) {
    link.href = setupUrl;
  }
  location.replace(setupUrl);
})();
