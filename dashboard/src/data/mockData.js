// ─── Mock data layer ────────────────────────────────────────────────
// Replace individual arrays below with live API / WebSocket feeds.
// Each exported constant maps 1-to-1 to a future REST endpoint:
//   blocked_sites   → GET /api/v1/blocked-sites
//   tracker_activity → GET /api/v1/trackers
//   login_alerts    → GET /api/v1/login-alerts
//   privacy_reports → GET /api/v1/privacy-reports
//   daily_activity  → GET /api/v1/stats/daily
// ────────────────────────────────────────────────────────────────────

export const blocked_sites = [
  {
    id: "bs-001",
    url: "track-metrics.io",
    reason: "tracker-heavy",
    risk_level: "high",
    timestamp: "2026-03-28T10:43:00",
    action: "blocked",
    plain_reason: "This site is loaded with invisible tracking scripts that follow you across the web.",
    technical_reason: "37 third-party tracker domains identified including Google Tag Manager, DoubleClick, and Hotjar session recording.",
    recommendation: "Avoid this site or use a dedicated private browser window if you must visit."
  },
  {
    id: "bs-002",
    url: "suspicious-login.net",
    reason: "phishing suspicion",
    risk_level: "critical",
    timestamp: "2026-03-28T14:12:00",
    action: "blocked",
    plain_reason: "This site looks like it is trying to steal your login credentials.",
    technical_reason: "Domain registered 4 days ago. Login form submits to an off-site endpoint. SSL certificate mismatch detected.",
    recommendation: "Do not enter any personal information. Close this tab immediately."
  },
  {
    id: "bs-003",
    url: "news-daily-feeds.com",
    reason: "cookie wall",
    risk_level: "medium",
    timestamp: "2026-03-28T09:14:00",
    action: "blocked",
    plain_reason: "This site forces you to accept extensive tracking cookies before letting you read an article.",
    technical_reason: "GDPR non-compliant consent barrier. 22 consent purposes bundled under a single 'Accept All' button.",
    recommendation: "Request the article through a cached reader such as Outline or archive.ph."
  },
  {
    id: "bs-004",
    url: "adnet-gateway.com",
    reason: "ad network tracker",
    risk_level: "high",
    timestamp: "2026-03-28T11:55:00",
    action: "blocked",
    plain_reason: "This domain is used by ad networks to profile your behaviour.",
    technical_reason: "Known ad network CDN. Serves fingerprinting canvas scripts. Participates in real-time bidding data harvest.",
    recommendation: "Private-C has already blocked the request. No action needed."
  },
  {
    id: "bs-005",
    url: "databroker-api.net",
    reason: "data broker",
    risk_level: "critical",
    timestamp: "2026-03-27T18:30:00",
    action: "blocked",
    plain_reason: "This is a data broker that sells personal information about you without consent.",
    technical_reason: "Domain listed in data broker registries. Collects compiled profiles including name, address, and financial history.",
    recommendation: "Submit an opt-out request to this data broker using a service like DeleteMe."
  },
  {
    id: "bs-006",
    url: "analytics-cdn.io",
    reason: "fingerprinting script",
    risk_level: "medium",
    timestamp: "2026-03-27T16:05:00",
    action: "blocked",
    plain_reason: "This service identifies your browser without placing a cookie.",
    technical_reason: "Canvas fingerprinting and WebGL entropy collection detected. Used to build a persistent device identifier.",
    recommendation: "Private-C blocked the script. Consider using Firefox with resistFingerprinting enabled."
  },
];

