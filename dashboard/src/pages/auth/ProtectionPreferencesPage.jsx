import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthShell } from "./AuthShell.jsx";
import { getExtensionState, patchExtensionState } from "../../lib/extensionBridge.js";
import { SimpleOnOff } from "../../components/SimpleOnOff.jsx";
import { PROTECTION_PREFERENCE_ITEMS } from "../../data/preferenceDefinitions.js";

export default function ProtectionPreferencesPage() {
  const navigate = useNavigate();
  const [prefs, setPrefs] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getExtensionState().then((s) => {
      if (!s?.isLoggedIn) {
        navigate("/auth/login", { replace: true });
        return;
      }
      if (s.auth?.stage === "ready") {
        navigate("/", { replace: true });
        return;
      }
      if (s.auth?.stage === "notifications") {
        navigate("/auth/notifications", { replace: true });
        return;
      }
      setPrefs(s.protectionPrefs || {});
    });
  }, [navigate]);

  function setKey(key, val) {
    setPrefs((p) => ({ ...p, [key]: val }));
  }

  async function onContinue() {
    setError("");
    try {
      await patchExtensionState({
        protectionPrefs: prefs,
        auth: { stage: "notifications" },
      });
      navigate("/auth/notifications", { replace: true });
    } catch (e) {
      setError(e?.message || "Save failed");
    }
  }

  if (!prefs) {
    return (
      <AuthShell title="Protection Scope" subtitle="Loading…">
        <p className="text-sm text-muted-foreground">…</p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Preferences"
      subtitle="Choose what Private-C monitors. You can change these anytime under Settings → Preferences."
    >
      <ul className="space-y-2 mb-6">
        {PROTECTION_PREFERENCE_ITEMS.map(({ key, label }) => (
          <li
            key={key}
            className="border border-border bg-background/60 px-3 py-3 flex items-center justify-between gap-3 card-hover rounded-none"
          >
            <span className="text-sm text-foreground pr-2" id={`pp-${key}-lbl`}>
              {label}
            </span>
            <SimpleOnOff labelledBy={`pp-${key}-lbl`} value={!!prefs[key]} onChange={(v) => setKey(key, v)} />
          </li>
        ))}
      </ul>
      {error && <p className="text-xs text-destructive mb-3">{error}</p>}
      <button
        type="button"
        onClick={onContinue}
        className="w-full border border-foreground bg-foreground py-2.5 text-sm font-semibold uppercase tracking-widest text-background hover:opacity-90 rounded-none"
      >
        Continue to notifications
      </button>
    </AuthShell>
  );
}
