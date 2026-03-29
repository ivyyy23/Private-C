import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";

const PORT = Number(process.env.PORT || 3847);
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/private_c";
const SKIP_MONGO = process.env.SKIP_MONGO === "1" || process.env.SKIP_MONGO === "true";

/** In-memory fallback when MongoDB is unavailable (local dev). */
const memoryStore = new Map();

const extensionStateSchema = new mongoose.Schema(
  {
    clientId: { type: String, required: true, unique: true, index: true },
    state: { type: mongoose.Schema.Types.Mixed, required: true },
    email: { type: String, default: "" },
  },
  { timestamps: true }
);

const ExtensionState =
  mongoose.models.ExtensionState || mongoose.model("ExtensionState", extensionStateSchema);

const app = express();
app.use(
  cors({
    origin: true,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  })
);
app.use(express.json({ limit: "512kb" }));

app.get("/health", (_req, res) => {
  if (SKIP_MONGO) {
    return res.json({ ok: true, mongo: "skipped", store: "memory" });
  }
  const ready = mongoose.connection.readyState === 1;
  res.status(ready ? 200 : 503).json({ ok: ready, mongo: ready ? "connected" : "disconnected" });
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

async function main() {
  if (SKIP_MONGO) {
    console.warn("SKIP_MONGO: using in-memory store (data lost on restart).");
  } else {
    await mongoose.connect(MONGODB_URI);
    console.log("MongoDB connected:", MONGODB_URI.replace(/:[^:@]+@/, ":****@"));
  }

  app.listen(PORT, "127.0.0.1", () => {
    console.log(`Private-C API listening on http://127.0.0.1:${PORT}`);
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