export const tracker_activity = [
  {
    id: "ta-001",
    tracker_domain: "doubleclick.net",
    source_site: "cnn.com",
    category: "ad network",
    action: "blocked",
    timestamp: "2026-03-28T09:02:00",
    plain_reason: "Google DoubleClick tracks your ad interactions across thousands of websites.",
    technical_reason: "Third-party request to doubleclick.net containing cookie sync parameters matching your browser profile.",
    recommendation: "Private-C blocked this automatically. No action needed."
  },
  {
    id: "ta-002",
    tracker_domain: "hotjar.com",
    source_site: "shopify-store.example",
    category: "session recording",
    action: "blocked",
    timestamp: "2026-03-28T10:17:00",
    plain_reason: "Hotjar records every mouse move and keystroke you make on a page.",
    technical_reason: "Session replay script initialised. Records DOM events, scroll positions, and form input (including passwords if poorly implemented).",
    recommendation: "Always blocked by Private-C. Ask the site owner to anonymise session data."
  },
  {
    id: "ta-003",
    tracker_domain: "facebook.net",
    source_site: "buzzfeed.com",
    category: "social tracker",
    action: "blocked",
    timestamp: "2026-03-28T11:44:00",
    plain_reason: "Facebook knows which articles you read even when you are not on Facebook.",
    technical_reason: "Meta Pixel loaded via facebook.net. Sends page URL, referrer, and hashed email if logged in.",
    recommendation: "Private-C blocked this. Log out of Facebook in other tabs for stronger protection."
  },
  {
    id: "ta-004",
    tracker_domain: "fingerprintjs.com",
    source_site: "checkout-portal.io",
    category: "fingerprinting",
    action: "blocked",
    timestamp: "2026-03-28T13:29:00",
    plain_reason: "This script builds a fingerprint of your device to identify you without cookies.",
    technical_reason: "FingerprintJS Pro detected. Collects 50+ browser signals. Returns a visitorId tied to your device.",
    recommendation: "High-risk. Avoid financial transactions on this site until they remove this script."
  },
  {
    id: "ta-005",
    tracker_domain: "criteo.com",
    source_site: "amazon.com",
    category: "retargeting",
    action: "blocked",
    timestamp: "2026-03-28T15:00:00",
    plain_reason: "Criteo shows you ads for products you viewed for days after you leave a site.",
    technical_reason: "Criteo OneTag pixel fired on product page. Syncs purchase intent data with 20,000+ publisher network.",
    recommendation: "Routine retargeting — blocked by Private-C."
  },
];

export const login_alerts = [
  {
    id: "la-001",
    site: "secure-bank-verify.com",
    risk: "phishing",
    risk_level: "critical",
    recommendation: "Do not log in. This domain mimics a real banking site.",
    timestamp: "2026-03-28T08:55:00",
    plain_reason: "This site pretends to be your bank but is actually a phishing page.",
    technical_reason: "Domain registered 6 days ago. Visual clone of FirstNational Bank login portal. DMARC fails. No match in banking domain registry.",
    detail: "Suspicious domain similarity"
  },
  {
    id: "la-002",
    site: "myaccount-google.info",
    risk: "domain spoofing",
    risk_level: "critical",
    recommendation: "Go to google.com directly. This domain is not affiliated with Google.",
    timestamp: "2026-03-28T10:05:00",
    plain_reason: "This is not Google. It uses a similar name to trick you into entering your password.",
    technical_reason: "Lookalike domain using TLD substitution. Levenshtein distance of 3 from google.com. No SPF record.",
    detail: "Suspicious domain similarity"
  },
  {
    id: "la-003",
    site: "forum-beta.example",
    risk: "excessive permissions",
    risk_level: "medium",
    recommendation: "Deny camera and microphone access. A forum does not need them.",
    timestamp: "2026-03-28T12:30:00",
    plain_reason: "This site is asking for access to your camera and microphone without a clear reason.",
    technical_reason: "Permission prompt fired for MediaDevices.getUserMedia on a text discussion forum with no video-calling feature.",
    detail: "Excessive permissions request"
  },
  {
    id: "la-004",
    site: "password-manager.app",
    risk: "weak password",
    risk_level: "low",
    recommendation: "Use a password with at least 12 characters, numbers, and symbols.",
    timestamp: "2026-03-28T13:45:00",
    plain_reason: "The password you entered is very easy for attackers to guess.",
    technical_reason: "Entropy analysis: 18 bits. Top-100 common password list match. No uppercase or special character.",
    detail: "Weak password warning"
  },
  {
    id: "la-005",
    site: "oauth-redirect.net",
    risk: "open redirect",
    risk_level: "high",
    recommendation: "Do not click 'Authorize'. The redirect target is not trustworthy.",
    timestamp: "2026-03-28T14:58:00",
    plain_reason: "An OAuth login is trying to send your access token to an untrusted app.",
    technical_reason: "OAuth 'redirect_uri' points to a domain not registered with the authorization server. Classic open-redirect token theft.",
    detail: "Suspicious OAuth redirect"
  },
];

