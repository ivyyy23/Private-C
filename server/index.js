import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

let getTrustExplanation;
let summarizePolicy;
try {
  ({ getTrustExplanation, summarizePolicy } = require("../api/gemini.js"));
} catch (e) {
  console.warn("api/gemini.js load failed:", e.message);
  getTrustExplanation = async ({ heuristicScore }) => ({
    explanation: "Trust analysis is unavailable (server module error).",
  });
  summarizePolicy = async () => ({
    summary: "Privacy policy analysis is unavailable.",
  });
}

const PORT = Number(process.env.PORT || 3847);
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/private_c";
const SKIP_MONGO = process.env.SKIP_MONGO === "1" || process.env.SKIP_MONGO === "true";
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Hosts (comma-separated) to re-fetch privacy policy summaries weekly. */
const POLICY_MONITOR_HOSTS = String(process.env.POLICY_MONITOR_HOSTS || "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

const memoryStore = new Map();
const siteEvalMemory = new Map();
const policyMemory = new Map();

const extensionStateSchema = new mongoose.Schema(
  {
    clientId: { type: String, required: true, unique: true, index: true },
    state: { type: mongoose.Schema.Types.Mixed, required: true },
    email: { type: String, default: "" },
  },
  { timestamps: true }
);

const siteEvaluationSchema = new mongoose.Schema(
  {
    host: { type: String, required: true, unique: true, index: true },
    url: String,
    pageTextSample: String,
    heuristicScore: String,
    explanation: { type: String, required: true },
  },
  { timestamps: true }
);

const policySnapshotSchema = new mongoose.Schema(
  {
    host: { type: String, required: true, unique: true, index: true },
    policyUrl: String,
    summary: String,
    lastCheckedAt: Date,
  },
  { timestamps: true }
);

const ExtensionState =
  mongoose.models.ExtensionState || mongoose.model("ExtensionState", extensionStateSchema);
const SiteEvaluation =
  mongoose.models.SiteEvaluation || mongoose.model("SiteEvaluation", siteEvaluationSchema);
const PolicySnapshot =
  mongoose.models.PolicySnapshot || mongoose.model("PolicySnapshot", policySnapshotSchema);

const app = express();
app.use(
  cors({
    origin: true,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  })
);
app.use(express.json({ limit: "512kb" }));

async function getSiteEvaluation(host) {
  if (SKIP_MONGO) {
    return siteEvalMemory.get(host) ?? null;
  }
  const doc = await SiteEvaluation.findOne({ host }).lean();
  return doc;
}

async function saveSiteEvaluation(host, payload) {
  const row = {
    host,
    url: payload.url || "",
    pageTextSample: String(payload.pageText || "").slice(0, 2000),
    heuristicScore: payload.heuristicScore || "caution",
    explanation: payload.explanation,
  };
  if (SKIP_MONGO) {
    siteEvalMemory.set(host, { ...row, updatedAt: new Date() });
    return;
  }
  await SiteEvaluation.findOneAndUpdate({ host }, row, { upsert: true, new: true });
}

app.get("/health", (_req, res) => {
  if (SKIP_MONGO) {
    return res.json({ ok: true, mongo: "skipped", store: "memory" });
  }
  const ready = mongoose.connection.readyState === 1;
  res.status(ready ? 200 : 503).json({ ok: ready, mongo: ready ? "connected" : "disconnected" });
});

/**
 * Look up cached site trust explanation; if missing, call Gemini and persist to MongoDB.
 */
app.post("/api/site-evaluation", async (req, res) => {
  const host = String(req.body?.host || "").toLowerCase().trim();
  const url = String(req.body?.url || "");
  const pageText = String(req.body?.pageText || "").slice(0, 2000);
  const heuristicScore = String(req.body?.heuristicScore || "caution");
  if (!host) {
    return res.status(400).json({ ok: false, error: "host required" });
  }

  try {
    const existing = await getSiteEvaluation(host);
    if (existing?.explanation) {
      return res.json({
        ok: true,
        cached: true,
        explanation: existing.explanation,
        heuristicScore: existing.heuristicScore || heuristicScore,
      });
    }

    const { explanation } = await getTrustExplanation({ url: url || `https://${host}/`, pageText, heuristicScore });
    await saveSiteEvaluation(host, { url, pageText, heuristicScore, explanation });
    return res.json({ ok: true, cached: false, explanation, heuristicScore });
  } catch (e) {
    console.error("POST /api/site-evaluation", e);
    return res.status(500).json({ ok: false, error: String(e.message || e) });
  }
});

/** Optional read without generating (for dashboards). */
app.get("/api/site-evaluation", async (req, res) => {
  const host = String(req.query.host || "").toLowerCase().trim();
  if (!host) {
    return res.status(400).json({ ok: false, error: "host required" });
  }
  try {
    const existing = await getSiteEvaluation(host);
    if (!existing) {
      return res.status(404).json({ ok: false, error: "not found" });
    }
    return res.json({
      ok: true,
      explanation: existing.explanation,
      heuristicScore: existing.heuristicScore,
      updatedAt: existing.updatedAt,
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e.message || e) });
  }
});

