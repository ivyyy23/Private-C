export function resolveApiBase(state) {
  const fromEnv = typeof import.meta !== "undefined" ? String(import.meta.env?.VITE_API_BASE || "").trim() : "";
  const custom = typeof state?.serverApiBase === "string" ? state.serverApiBase.trim().replace(/\/+$/, "") : "";
  return custom || fromEnv || "http://127.0.0.1:3847";
}

async function parseJsonResponse(res) {
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  return { ok: res.ok, status: res.status, data };
}

export async function authLogin(apiBase, email, password) {
  const base = apiBase.replace(/\/+$/, "");
  const res = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const { ok, data } = await parseJsonResponse(res);
  if (!ok) {
    throw new Error(data?.error || `Login failed (${res.status})`);
  }
  return data;
}

export async function authRegister(apiBase, email, password) {
  const base = apiBase.replace(/\/+$/, "");
  const res = await fetch(`${base}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const { ok, data } = await parseJsonResponse(res);
  if (!ok) {
    throw new Error(data?.error || `Registration failed (${res.status})`);
  }
  return data;
}

export async function authLogoutRequest(apiBase, token) {
  const base = apiBase.replace(/\/+$/, "");
  try {
    await fetch(`${base}/api/auth/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  } catch {
    /* offline — local logout still applies */
  }
}

export async function completeServerOnboarding(apiBase, token) {
  const base = apiBase.replace(/\/+$/, "");
  const res = await fetch(`${base}/api/auth/me/onboarding`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ onboardingComplete: true }),
  });
  const { ok, data } = await parseJsonResponse(res);
  if (!ok) {
    throw new Error(data?.error || `Could not sync onboarding (${res.status})`);
  }
  return data;
}

/** Clears session fields (mirrors extension guest defaults). */
export const LOGOUT_STATE_PATCH = {
  isLoggedIn: false,
  authToken: "",
  auth: {
    stage: "guest",
    emailVerified: false,
    verificationSentAt: null,
    onboardingComplete: false,
  },
  account: { email: "", createdAt: null },
};
