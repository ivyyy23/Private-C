import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthShell } from "./AuthShell.jsx";
import { getExtensionState, patchExtensionState } from "../../lib/extensionBridge.js";
import { FuturisticSwitch } from "../../components/FuturisticSwitch.jsx";
import { playVoicePreview } from "../../lib/voiceAlerts.js";
import { NOTIFICATION_PREFERENCE_ITEMS } from "../../data/preferenceDefinitions.js";

const LEVELS = [
  { id: "low", label: "Low" },
  { id: "medium", label: "Medium" },
  { id: "high", label: "High" },
  { id: "full", label: "Full Spoken Summary" },
];

export default function NotificationPreferencesPage() {
  const navigate = useNavigate();
  const [np, setNp] = useState(null);
  const [audio, setAudio] = useState(null);
  const [error, setError] = useState("");
  const [voiceBusy, setVoiceBusy] = useState(false);

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
      if (s.auth?.stage === "verify") {
        navigate("/auth/protection", { replace: true });
        return;
      }
      if (s.auth?.stage === "protection") {
        navigate("/auth/protection", { replace: true });
        return;
      }
      setNp(s.notificationPrefs || {});
      setAudio(s.audio || {});
    });
  }, [navigate]);

  function setN(key, val) {
    setNp((p) => ({ ...p, [key]: val }));
  }

  async function testVoice() {
    setVoiceBusy(true);
    setError("");
    const sample =
      "Tracker activity detected. Cookie Cutter recommends blocking background session tracking.";
    try {
      await playVoicePreview(sample, {
        apiKey: audio?.elevenLabsApiKey,
        voiceId: audio?.elevenLabsVoiceId,
        level: audio?.level || "medium",
      });
    } catch (e) {
      setError(e?.message || "Voice preview failed.");
    } finally {
      setVoiceBusy(false);
    }
  }

  async function finish() {
    setError("");
    try {
      await patchExtensionState({
        notificationPrefs: np,
        audio,
        auth: {
          stage: "ready",
          onboardingComplete: true,
          emailVerified: true,
        },
      });
      navigate("/");
    } catch (e) {
      setError(e?.message || "Save failed");
    }
  }

  if (!np || !audio) {
    return (
      <AuthShell title="Notifications" subtitle="Loading…">
        <p className="text-sm text-muted-foreground">…</p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Notification Preferences"
      subtitle="Channel selection and audio posture. ElevenLabs runs when an API key is set; otherwise the browser speech engine is used."
    >
      <section className="mb-6">
        <h2 className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground mb-3">Channels</h2>
        <ul className="space-y-2">
          {NOTIFICATION_PREFERENCE_ITEMS.map(({ key, label }) => (
            <li
              key={key}
              className="border border-border bg-background/60 px-3 py-3 flex items-center justify-between gap-3 rounded-none"
            >
              <span className="text-sm text-foreground">{label}</span>
              <FuturisticSwitch id={`np-${key}`} checked={!!np[key]} onChange={(v) => setN(key, v)} />
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-6 border border-border p-3 bg-muted/20 rounded-none space-y-3">
        <h2 className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">Audio alert level</h2>
        <div className="flex flex-wrap gap-1">
          {LEVELS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setAudio((a) => ({ ...a, level: id }))}
              className={`px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider border border-border rounded-none ${
                audio.level === id ? "bg-foreground text-background" : "bg-background text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="mb-6 border border-border p-3 space-y-2 rounded-none">
        <h2 className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">ElevenLabs (optional)</h2>
        <input
          type="password"
          placeholder="xi-api-key"
          value={audio.elevenLabsApiKey || ""}
          onChange={(e) => setAudio((a) => ({ ...a, elevenLabsApiKey: e.target.value }))}
          className="w-full border border-border bg-background px-2 py-1.5 text-xs rounded-none"
        />
        <input
          type="text"
          placeholder="Voice ID"
          value={audio.elevenLabsVoiceId || ""}
          onChange={(e) => setAudio((a) => ({ ...a, elevenLabsVoiceId: e.target.value }))}
          className="w-full border border-border bg-background px-2 py-1.5 text-xs rounded-none"
        />
        <button
          type="button"
          disabled={voiceBusy}
          onClick={testVoice}
          className="text-[10px] font-semibold uppercase tracking-wider border border-border px-3 py-1.5 hover:bg-muted rounded-none disabled:opacity-40"
        >
          Test voice sample
        </button>
      </section>

      {error && <p className="text-xs text-destructive mb-3">{error}</p>}

      <button
        type="button"
        onClick={finish}
        className="w-full border border-foreground bg-foreground py-2.5 text-sm font-semibold uppercase tracking-widest text-background hover:opacity-90 rounded-none"
      >
        Enter dashboard
      </button>
    </AuthShell>
  );
}
