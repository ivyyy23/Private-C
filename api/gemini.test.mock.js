// =============================================================================
// CloakAI — Gemini API Integration Tests (Mocked)
// =============================================================================
// This version mocks all Gemini API calls for safe local testing.
// =============================================================================

const { getTrustExplanation, summarizePolicy, detectPhishing } = require("./gemini.js");

// ---------------------------------------------------------------------------
// Mock Gemini responses
// ---------------------------------------------------------------------------

async function mockGetTrustExplanation(input) {
    switch (input.heuristicScore) {
        case "safe":
            return { explanation: "This site appears safe based on domain and content." };
        case "caution":
            return { explanation: "This site has some characteristics that suggest you should be cautious before sharing personal information." };
        case "risky":
            return { explanation: "This site shows multiple warning signs that could indicate it is unsafe. Avoid entering personal data." };
        default:
            return { explanation: "Site could not be evaluated." };
    }
}

async function mockSummarizePolicy(text) {
    if (text.includes("Third-party cookies") || text.includes("browsing data")) {
        return { summary: "This policy collects and shares personal data with third parties." };
    }
    return { summary: "This policy collects minimal data and does not share with third parties." };
}

async function mockDetectPhishing(input) {
    if (input.domain.includes("tk") || input.nearbyText.toLowerCase().includes("verify")) {
        return { risk: "high", warning: "This site may be phishing. Do not enter sensitive info." };
    } else if (input.domain.includes("secure-banking")) {
        return { risk: "medium", warning: "This site looks suspicious. Be cautious." };
    }
    return { risk: "low", warning: "This site appears legitimate." };
}

// ---------------------------------------------------------------------------
// Override real functions with mocks
// ---------------------------------------------------------------------------

const testAPI = {
    getTrustExplanation: mockGetTrustExplanation,
    summarizePolicy: mockSummarizePolicy,
    detectPhishing: mockDetectPhishing,
};

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

async function runTests() {
    console.log("=".repeat(70));
    console.log("  CloakAI — Gemini Integration Test Suite (Mocked)");
    console.log("=".repeat(70));
    console.log();

    // --- Example inputs ---
    const trustInputs = [
        ["Safe site", { url: "https://www.google.com", pageText: "Search the world's information, including webpages, images, videos and more.", heuristicScore: "safe" }],
        ["Risky site", { url: "http://free-prizes-win.xyz/claim", pageText: "Congratulations! You've won a $1000 gift card. Click here now!", heuristicScore: "risky" }],
        ["Caution site", { url: "http://my-store-deals.net/checkout", pageText: "Enter your credit card details to complete your purchase. Limited time offer!", heuristicScore: "caution" }],
    ];

    const policyInputs = [
        ["Data-heavy policy", "We collect your browsing data, purchase history, and location. This data is shared with advertising partners and retained for 5 years. Third-party cookies are used to track your activity across websites."],
        ["Minimal policy", "We only collect your email address to send you account notifications. We do not share your data with third parties. Data is deleted upon account closure."],
    ];

    const phishingInputs = [
        ["High risk (phishing)", { domain: "g00gle-login.tk", formFields: { hasEmail: true, hasPassword: true }, nearbyText: "Verify your Google account immediately or it will be suspended" }],
        ["Low risk (legitimate)", { domain: "accounts.google.com", formFields: { hasEmail: true, hasPassword: true }, nearbyText: "Sign in to your Google Account" }],
        ["Medium risk (suspicious)", { domain: "login.secure-banking123.com", formFields: { hasEmail: true, hasPassword: true }, nearbyText: "Enter your bank credentials to continue" }],
    ];

    // --- Trust Score ---
    console.log("─── 1. getTrustExplanation ───\n");
    for (const [label, input] of trustInputs) {
        console.log(`[${label}] Input:`, JSON.stringify(input, null, 2));
        const result = await testAPI.getTrustExplanation(input);
        console.log(`[${label}] Output:`, JSON.stringify(result, null, 2), "\n");
    }

    // --- Policy Summarizer ---
    console.log("─── 2. summarizePolicy ───\n");
    for (const [label, text] of policyInputs) {
        console.log(`[${label}] Input: "${text.substring(0, 80)}..."`);
        const result = await testAPI.summarizePolicy(text);
        console.log(`[${label}] Output:`, JSON.stringify(result, null, 2), "\n");
    }

    // --- Phishing Detection ---
    console.log("─── 3. detectPhishing ───\n");
    for (const [label, input] of phishingInputs) {
        console.log(`[${label}] Input:`, JSON.stringify(input, null, 2));
        const result = await testAPI.detectPhishing(input);
        console.log(`[${label}] Output:`, JSON.stringify(result, null, 2), "\n");
    }

    console.log("=".repeat(70));
    console.log("  All tests complete (mocked).");
    console.log("=".repeat(70));
}

runTests().catch((err) => {
    console.error("Test runner failed:", err);
    process.exit(1);
});