app.get("/api/state", async (req, res) => {
  const clientId = String(req.query.clientId || "").trim();
  if (!clientId) {
    return res.status(400).json({ ok: false, error: "clientId required" });
  }
  try {
    if (SKIP_MONGO) {
      const doc = memoryStore.get(clientId);
      if (!doc) {
        return res.status(404).json({ ok: false, error: "not found" });
      }
      return res.json({ ok: true, state: doc.state, updatedAt: doc.updatedAt });
    }
    const doc = await ExtensionState.findOne({ clientId }).lean();
    if (!doc) {
      return res.status(404).json({ ok: false, error: "not found" });
    }
    return res.json({ ok: true, state: doc.state, updatedAt: doc.updatedAt });
  } catch (e) {
    console.error("GET /api/state", e);
    return res.status(500).json({ ok: false, error: "server error" });
  }
});

app.post("/api/state", async (req, res) => {
  const clientId = String(req.body?.clientId || "").trim();
  const state = req.body?.state;
  if (!clientId || state == null || typeof state !== "object") {
    return res.status(400).json({ ok: false, error: "clientId and state object required" });
  }
  const email = typeof state.account?.email === "string" ? state.account.email : "";
  try {
    if (SKIP_MONGO) {
      memoryStore.set(clientId, { state, email, updatedAt: new Date() });
      return res.json({ ok: true });
    }
    await ExtensionState.findOneAndUpdate(
      { clientId },
      { clientId, state, email },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return res.json({ ok: true });
  } catch (e) {
    console.error("POST /api/state", e);
    return res.status(500).json({ ok: false, error: "server error" });
  }
});

async function savePolicySnapshot(host, policyUrl, summary) {
  const row = { host, policyUrl, summary, lastCheckedAt: new Date() };
  if (SKIP_MONGO) {
    policyMemory.set(host, row);
    return;
  }
  await PolicySnapshot.findOneAndUpdate({ host }, row, { upsert: true, new: true });
}

async function refreshPolicyForHost(host) {
  const policyUrl = `https://${host}/privacy`;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12_000);
    const r = await fetch(policyUrl, { redirect: "follow", signal: ctrl.signal });
    clearTimeout(t);
    if (!r.ok) {
      throw new Error(`HTTP ${r.status}`);
    }
    const html = await r.text();
    const text = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<[^>]+>/g, " ").slice(0, 12000);
    const { summary } = await summarizePolicy(text);
    await savePolicySnapshot(host, policyUrl, summary);
    console.log(`[policy-refresh] ${host} OK`);
  } catch (e) {
    console.warn(`[policy-refresh] ${host} skipped:`, e.message || e);
  }
}

async function runWeeklyPolicyRefresh() {
  if (POLICY_MONITOR_HOSTS.length === 0) {
    console.log("[policy-refresh] POLICY_MONITOR_HOSTS empty — skipping weekly job.");
    return;
  }
  console.log("[policy-refresh] Starting weekly check for", POLICY_MONITOR_HOSTS.length, "host(s).");
  for (const host of POLICY_MONITOR_HOSTS) {
    await refreshPolicyForHost(host);
  }
}

function scheduleWeeklyPolicyJob() {
  setInterval(runWeeklyPolicyRefresh, WEEK_MS);
  setTimeout(runWeeklyPolicyRefresh, 45_000);
}

async function main() {
  if (SKIP_MONGO) {
    console.warn("SKIP_MONGO: using in-memory store (data lost on restart).");
  } else {
    await mongoose.connect(MONGODB_URI);
    console.log("MongoDB connected:", MONGODB_URI.replace(/:[^:@]+@/, ":****@"));
  }

  scheduleWeeklyPolicyJob();

  app.listen(PORT, "127.0.0.1", () => {
    console.log(`Private-C API listening on http://127.0.0.1:${PORT}`);
    console.log("Site evaluations: POST /api/site-evaluation (DB first, then Gemini → save).");
    if (POLICY_MONITOR_HOSTS.length) {
      console.log("Weekly policy refresh hosts:", POLICY_MONITOR_HOSTS.join(", "));
    }
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