export const privacy_reports = [
  {
    id: "pr-001",
    site: "facebook.com",
    privacy_score: 12,
    trackers: 48,
    risky_policies: ["sells data to advertisers", "indefinite data retention", "facial recognition opt-out required"],
    plain_reason: "Facebook collects more data about you than almost any other company on the internet.",
    technical_reason: "76 data fields collected per user. Graph API shares data with 3rd-party apps by default. No right-to-erasure for derived data.",
    recommendation: "Limit time on Facebook. Use a dedicated browser profile. Regularly audit app permissions."
  },
  {
    id: "pr-002",
    site: "tiktok.com",
    privacy_score: 18,
    trackers: 39,
    risky_policies: ["clipboard access", "keylogger-like telemetry", "transfers data to foreign servers"],
    plain_reason: "TikTok collects clipboard contents and extensive device telemetry.",
    technical_reason: "In-app browser injects JavaScript that monitors keystrokes and form inputs. Clipboard read triggered on every app open.",
    recommendation: "Avoid using TikTok on a device with sensitive data. Never log into other services from within TikTok's browser."
  },
  {
    id: "pr-003",
    site: "gmail.com",
    privacy_score: 55,
    trackers: 14,
    risky_policies: ["email scanning for ads", "cross-product data sharing"],
    plain_reason: "Google reads your emails to improve ad targeting across all its products.",
    technical_reason: "ML models trained on email content. Data shared across Workspace, Search, YouTube, and Display Networks.",
    recommendation: "Consider ProtonMail or Tutanota for sensitive communications."
  },
  {
    id: "pr-004",
    site: "amazon.com",
    privacy_score: 47,
    trackers: 22,
    risky_policies: ["purchase history profiling", "voice data from Alexa", "third-party seller data sharing"],
    plain_reason: "Amazon builds detailed purchase and browsing profiles used for ads and sold to third parties.",
    technical_reason: "Unified ID2.0 participant. Alexa voice logs retained 18 months by default. IMDb, Twitch, Whole Foods data merged.",
    recommendation: "Opt out of interest-based ads in Amazon Account settings. Delete Alexa voice history periodically."
  },
  {
    id: "pr-005",
    site: "reddit.com",
    privacy_score: 61,
    trackers: 8,
    risky_policies: ["sells aggregate data", "IP logging"],
    plain_reason: "Reddit sells anonymised browsing data and logs your IP address for all posts.",
    technical_reason: "LogRocket session recording deployed on logged-in pages. Advertising API includes interest segments derived from subreddit history.",
    recommendation: "Browse Reddit in a private window or use old.reddit.com which loads fewer trackers."
  },
];

export const daily_activity = [
  { day: "Mon", blocked: 14, trackers: 31, alerts: 2 },
  { day: "Tue", blocked: 21, trackers: 44, alerts: 4 },
  { day: "Wed", blocked: 9,  trackers: 22, alerts: 1 },
  { day: "Thu", blocked: 28, trackers: 57, alerts: 6 },
  { day: "Fri", blocked: 18, trackers: 38, alerts: 3 },
  { day: "Sat", blocked: 7,  trackers: 15, alerts: 1 },
  { day: "Sun", blocked: 11, trackers: 29, alerts: 2 },
];

export const top_domains = [
  { domain: "doubleclick.net", count: 89 },
  { domain: "facebook.net",    count: 64 },
  { domain: "hotjar.com",      count: 47 },
  { domain: "criteo.com",      count: 38 },
  { domain: "analytics-cdn.io",count: 31 },
];

export const summary_stats = {
  total_blocked_sites: blocked_sites.length,
  total_blocked_trackers: tracker_activity.length,
  total_login_alerts: login_alerts.length,
  privacy_alerts_today: 8,
};

export const recent_activity = [
  { id: 1, text: "facebook.com — tracker blocked (Meta Pixel)", time: "2m ago",  type: "tracker" },
  { id: 2, text: "suspicious-login.net — site blocked (phishing)", time: "18m ago", type: "blocked" },
  { id: 3, text: "news-daily-feeds.com — cookie wall blocked", time: "44m ago", type: "cookie" },
  { id: 4, text: "Risky login attempt detected on oauth-redirect.net", time: "1h ago",  type: "login" },
  { id: 5, text: "fingerprintjs.com — fingerprinting script blocked", time: "2h ago",  type: "tracker" },
  { id: 6, text: "databroker-api.net — data broker blocked", time: "3h ago",  type: "blocked" },
];
