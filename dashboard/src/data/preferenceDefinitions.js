/** Shared labels + descriptions for protection wizard + Settings › Preferences */

export const PROTECTION_PREFERENCE_ITEMS = [
  {
    key: "siteSecurityAlerts",
    label: "Site Security Alerts",
    description:
      "Surface warnings when a page looks risky (mixed content, suspicious forms, or heuristic flags). Helps you pause before entering data.",
  },
  {
    key: "trackers",
    label: "Trackers",
    description:
      "Monitor and count third-party trackers and pixels. Drives tracker-related stats and can feed alerts when Cookie Cutter-style messaging is enabled.",
  },
  {
    key: "privacyViolations",
    label: "Privacy Violations",
    description:
      "Watch for patterns that suggest privacy-policy gaps or aggressive data collection so they can be highlighted in reports and summaries.",
  },
  {
    key: "screenScrollMonitoring",
    label: "Screen Scroll Monitoring",
    description:
      "Uses scroll depth as a coarse engagement signal for anti-detailing heuristics (e.g. time-in-section), not full screen recording.",
  },
  {
    key: "timeSpentAntiDetailing",
    label: "Time Spent in Section (anti-detailing)",
    description:
      "Correlates dwell time with policy sections to spot dark-pattern layouts that hide important terms below the fold.",
  },
  {
    key: "cookiesBackground",
    label: "Cookies Running in Background",
    description:
      "Tracks long-lived or background cookie activity so silent cross-site profiling shows up in your dashboard counters.",
  },
  {
    key: "backgroundMicrophone",
    label: "Background Microphone Usage",
    description:
      "Raises alerts when the extension detects microphone access that may continue outside an obvious user action (site-dependent).",
  },
  {
    key: "backgroundCamera",
    label: "Background Camera Usage",
    description:
      "Same idea as microphone: flag camera use that looks unexpected so you can verify it in the tab’s permission UI.",
  },
  {
    key: "hiddenBackgroundTasks",
    label: "Hidden Background Tasks",
    description:
      "Looks for workers, beacons, or pings that keep running after navigation—common for fingerprinting and session replay.",
  },
];

/** Legacy stats / monitoring categories (popup + background ticks) */
export const LEGACY_DATA_CATEGORY_ITEMS = [
  {
    key: "cookies",
    label: "Cookie tracking",
    description:
      "Include cookie-based tracking in rolled-up privacy stats and server sync. Turning off reduces cookie-flavoured signals only.",
  },
  {
    key: "location",
    label: "Location leakage",
    description:
      "Watch for geolocation APIs, coarse IP-inferred location hooks, and related data in page scripts for your aggregate risk view.",
  },
  {
    key: "financial",
    label: "Financial data",
    description:
      "Emphasises detection of payment fields, banking scripts, or finance-related third parties in the monitoring mix.",
  },
  {
    key: "health",
    label: "Health signals",
    description:
      "Treats health-adjacent keywords and wellness trackers as higher-sensitivity for alerts and policy summaries.",
  },
  {
    key: "identity",
    label: "Identity markers",
    description:
      "Focuses on email, SSO, and account-linking scripts that can build a cross-site identity graph.",
  },
  {
    key: "social",
    label: "Social profiling",
    description:
      "Includes social widgets, share buttons, and social-login SDKs in the categories that increment dashboard activity.",
  },
];

export const NOTIFICATION_PREFERENCE_ITEMS = [
  {
    key: "trackerPopupAlerts",
    label: "Tracker Popup Alerts",
    description:
      "Show in-page or extension-style popups when notable trackers are blocked or intercepted on the active tab.",
  },
  {
    key: "cookieCutterAlerts",
    label: "Cookies Alerts (“Cookie Cutter”)",
    description:
      "Enables the Cookie Cutter voice line for cookie-wall and aggressive cookie scenarios (uses your audio / TTS settings).",
  },
  {
    key: "siteRiskAlerts",
    label: "Site Risk Alerts",
    description:
      "Triggers site-risk warnings and optional spoken summaries when a domain matches threat heuristics or blocklists.",
  },
  {
    key: "cameraMicrophoneAlerts",
    label: "Camera / Microphone Alerts",
    description:
      "Notify when camera or microphone access is requested or active so you can confirm it matches what you expect.",
  },
  {
    key: "backgroundTaskAlerts",
    label: "Background Task Alerts",
    description:
      "Alerts for persistent workers, sendBeacon bursts, or other background traffic that may outlive the visible page.",
  },
  {
    key: "privacyPolicySummaryAlerts",
    label: "Privacy Policy Summary Alerts",
    description:
      "When available, surfaces short plain-language policy highlights (e.g. via Gemini) instead of only raw policy text.",
  },
];
