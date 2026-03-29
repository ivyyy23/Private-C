// =============================================================================
// CloakAI — Gemini API Integration Layer
// =============================================================================
// This module provides three AI-powered functions using the Google Gemini API:
//   1. getTrustExplanation  — explains a site's trust score
//   2. summarizePolicy      — summarizes privacy policy risks
//   3. detectPhishing       — assesses phishing risk on login pages
//
// All responses are max 2 sentences, plain language, valid JSON.
// On API or parse failure, functions throw — callers must handle (no fake “AI” text).
// =============================================================================

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Read at call time so `dotenv` / env injection applies before first request. */
function getGeminiApiKey() {
  return typeof process !== "undefined" && process.env?.GEMINI_API_KEY
    ? String(process.env.GEMINI_API_KEY).trim()
    : "";
}

function getGeminiModel() {
  return (
    (typeof process !== "undefined" && process.env?.GEMINI_MODEL && String(process.env.GEMINI_MODEL).trim()) ||
    "gemini-2.0-flash"
  );
}

function getGeminiEndpoint() {
  const model = getGeminiModel();
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
}

// ---------------------------------------------------------------------------
// Internal: call Gemini API
// ---------------------------------------------------------------------------

/**
 * Sends a prompt to the Gemini API and returns the raw text response.
 * @param {string} prompt - The full prompt to send.
 * @returns {Promise<string>} The model's text response.
 * @throws Will throw on network / API errors.
 */
async function callGemini(prompt) {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set. Please configure your API key.");
  }

  const response = await fetch(`${getGeminiEndpoint()}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 256,
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errorBody}`);
  }

  const data = await response.json();

  const text =
    data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Gemini returned an empty or malformed response.");
  }

  return text.trim();
}

// ---------------------------------------------------------------------------
// Internal: parse JSON from Gemini text (handles markdown fences)
// ---------------------------------------------------------------------------

/**
 * Extracts and parses a JSON object from a Gemini response string.
 * Handles responses wrapped in ```json ... ``` code fences.
 * @param {string} raw - Raw text from the model.
 * @returns {object} Parsed JSON object.
 */
function parseJSON(raw) {
  // Strip markdown code fences if present
  let cleaned = raw.replace(/```json\s*/gi, "").replace(/```/g, "").trim();

  // Try to extract the first JSON object
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    cleaned = cleaned.substring(start, end + 1);
  }

  return JSON.parse(cleaned);
}

// =============================================================================
// 1. Trust Score Explanation
// =============================================================================

/**
 * Generates a plain-language explanation for a website's trust score.
 *
 * @param {object} input
 * @param {string} input.url          - The URL being evaluated.
 * @param {string} input.pageText     - A short excerpt of visible page text.
 * @param {string} input.heuristicScore - One of "safe", "caution", or "risky".
 * @returns {Promise<{explanation: string}>}
 *
 * @example
 * const result = await getTrustExplanation({
 *   url: "http://free-prizes-win.xyz/claim",
 *   pageText: "Congratulations! You've won a $1000 gift card. Click here now!",
 *   heuristicScore: "risky"
 * });
 * // { explanation: "This site uses an unfamiliar domain and urgent prize-claim language, which are common signs of a scam." }
 */
async function getTrustExplanation(input) {
  const { url, pageText, heuristicScore } = input;

  const prompt = `You are a browser privacy assistant. A website has been scored as "${heuristicScore}" by heuristic analysis.

Website URL: ${url}
Page excerpt: "${pageText}"
Heuristic score: ${heuristicScore}

Explain in 1–2 short sentences why this site received this score. Use simple, non-technical language that any user can understand.

Respond ONLY with a valid JSON object in this exact format (no extra text):
{"explanation": "your explanation here"}`;

  const raw = await callGemini(prompt);
  const parsed = parseJSON(raw);

  if (typeof parsed.explanation !== "string" || !parsed.explanation) {
    throw new Error("Missing 'explanation' field in response.");
  }
  return { explanation: parsed.explanation };
}

// =============================================================================
// 2. Privacy Policy Summarizer
// =============================================================================

/**
 * Summarizes a privacy policy, highlighting key risks like data sharing,
 * tracking, and retention.
 *
 * @param {string} text - Trimmed privacy policy text (relevant sections only).
 * @returns {Promise<{summary: string}>}
 *
 * @example
 * const result = await summarizePolicy(
 *   "We collect your browsing data, purchase history, and location. " +
 *   "This data is shared with advertising partners and retained for 5 years."
 * );
 * // { summary: "This policy allows your browsing and location data to be shared with advertisers and kept for up to 5 years." }
 */
async function summarizePolicy(text) {
  const prompt = `You are a privacy policy analyst. Summarize the following privacy policy excerpt in 1–2 short sentences. Focus ONLY on:
- data sharing with third parties
- tracking practices
- data retention periods

Use simple, non-technical language.

Privacy policy text:
"${text}"

Respond ONLY with a valid JSON object in this exact format (no extra text):
{"summary": "your summary here"}`;

  const raw = await callGemini(prompt);
  const parsed = parseJSON(raw);

  if (typeof parsed.summary !== "string" || !parsed.summary) {
    throw new Error("Missing 'summary' field in response.");
  }
  return { summary: parsed.summary };
}

// =============================================================================
// 3. Phishing / Login Detection
// =============================================================================

/**
 * Assesses the phishing risk of a login form.
 *
 * @param {object} input
 * @param {string}  input.domain       - The domain hosting the form.
 * @param {object}  input.formFields   - Detected form fields.
 * @param {boolean} input.formFields.hasEmail    - Whether an email input exists.
 * @param {boolean} input.formFields.hasPassword - Whether a password input exists.
 * @param {string}  input.nearbyText   - Visible text near the form (labels, buttons).
 * @returns {Promise<{risk: "low"|"medium"|"high", message: string}>}
 *
 * @example
 * const result = await detectPhishing({
 *   domain: "g00gle-login.tk",
 *   formFields: { hasEmail: true, hasPassword: true },
 *   nearbyText: "Verify your Google account immediately or it will be suspended"
 * });
 * // { risk: "high", message: "This login page mimics Google but uses a suspicious domain. Do not enter your credentials." }
 */
async function detectPhishing(input) {
  const { domain, formFields, nearbyText } = input;

  const prompt = `You are a cybersecurity assistant. Analyze this login page for phishing risk.

Domain: ${domain}
Form fields present: email=${formFields?.hasEmail ?? false}, password=${formFields?.hasPassword ?? false}
Nearby visible text: "${nearbyText}"

Classify the risk as exactly one of: "low", "medium", or "high".
Then provide a short warning message (1–2 sentences, simple language).

Respond ONLY with a valid JSON object in this exact format (no extra text):
{"risk": "low or medium or high", "message": "your warning here"}`;

  const raw = await callGemini(prompt);
  const parsed = parseJSON(raw);

  const validRisks = ["low", "medium", "high"];
  if (!validRisks.includes(parsed.risk)) {
    throw new Error(`Invalid risk value: ${parsed.risk}`);
  }
  if (typeof parsed.message !== "string" || !parsed.message) {
    throw new Error("Missing 'message' field in response.");
  }

  return { risk: parsed.risk, message: parsed.message };
}

// =============================================================================
// Exports
// =============================================================================

// Works in both Node.js (CommonJS) and browser extension (ES module) contexts
if (typeof module !== "undefined" && module.exports) {
  module.exports = { getTrustExplanation, summarizePolicy, detectPhishing };
}
