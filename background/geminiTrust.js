/**
 * Gemini trust explanation — aligned with repo `api/gemini.js` (getTrustExplanation).
 * Loaded via importScripts from the service worker.
 */

function privateCGeminiParseJSON(raw) {
  let cleaned = String(raw).replace(/```json\s*/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    cleaned = cleaned.substring(start, end + 1);
  }
  return JSON.parse(cleaned);
}

function privateCGeminiFallbackTrust(heuristicScore) {
  const messages = {
    safe: "This site appears to be safe based on its domain and content.",
    caution:
      "This site has some characteristics that suggest you should be cautious before sharing personal information.",
    risky:
      "This site shows multiple warning signs that could indicate it is unsafe. Avoid entering personal data.",
  };
  return {
    explanation:
      messages[heuristicScore] ||
      "We couldn't fully analyze this site. Proceed with caution.",
  };
}

async function privateCGeminiGetTrustExplanation(apiKey, input) {
  const { url, pageText, heuristicScore } = input;
  const prompt = `You are a browser privacy assistant. A website has been scored as "${heuristicScore}" by heuristic analysis.

Website URL: ${url}
Page excerpt: "${pageText}"
Heuristic score: ${heuristicScore}

Explain in 1–2 short sentences why this site received this score. Use simple, non-technical language that any user can understand.

Respond ONLY with a valid JSON object in this exact format (no extra text):
{"explanation": "your explanation here"}`;

  const model = "gemini-2.0-flash";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const response = await fetch(`${endpoint}?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 256 },
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errBody}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Gemini returned an empty or malformed response.");
  }

  const parsed = privateCGeminiParseJSON(text.trim());
  if (typeof parsed.explanation !== "string" || !parsed.explanation) {
    throw new Error("Missing 'explanation' field in response.");
  }
  return { explanation: parsed.explanation };
}
