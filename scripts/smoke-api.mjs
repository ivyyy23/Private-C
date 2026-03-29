/**
 * Starts the API briefly with SKIP_MONGO=1, hits /health and POST /api/site-evaluation, then exits.
 * Run from repo root: node scripts/smoke-api.mjs
 * Optional: SMOKE_PORT=39501 to avoid conflicts with a dev server on 3847.
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverDir = path.join(__dirname, "..", "server");
/** Avoid clashing with a dev server on 3847: use random port unless SMOKE_PORT is set. */
const port = String(
  process.env.SMOKE_PORT || 38470 + Math.floor(Math.random() * 900)
);

/** When unset, GEMINI_API_KEY is cleared for the child so site-evaluation must fail closed (no fake AI). Set SMOKE_REQUIRE_GEMINI=1 to use your real key from the environment. */
const smokeUsesGemini = process.env.SMOKE_REQUIRE_GEMINI === "1";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForHealth(maxMs = 20_000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/health`);
      if (r.ok) return r.json();
    } catch {
      /* not up yet */
    }
    await sleep(150);
  }
  throw new Error(`Server on port ${port} did not respond in time`);
}

const child = spawn("node", ["index.js"], {
  cwd: serverDir,
  env: {
    ...process.env,
    SKIP_MONGO: "1",
    PORT: port,
    ...(!smokeUsesGemini ? { GEMINI_API_KEY: "" } : {}),
  },
  stdio: ["ignore", "pipe", "pipe"],
});

let stderr = "";
child.stderr?.on("data", (c) => {
  stderr += String(c);
});

async function main() {
  try {
    const health = await waitForHealth();
    console.log("[smoke] GET /health", health);

    const host = `smoke-${Date.now()}.example.invalid`;
    const evRes = await fetch(`http://127.0.0.1:${port}/api/site-evaluation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        host,
        url: "https://example.com/",
        pageText: "Example Domain",
        heuristicScore: "safe",
      }),
    });
    const body = await evRes.json();
    if (smokeUsesGemini) {
      if (!evRes.ok || !body.ok || typeof body.explanation !== "string" || !body.explanation) {
        throw new Error(`site-evaluation failed: ${evRes.status} ${JSON.stringify(body)}`);
      }
      console.log("[smoke] POST /api/site-evaluation ok", {
        cached: body.cached,
        heuristicScore: body.heuristicScore,
        explanationPreview: body.explanation.slice(0, 80) + (body.explanation.length > 80 ? "…" : ""),
      });
    } else {
      if (evRes.status !== 500 || body.ok !== false) {
        throw new Error(
          `expected 500 without GEMINI_API_KEY (no simulated explanation), got ${evRes.status} ${JSON.stringify(body)}`
        );
      }
      console.log("[smoke] POST /api/site-evaluation correctly rejected without Gemini key");
    }

    const stRes = await fetch(`http://127.0.0.1:${port}/api/state?clientId=smoke-client`);
    const stBody = await stRes.json();
    if (stRes.status !== 404 || stBody.ok !== false) {
      throw new Error(`expected 404 for missing state, got ${stRes.status} ${JSON.stringify(stBody)}`);
    }
    console.log("[smoke] GET /api/state (missing) 404 as expected");

    console.log("[smoke] all checks passed");
  } finally {
    child.kill("SIGTERM");
    await sleep(300);
    if (!child.killed) child.kill("SIGKILL");
  }
}

main().catch((err) => {
  console.error("[smoke] failed:", err.message);
  if (stderr.trim()) console.error("[smoke] server stderr:\n", stderr.slice(-2000));
  child.kill("SIGKILL");
  process.exit(1);
});
