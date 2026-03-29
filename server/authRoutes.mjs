import crypto from "node:crypto";
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const BCRYPT_ROUNDS = 12;
const JWT_EXPIRES = "30d";

function emailNorm(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

export function createAuthRouter({ User, jwtSecret, skipMongo, userMemory }) {
  const router = express.Router();

  function signToken(userDoc) {
    const id = skipMongo ? userDoc._id : String(userDoc._id);
    return jwt.sign({ sub: id, email: userDoc.email }, jwtSecret, { expiresIn: JWT_EXPIRES });
  }

  router.post("/register", async (req, res) => {
    const email = emailNorm(req.body?.email);
    const password = String(req.body?.password || "");
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ ok: false, error: "valid email required" });
    }
    if (password.length < 10) {
      return res.status(400).json({ ok: false, error: "password must be at least 10 characters" });
    }
    try {
      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
      if (skipMongo) {
        if (userMemory.has(email)) {
          return res.status(409).json({ ok: false, error: "email already registered" });
        }
        const doc = {
          _id: crypto.randomUUID(),
          email,
          passwordHash,
          onboardingComplete: false,
        };
        userMemory.set(email, doc);
        const token = signToken(doc);
        return res.json({
          ok: true,
          token,
          user: { email, onboardingComplete: false },
        });
      }
      const existing = await User.findOne({ email });
      if (existing) {
        return res.status(409).json({ ok: false, error: "email already registered" });
      }
      const user = await User.create({ email, passwordHash, onboardingComplete: false });
      const token = signToken(user);
      return res.json({
        ok: true,
        token,
        user: { email: user.email, onboardingComplete: !!user.onboardingComplete },
      });
    } catch (e) {
      console.error("POST /api/auth/register", e);
      return res.status(500).json({ ok: false, error: "registration failed" });
    }
  });

  router.post("/login", async (req, res) => {
    const email = emailNorm(req.body?.email);
    const password = String(req.body?.password || "");
    if (!email || password.length < 1) {
      return res.status(400).json({ ok: false, error: "email and password required" });
    }
    try {
      let user = null;
      if (skipMongo) {
        user = userMemory.get(email) || null;
      } else {
        user = await User.findOne({ email }).lean();
      }
      if (!user) {
        return res.status(401).json({ ok: false, error: "invalid email or password" });
      }
      const passOk = await bcrypt.compare(password, user.passwordHash);
      if (!passOk) {
        return res.status(401).json({ ok: false, error: "invalid email or password" });
      }
      const token = signToken(user);
      return res.json({
        ok: true,
        token,
        user: { email: user.email, onboardingComplete: !!user.onboardingComplete },
      });
    } catch (e) {
      console.error("POST /api/auth/login", e);
      return res.status(500).json({ ok: false, error: "login failed" });
    }
  });

  router.get("/me", async (req, res) => {
    const hdr = req.headers.authorization || "";
    const m = hdr.match(/^Bearer\s+(.+)$/i);
    if (!m) {
      return res.status(401).json({ ok: false, error: "missing bearer token" });
    }
    try {
      const payload = jwt.verify(m[1], jwtSecret);
      const email = emailNorm(payload.email);
      let user = null;
      if (skipMongo) {
        user = userMemory.get(email) || null;
      } else {
        user = await User.findOne({ email }).lean();
      }
      if (!user) {
        return res.status(401).json({ ok: false, error: "user not found" });
      }
      return res.json({
        ok: true,
        user: { email: user.email, onboardingComplete: !!user.onboardingComplete },
      });
    } catch {
      return res.status(401).json({ ok: false, error: "invalid token" });
    }
  });

  router.patch("/me/onboarding", async (req, res) => {
    const hdr = req.headers.authorization || "";
    const m = hdr.match(/^Bearer\s+(.+)$/i);
    if (!m) {
      return res.status(401).json({ ok: false, error: "missing bearer token" });
    }
    try {
      const payload = jwt.verify(m[1], jwtSecret);
      const email = emailNorm(payload.email);
      const complete = !!req.body?.onboardingComplete;
      if (skipMongo) {
        const u = userMemory.get(email);
        if (!u) return res.status(404).json({ ok: false, error: "not found" });
        u.onboardingComplete = complete;
        userMemory.set(email, u);
        return res.json({ ok: true, user: { email, onboardingComplete: complete } });
      }
      const user = await User.findOneAndUpdate(
        { email },
        { onboardingComplete: complete },
        { new: true }
      ).lean();
      if (!user) {
        return res.status(404).json({ ok: false, error: "not found" });
      }
      return res.json({
        ok: true,
        user: { email: user.email, onboardingComplete: !!user.onboardingComplete },
      });
    } catch {
      return res.status(401).json({ ok: false, error: "invalid token" });
    }
  });

  return router;
}
