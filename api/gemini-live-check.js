/**
 * Optional live call to Google Generative Language API.
 * Loads server/.env via dotenv (see npm script test:gemini-live).
 * Exits 0 if GEMINI_API_KEY is unset (skipped). Exits 0 on success, 1 on API error.
 */
const path = require("path");

function loadEnv() {
  try {
    require("dotenv").config({
      path: path.join(__dirname, "../server/.env"),
    });
  } catch {
    /* dotenv may be missing if script run standalone */
  }
}

loadEnv();

async function main() {
  const key = String(process.env.GEMINI_API_KEY || "").trim();
  if (!key) {
    console.log("GEMINI_API_KEY not set in server/.env — skipping live Gemini check (exit 0).");
    process.exit(0);
  }

  const model =
    String(process.env.GEMINI_MODEL || "").trim() || "gemini-2.0-flash";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

  const r = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: 'Reply with only valid JSON, no markdown: {"pong":true}' }],
        },
      ],
      generationConfig: { maxOutputTokens: 64, temperature: 0 },
    }),
  });

  const raw = await r.text();
  if (!r.ok) {
    console.error("Gemini API error:", r.status, raw.slice(0, 800));
    process.exit(1);
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    console.error("Invalid JSON from API:", raw.slice(0, 400));
    process.exit(1);
  }

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text || !String(text).toLowerCase().includes("pong")) {
    console.error("Unexpected model output:", String(text).slice(0, 200));
    process.exit(1);
  }

  console.log("Live Gemini check OK (model:", model + ").");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
