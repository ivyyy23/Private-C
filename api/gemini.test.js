// =============================================================================
// CloakAI — Gemini API Integration Tests & Examples
// =============================================================================
// Run: node api/gemini.test.js
//
// Set GEMINI_API_KEY before running:
//   Windows:  set GEMINI_API_KEY=your-key-here
//   Mac/Linux: export GEMINI_API_KEY=your-key-here
//
// Requires GEMINI_API_KEY in the environment; without it, calls throw (no simulated output).
// =============================================================================

const { getTrustExplanation, summarizePolicy, detectPhishing } = require("./gemini.js");

// ---------------------------------------------------------------------------
// Example inputs
// ---------------------------------------------------------------------------

const trustInputSafe = {
  url: "https://www.google.com",
  pageText: "Search the world's information, including webpages, images, videos and more.",
  heuristicScore: "safe",
};

const trustInputRisky = {
  url: "http://free-prizes-win.xyz/claim",
  pageText: "Congratulations! You've won a $1000 gift card. Click here now!",
  heuristicScore: "risky",
};

const trustInputCaution = {
  url: "http://my-store-deals.net/checkout",
  pageText: "Enter your credit card details to complete your purchase. Limited time offer!",
  heuristicScore: "caution",
};

const policyTextDataSharing =
  "We collect your browsing data, purchase history, and location. " +
  "This data is shared with advertising partners and retained for 5 years. " +
  "Third-party cookies are used to track your activity across websites.";

const policyTextMinimal =
  "We only collect your email address to send you account notifications. " +
  "We do not share your data with third parties. Data is deleted upon account closure.";

const phishingInputHigh = {
  domain: "g00gle-login.tk",
  formFields: { hasEmail: true, hasPassword: true },
  nearbyText: "Verify your Google account immediately or it will be suspended",
};

const phishingInputLow = {
  domain: "accounts.google.com",
  formFields: { hasEmail: true, hasPassword: true },
  nearbyText: "Sign in to your Google Account",
};

const phishingInputMedium = {
  domain: "login.secure-banking123.com",
  formFields: { hasEmail: true, hasPassword: true },
  nearbyText: "Enter your bank credentials to continue",
};

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

async function runTests() {
  console.log("=".repeat(70));
  console.log("  CloakAI — Gemini Integration Test Suite");
  console.log("=".repeat(70));
  console.log();

  // --- Trust Score Explanation ---
  console.log("─── 1. getTrustExplanation ───");
  console.log();

  for (const [label, input] of [
    ["Safe site", trustInputSafe],
    ["Risky site", trustInputRisky],
    ["Caution site", trustInputCaution],
  ]) {
    console.log(`[${label}] Input:`, JSON.stringify(input, null, 2));
    const result = await getTrustExplanation(input);
    console.log(`[${label}] Output:`, JSON.stringify(result, null, 2));
    console.log();
  }

  // --- Privacy Policy Summarizer ---
  console.log("─── 2. summarizePolicy ───");
  console.log();

  for (const [label, text] of [
    ["Data-heavy policy", policyTextDataSharing],
    ["Minimal policy", policyTextMinimal],
  ]) {
    console.log(`[${label}] Input: "${text.substring(0, 80)}..."`);
    const result = await summarizePolicy(text);
    console.log(`[${label}] Output:`, JSON.stringify(result, null, 2));
    console.log();
  }

  // --- Phishing Detection ---
  console.log("─── 3. detectPhishing ───");
  console.log();

  for (const [label, input] of [
    ["High risk (phishing)", phishingInputHigh],
    ["Low risk (legitimate)", phishingInputLow],
    ["Medium risk (suspicious)", phishingInputMedium],
  ]) {
    console.log(`[${label}] Input:`, JSON.stringify(input, null, 2));
    const result = await detectPhishing(input);
    console.log(`[${label}] Output:`, JSON.stringify(result, null, 2));
    console.log();
  }

  console.log("=".repeat(70));
  console.log("  All tests complete.");
  console.log("=".repeat(70));
}

runTests().catch((err) => {
  console.error("Test runner failed:", err);
  process.exit(1);
});
