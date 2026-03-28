// 1. TRACKER MONITORING & BLOCKING
// Using declarativeNetRequest to intercept tracking attempts
const rules = [
  {
    "id": 1,
    "priority": 1,
    "action": { "type": "block" },
    "condition": {
      "urlFilter": "doubleclick.net", 
      "resourceTypes": ["script", "image"]
    }
  },
  {
    "id": 2,
    "priority": 1,
    "action": { "type": "block" },
    "condition": {
      "urlFilter": "google-analytics.com",
      "resourceTypes": ["script"]
    }
  }
];

// 2. TRUST SCORE SYSTEM (Base Logic)
const trustDatabase = {
  "google.com": { score: 80, status: "Trusted" },
  "facebook.com": { score: 40, status: "Low Trust - Aggressive Tracking" },
  "unknown": { score: 50, status: "Untrusted/Sandbox Candidate" }
};

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const url = new URL(tab.url);
    const domain = url.hostname;
    const trustInfo = trustDatabase[domain] || trustDatabase["unknown"];

    console.log(`Private-C: Assessing ${domain}. Trust Score: ${trustInfo.score}`);
    
    // Notify Person 2's Gemini Engine or Person 3's UI
    chrome.runtime.sendMessage({
      type: "DOMAIN_ASSESSMENT",
      domain: domain,
      trust: trustInfo
    });
  }
});

// 3. COOKIE MONITORING
chrome.cookies.onChanged.addListener((changeInfo) => {
  if (!changeInfo.removed) {
    console.log(`🔍 Private-C detected new cookie from: ${changeInfo.cookie.domain}`);
    // Check if it's a 3rd party cookie
    if (changeInfo.cookie.sameSite === "no_restriction") {
       console.warn("⚠️ High-risk tracking cookie detected.");
       // Logic to auto-delete if user preference is 'Strict'
    }
  }
});
