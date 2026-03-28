// 3.3 LOGIN / PHISHING DETECTION
function detectSensitiveFields() {
  const passwordFields = document.querySelectorAll('input[type="password"]');
  const emailFields = document.querySelectorAll('input[type="email"], input[name*="user"], input[name*="login"]');

  if (passwordFields.length > 0) {
    console.log("🛡️ Private-C: Login detected. Monitoring data flow...");
    
    // Highlight or label fields (Visual Feedback)
    passwordFields.forEach(field => {
      field.style.border = "2px solid #00ff00"; // Private-C Green
    });
  }
}

// Run detection
detectSensitiveFields();

// Monitor for dynamic forms
const observer = new MutationObserver(detectSensitiveFields);
observer.observe(document.body, { childList: true, subtree: true });