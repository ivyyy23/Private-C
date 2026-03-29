#!/usr/bin/env node
/**
 * Seeds MongoDB with demo extension state, site evaluations, policy rows, and a test user.
 *
 * Usage (from repo root):
 *   node scripts/seed-dummy-data.mjs
 *
 * Requires MongoDB and server/.env with MONGODB_URI (or default mongodb://127.0.0.1:27017/private_c).
 * Set SKIP_MONGO=1 is not supported for this script — use a real Mongo instance.
 *
 * Demo login (after seed): demo@private-c.local / DummyPass12345
 */

import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

dotenv.config({ path: path.join(root, "server/.env") });

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/private_c";
const SKIP_MONGO = process.env.SKIP_MONGO === "1" || process.env.SKIP_MONGO === "true";

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
const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    onboardingComplete: { type: Boolean, default: false },
  },
  { timestamps: true }
);

/** Same model names as server/index.js so rows land in extensionstates, siteevaluations, etc. */
function getModel(name, schema) {
  return mongoose.models[name] || mongoose.model(name, schema);
}
const ExtensionState = getModel("ExtensionState", extensionStateSchema);
const SiteEvaluation = getModel("SiteEvaluation", siteEvaluationSchema);
const PolicySnapshot = getModel("PolicySnapshot", policySnapshotSchema);
const PrivateCUser = getModel("PrivateCUser", userSchema);

async function main() {
  if (SKIP_MONGO) {
    console.error("SKIP_MONGO is set — seed script needs a real MongoDB. Unset SKIP_MONGO and ensure MONGODB_URI is correct.");
    process.exit(1);
  }

  const stateJson = await readFile(path.join(root, "data/dummy/extension-state.json"), "utf8");
  const extensionPayload = JSON.parse(stateJson);

  await mongoose.connect(MONGODB_URI);
  console.log("Connected:", MONGODB_URI.replace(/:[^:@]+@/, ":****@"));

  const clientId = "demo-client-seed-001";
  await ExtensionState.findOneAndUpdate(
    { clientId },
    {
      clientId,
      email: extensionPayload.account?.email || "demo@private-c.local",
      state: extensionPayload,
    },
    { upsert: true, new: true }
  );
  console.log("Upserted ExtensionState:", clientId);

  const evaluations = [
    {
      host: "malware.example",
      url: "https://malware.example/",
      pageTextSample: "Suspicious download portal",
      heuristicScore: "risky",
      explanation:
        "This host is in your demo blocklist. In production, explanations come from Gemini after Safe Browsing / URLhaus signals.",
    },
    {
      host: "news.example.com",
      url: "https://news.example.com/",
      pageTextSample: "Breaking news and third-party ads",
      heuristicScore: "caution",
      explanation:
        "Demo news site: expect analytics and ad trackers. Use per-site Block all or custom rules to limit exposure.",
    },
    {
      host: "shop.example.com",
      url: "https://shop.example.com/",
      pageTextSample: "Checkout and payment partners",
      heuristicScore: "caution",
      explanation:
        "E-commerce sites often load payment, analytics, and retargeting scripts. Review tracker activity before saving cards.",
    },
  ];
  for (const ev of evaluations) {
    await SiteEvaluation.findOneAndUpdate({ host: ev.host }, ev, { upsert: true, new: true });
  }
  console.log("Upserted SiteEvaluation rows:", evaluations.length);

  const policies = [
    {
      host: "news.example.com",
      policyUrl: "https://news.example.com/privacy",
      summary:
        "Demo summary: the policy mentions analytics cookies, ad partners, and retention of usage data for up to 24 months.",
      lastCheckedAt: new Date(),
    },
    {
      host: "shop.example.com",
      policyUrl: "https://shop.example.com/privacy-policy",
      summary:
        "Demo summary: data may be shared with payment processors and marketing platforms; EU users may have additional rights.",
      lastCheckedAt: new Date(),
    },
  ];
  for (const p of policies) {
    await PolicySnapshot.findOneAndUpdate({ host: p.host }, p, { upsert: true, new: true });
  }
  console.log("Upserted PolicySnapshot rows:", policies.length);

  const demoEmail = "demo@private-c.local";
  const demoPassword = "DummyPass12345";
  const passwordHash = await bcrypt.hash(demoPassword, 12);
  await PrivateCUser.findOneAndUpdate(
    { email: demoEmail },
    { email: demoEmail, passwordHash, onboardingComplete: true },
    { upsert: true, new: true }
  );
  console.log("Upserted user:", demoEmail, `(password: ${demoPassword})`);

  await mongoose.disconnect();
  console.log("Done. Load extension sample data: Settings → Sample data → Load sample data.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
