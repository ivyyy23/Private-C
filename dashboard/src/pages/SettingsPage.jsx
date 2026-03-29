import { useEffect, useState } from "react";
import { Card } from "../components/Card.jsx";
import { Header } from "../components/Header.jsx";
import { Settings, Server, SlidersHorizontal } from "lucide-react";
import { FuturisticSwitch } from "../components/FuturisticSwitch.jsx";
import { getExtensionState, patchExtensionState } from "../lib/extensionBridge.js";
import {
  LEGACY_DATA_CATEGORY_ITEMS,
  PROTECTION_PREFERENCE_ITEMS,
  NOTIFICATION_PREFERENCE_ITEMS,
} from "../data/preferenceDefinitions.js";

const DEFAULT_API = "http://127.0.0.1:3847";

export default function SettingsPage() {
  const [apiBase, setApiBase] = useState(DEFAULT_API);
  const [saved, setSaved] = useState(false);
  const [prefSaved, setPrefSaved] = useState(false);
  const [chromeAvail, setChromeAvail] = useState(false);
  const [legacyPrefs, setLegacyPrefs] = useState(null);
  const [protectionPrefs, setProtectionPrefs] = useState(null);
  const [notificationPrefs, setNotificationPrefs] = useState(null);
  const [prefError, setPrefError] = useState("");
  const [prefBusy, setPrefBusy] = useState(false);

  useEffect(() => {
    if (typeof chrome === "undefined" || !chrome.storage?.local) {
      setChromeAvail(false);
      return;
    }
    setChromeAvail(true);
    chrome.storage.local.get("privateCApiBase", (r) => {
      if (!chrome.runtime?.lastError && typeof r.privateCApiBase === "string" && r.privateCApiBase.trim()) {
        setApiBase(r.privateCApiBase.trim().replace(/\/$/, ""));
      }
    });

    getExtensionState()
      .then((s) => {
        if (!s) return;
        setLegacyPrefs({ ...s.preferences });
        setProtectionPrefs({ ...s.protectionPrefs });
        setNotificationPrefs({ ...s.notificationPrefs });
      })
      .catch(() => {});
  }, []);

  function saveApi() {
    const trimmed = apiBase.trim().replace(/\/$/, "") || DEFAULT_API;
    setApiBase(trimmed);
    setSaved(false);
    if (!chromeAvail) {
      return;
    }
    chrome.storage.local.set({ privateCApiBase: trimmed }, () => {
      if (!chrome.runtime?.lastError) {
        setSaved(true);
        chrome.runtime.sendMessage({ type: "PRIVATE_C_SYNC_NOW" }, () => {
          void chrome.runtime?.lastError;
        });
      }
    });
  }

  async function savePreferences() {
    if (!chromeAvail || legacyPrefs == null || protectionPrefs == null || notificationPrefs == null) {
      return;
    }
    setPrefBusy(true);
    setPrefError("");
    setPrefSaved(false);
    try {
      await patchExtensionState({
        preferences: legacyPrefs,
        protectionPrefs,
        notificationPrefs,
      });
      setPrefSaved(true);
      chrome.runtime.sendMessage({ type: "PRIVATE_C_SYNC_NOW" }, () => {
        void chrome.runtime?.lastError;
      });
    } catch (e) {
      setPrefError(e?.message || "Could not save preferences.");
    } finally {
      setPrefBusy(false);
    }
  }

  const prefsReady = legacyPrefs && protectionPrefs && notificationPrefs;

  return (
    <div className="flex-1 flex flex-col bg-background">
      <Header title="Settings" subtitle="API sync, preferences, and extension options" />
      <main className="flex-1 px-6 py-6 space-y-6 max-w-2xl">
        <Card glow>
          <div className="flex items-center gap-3 mb-4">
            <SlidersHorizontal className="text-foreground" size={22} />
            <div>
              <p className="text-sm font-medium text-foreground">Preferences</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Same options as first-run setup (preferences step). Changes apply immediately after save.
              </p>
            </div>
          </div>

          {!chromeAvail && (
            <p className="text-xs text-warning mb-4">Open this page from the extension to edit preferences.</p>
          )}

          {prefsReady ? (
            <div className="space-y-6">
              <section>
                <h3 className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground mb-3">
                  Data categories
                </h3>
                <ul className="space-y-2">
                  {LEGACY_DATA_CATEGORY_ITEMS.map(({ key, label }) => (
                    <li
                      key={key}
                      className="border border-border bg-background/60 px-3 py-2 flex items-center justify-between gap-3"
                    >
                      <span className="text-sm text-foreground">{label}</span>
                      <FuturisticSwitch
                        id={`set-legacy-${key}`}
                        checked={!!legacyPrefs[key]}
                        onChange={(v) => setLegacyPrefs((p) => ({ ...p, [key]: v }))}
                      />
                    </li>
                  ))}
                </ul>
              </section>

              <section>
                <h3 className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground mb-3">
                  Protection scope
                </h3>
                <ul className="space-y-2">
                  {PROTECTION_PREFERENCE_ITEMS.map(({ key, label }) => (
                    <li
                      key={key}
                      className="border border-border bg-background/60 px-3 py-2 flex items-center justify-between gap-3"
                    >
                      <span className="text-sm text-foreground">{label}</span>
                      <FuturisticSwitch
                        id={`set-prot-${key}`}
                        checked={!!protectionPrefs[key]}
                        onChange={(v) => setProtectionPrefs((p) => ({ ...p, [key]: v }))}
                      />
                    </li>
                  ))}
                </ul>
              </section>

              <section>
                <h3 className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground mb-3">
                  Notification channels
                </h3>
                <ul className="space-y-2">
                  {NOTIFICATION_PREFERENCE_ITEMS.map(({ key, label }) => (
                    <li
                      key={key}
                      className="border border-border bg-background/60 px-3 py-2 flex items-center justify-between gap-3"
                    >
                      <span className="text-sm text-foreground">{label}</span>
                      <FuturisticSwitch
                        id={`set-notify-${key}`}
                        checked={!!notificationPrefs[key]}
                        onChange={(v) => setNotificationPrefs((p) => ({ ...p, [key]: v }))}
                      />
                    </li>
                  ))}
                </ul>
              </section>

              {prefError && <p className="text-xs text-destructive">{prefError}</p>}
              {prefSaved && <p className="text-xs text-success">Preferences saved.</p>}

              <button
                type="button"
                onClick={savePreferences}
                disabled={!chromeAvail || prefBusy}
                className="w-full py-2.5 border border-foreground bg-foreground text-background text-sm font-semibold uppercase tracking-wider hover:opacity-90 disabled:opacity-40 rounded-none"
              >
                {prefBusy ? "Saving…" : "Save preferences"}
              </button>
            </div>
          ) : (
            chromeAvail && <p className="text-sm text-muted-foreground">Loading preferences…</p>
          )}
        </Card>

        <Card glow>
          <div className="flex items-center gap-3 mb-4">
            <Server className="text-foreground" size={22} />
            <div>
              <p className="text-sm font-medium text-foreground">MongoDB sync API</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Run <code className="font-mono text-[11px] bg-muted px-1 rounded-none">npm install && npm start</code> in{" "}
                <code className="font-mono text-[11px] bg-muted px-1 rounded-none">server/</code> with MongoDB or{" "}
                <code className="font-mono text-[11px] bg-muted px-1 rounded-none">SKIP_MONGO=1</code> for local dev.
              </p>
            </div>
          </div>

          <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">API base URL</label>
          <input
            type="url"
            value={apiBase}
            onChange={(e) => {
              setSaved(false);
              setApiBase(e.target.value);
            }}
            disabled={!chromeAvail}
            placeholder={DEFAULT_API}
            className="w-full bg-card border border-border rounded-none px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/25 mb-3"
          />

          <button
            type="button"
            onClick={saveApi}
            disabled={!chromeAvail}
            className="w-full py-2.5 rounded-none bg-muted text-foreground text-sm font-medium border border-border hover:bg-muted/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Save &amp; sync now
          </button>

          {!chromeAvail && (
            <p className="text-xs text-warning mt-3">
              Open this screen from the extension (Options / full dashboard) so Chrome APIs are available.
            </p>
          )}
          {saved && <p className="text-xs text-muted-foreground mt-3">API URL saved. Background worker will push state.</p>}
        </Card>

        <Card>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Settings size={18} />
            <p className="text-xs">
              First-run flow: <span className="text-foreground">Sign in / Sign up</span> →{" "}
              <span className="text-foreground">Preferences</span> → notification &amp; audio setup → dashboard.
            </p>
          </div>
        </Card>
      </main>
    </div>
  );
}
