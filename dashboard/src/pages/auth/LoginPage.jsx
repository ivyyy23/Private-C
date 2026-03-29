import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthShell } from "./AuthShell.jsx";
import { getExtensionState, patchExtensionState } from "../../lib/extensionBridge.js";

export default function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getExtensionState().then((s) => {
      if (s?.isLoggedIn && s?.auth?.stage === "ready" && s?.auth?.onboardingComplete) {
        navigate("/", { replace: true });
      }
    });
  }, [navigate]);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    const em = email.trim();
    if (!em || password.length < 8) {
      setError("Valid email and password (8+ characters) required.");
      return;
    }
    setBusy(true);
    try {
      const state = await getExtensionState();
      if (state === null) {
        setError("Open this page from the Private-C extension (options / dashboard tab).");
        setBusy(false);
        return;
      }

      if (mode === "signup") {
        await patchExtensionState({
          isLoggedIn: true,
          account: { email: em, createdAt: Date.now() },
          auth: {
            stage: "protection",
            emailVerified: true,
            verificationSentAt: null,
            onboardingComplete: false,
          },
        });
        navigate("/auth/protection");
        return;
      }

      if (state.account?.email === em && state.auth?.onboardingComplete) {
        await patchExtensionState({
          isLoggedIn: true,
          auth: { ...state.auth, stage: "ready", emailVerified: true },
        });
        navigate("/");
        return;
      }

      if (state.account?.email === em) {
        const st = state.auth?.stage || "protection";
        await patchExtensionState({ isLoggedIn: true });
        if (st === "verify") navigate("/auth/protection");
        else if (st === "protection") navigate("/auth/protection");
        else if (st === "notifications") navigate("/auth/notifications");
        else navigate("/");
        return;
      }

      setError("No account for this email. Switch to Create Account.");
    } catch (err) {
      setError(err?.message || "Request failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title={mode === "signup" ? "Create Account" : "Sign In"}
      subtitle="Sign in or create an account. After sign up you will choose your preferences, then notification options."
    >
      <div className="flex gap-0 border border-border mb-6 rounded-none overflow-hidden">
        <button
          type="button"
          onClick={() => {
            setMode("signin");
            setError("");
          }}
          className={`flex-1 py-2 text-xs font-semibold uppercase tracking-wider ${
            mode === "signin" ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
          }`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("signup");
            setError("");
          }}
          className={`flex-1 py-2 text-xs font-semibold uppercase tracking-wider border-l border-border ${
            mode === "signup" ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
          }`}
        >
          Create Account
        </button>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="pc-email" className="block text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1.5">
            Email
          </label>
          <input
            id="pc-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/30 rounded-none"
            placeholder="you@domain.com"
          />
        </div>
        <div>
          <label htmlFor="pc-pass" className="block text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1.5">
            Password
          </label>
          <input
            id="pc-pass"
            type="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/30 rounded-none"
            placeholder="••••••••"
          />
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full border border-border bg-foreground py-2.5 text-sm font-semibold uppercase tracking-widest text-background hover:opacity-90 disabled:opacity-40 rounded-none"
        >
          {busy ? "…" : mode === "signup" ? "Create account" : "Authenticate"}
        </button>
      </form>
    </AuthShell>
  );
}
