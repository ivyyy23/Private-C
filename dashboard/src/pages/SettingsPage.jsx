import { useCallback, useEffect, useState } from "react";
import { Card } from "../components/Card.jsx";
import { Header } from "../components/Header.jsx";
import { Settings, SlidersHorizontal, Palette, Sparkles } from "lucide-react";
import { ThemeToggle } from "../components/ThemeToggle.jsx";
import { SimpleOnOff } from "../components/SimpleOnOff.jsx";
import { PrefInfo } from "../components/PrefInfo.jsx";
import { getExtensionState, patchExtensionState } from "../lib/extensionBridge.js";
import {
  LEGACY_DATA_CATEGORY_ITEMS,
  PROTECTION_PREFERENCE_ITEMS,
  NOTIFICATION_PREFERENCE_ITEMS,
} from "../data/preferenceDefinitions.js";

const SECTIONS = [
  { id: "preferences", label: "Preferences" },
  { id: "appearance", label: "Appearance" },
  { id: "sample-data", label: "Sample data" },
  { id: "about", label: "About" },
];

export default function SettingsPage() {
  const [prefSaved, setPrefSaved] = useState(false);
  const [chromeAvail, setChromeAvail] = useState(false);
  const [legacyPrefs, setLegacyPrefs] = useState(null);
  const [protectionPrefs, setProtectionPrefs] = useState(null);
  const [notificationPrefs, setNotificationPrefs] = useState(null);
  const [prefError, setPrefError] = useState("");
  const [prefBusy, setPrefBusy] = useState(false);
  const [dummyBusy, setDummyBusy] = useState(false);
  const [dummyMsg, setDummyMsg] = useState("");

  const scrollTo = useCallback((id) => {
    document.getElementById(`settings-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  useEffect(() => {
    if (typeof chrome === "undefined" || !chrome.storage?.local) {
      setChromeAvail(false);
      return;
    }
    setChromeAvail(true);

    getExtensionState()
      .then((s) => {
        if (!s) return;
        setLegacyPrefs({ ...s.preferences });
        setProtectionPrefs({ ...s.protectionPrefs });
        setNotificationPrefs({ ...s.notificationPrefs });
      })
      .catch(() => {});
  }, []);

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

  async function loadSampleData() {
    if (typeof chrome === "undefined" || !chrome.runtime?.sendMessage) {
      setDummyMsg("Open this page from the extension to load sample data.");
      return;
    }
    setDummyBusy(true);
    setDummyMsg("");
    try {
      const res = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ type: "PRIVATE_C_LOAD_DUMMY_DATA" }, (r) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          resolve(r);
        });
      });
      if (!res?.ok) {
        throw new Error(res?.error || "Load failed");
      }
      setDummyMsg(`Loaded demo extension state and ${res.trackers ?? 0} tracker log rows. Refresh other dashboard tabs if open.`);
    } catch (e) {
      setDummyMsg(e?.message || "Could not load sample data.");
    } finally {
      setDummyBusy(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      <Header
        title="Settings"
        subtitle="Preferences, appearance, and about. Backend URL, MongoDB, and Gemini run on the server only."
      />

      {/* Mobile: jump bar fixed to screen bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-40 flex flex-wrap gap-1 border-t border-border bg-background/95 p-2 px-3 backdrop-blur-sm sm:hidden">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => scrollTo(s.id)}
            className="border border-border bg-muted/40 px-2 py-1.5 text-[10px] font-mono uppercase tracking-wider text-foreground"
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Desktop: side nav does not scroll; stays in layout column */}
        <nav
          className="hidden w-48 shrink-0 flex-col overflow-hidden border-r border-border bg-background py-5 pl-3 pr-2 sm:flex"
          aria-label="Settings sections"
        >
          <p className="mb-3 border-b border-border/60 px-2 pb-2 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            Jump to
          </p>
          <ol className="m-0 flex list-none flex-col gap-0.5 p-0">
            {SECTIONS.map((s, i) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => scrollTo(s.id)}
                  className="w-full rounded-none border border-transparent px-2 py-2 text-left text-xs text-foreground hover:border-border hover:bg-muted"
                >
                  <span className="mr-2 font-mono tabular-nums text-muted-foreground">{i + 1}.</span>
                  {s.label}
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto pb-20 sm:pb-6">
          <div className="w-full max-w-none space-y-8 px-4 py-6 sm:px-6">
            <section id="settings-preferences">
              <Card glow className="w-full">
                <div className="mb-4 flex items-center gap-3">
                  <SlidersHorizontal className="text-foreground" size={22} />
                  <div>
                    <p className="text-sm font-medium text-foreground">1. Preferences</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Uses full width of the panel. Use the <span className="font-mono">i</span> icon for details. Save applies to the
                      extension.
                    </p>
                  </div>
                </div>

                {!chromeAvail && (
                  <p className="mb-4 text-xs text-warning">Open this page from the extension to edit preferences.</p>
                )}

                {prefsReady ? (
                  <div className="space-y-6">
                    <div>
                      <h3 className="mb-3 text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
                        Data categories
                      </h3>
                      <ul className="grid grid-cols-1 gap-2 lg:grid-cols-2 xl:grid-cols-3">
                        {LEGACY_DATA_CATEGORY_ITEMS.map(({ key, label, description }) => (
                          <li
                            key={key}
                            className="flex items-center justify-between gap-2 border border-border bg-background/60 px-3 py-2"
                          >
                            <div className="flex min-w-0 flex-1 items-center gap-1.5">
                              <span className="truncate text-sm text-foreground" id={`set-legacy-${key}-lbl`}>
                                {label}
                              </span>
                              <PrefInfo description={description} />
                            </div>
                            <SimpleOnOff
                              labelledBy={`set-legacy-${key}-lbl`}
                              value={!!legacyPrefs[key]}
                              onChange={(v) => setLegacyPrefs((p) => ({ ...p, [key]: v }))}
                              disabled={!chromeAvail}
                            />
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h3 className="mb-3 text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
                        Protection scope
                      </h3>
                      <ul className="grid grid-cols-1 gap-2 lg:grid-cols-2 xl:grid-cols-3">
                        {PROTECTION_PREFERENCE_ITEMS.map(({ key, label, description }) => (
                          <li
                            key={key}
                            className="flex items-center justify-between gap-2 border border-border bg-background/60 px-3 py-2"
                          >
                            <div className="flex min-w-0 flex-1 items-center gap-1.5">
                              <span className="truncate text-sm text-foreground" id={`set-prot-${key}-lbl`}>
                                {label}
                              </span>
                              <PrefInfo description={description} />
                            </div>
                            <SimpleOnOff
                              labelledBy={`set-prot-${key}-lbl`}
                              value={!!protectionPrefs[key]}
                              onChange={(v) => setProtectionPrefs((p) => ({ ...p, [key]: v }))}
                              disabled={!chromeAvail}
                            />
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h3 className="mb-3 text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
                        Notification channels
                      </h3>
                      <ul className="grid grid-cols-1 gap-2 lg:grid-cols-2 xl:grid-cols-3">
                        {NOTIFICATION_PREFERENCE_ITEMS.map(({ key, label, description }) => (
                          <li
                            key={key}
                            className="flex items-center justify-between gap-2 border border-border bg-background/60 px-3 py-2"
                          >
                            <div className="flex min-w-0 flex-1 items-center gap-1.5">
                              <span className="truncate text-sm text-foreground" id={`set-notify-${key}-lbl`}>
                                {label}
                              </span>
                              <PrefInfo description={description} />
                            </div>
                            <SimpleOnOff
                              labelledBy={`set-notify-${key}-lbl`}
                              value={!!notificationPrefs[key]}
                              onChange={(v) => setNotificationPrefs((p) => ({ ...p, [key]: v }))}
                              disabled={!chromeAvail}
                            />
                          </li>
                        ))}
                      </ul>
                    </div>

                    {prefError && <p className="text-xs text-destructive">{prefError}</p>}
                    {prefSaved && <p className="text-xs text-success">Preferences saved.</p>}

                    <button
                      type="button"
                      onClick={savePreferences}
                      disabled={!chromeAvail || prefBusy}
                      className="w-full rounded-none border border-foreground bg-foreground py-2.5 text-sm font-semibold uppercase tracking-wider text-background hover:opacity-90 disabled:opacity-40"
                    >
                      {prefBusy ? "Saving…" : "Save preferences"}
                    </button>
                  </div>
                ) : (
                  chromeAvail && <p className="text-sm text-muted-foreground">Loading preferences…</p>
                )}
              </Card>
            </section>

            <section id="settings-appearance">
              <Card glow className="w-full">
                <div className="mb-4 flex items-center gap-3">
                  <Palette className="text-foreground" size={22} />
                  <div>
                    <p className="text-sm font-medium text-foreground">2. Appearance</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">Light or dark theme for this dashboard.</p>
                  </div>
                </div>
                <ThemeToggle />
              </Card>
            </section>

            <section id="settings-sample-data">
              <Card glow className="w-full">
                <div className="mb-4 flex items-center gap-3">
                  <Sparkles className="text-foreground" size={22} />
                  <div>
                    <p className="text-sm font-medium text-foreground">3. Sample data</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Merges <span className="font-mono">data/dummy/</span> into this profile (signed-in demo user, blocked hosts, tracker
                      log). Safe for local UI testing; replace with real browsing data anytime.
                    </p>
                  </div>
                </div>
                {dummyMsg && (
                  <p className={`mb-3 text-xs ${dummyMsg.includes("Loaded") ? "text-success" : "text-destructive"}`}>{dummyMsg}</p>
                )}
                <button
                  type="button"
                  onClick={loadSampleData}
                  disabled={dummyBusy}
                  className="w-full rounded-none border border-border bg-muted py-2.5 text-sm font-semibold uppercase tracking-wider text-foreground hover:bg-muted/80 disabled:opacity-40"
                >
                  {dummyBusy ? "Loading…" : "Load sample data"}
                </button>
                <p className="mt-3 text-[10px] text-muted-foreground leading-relaxed">
                  Server-side demo: from repo root run <span className="font-mono">npm run seed:dummy</span> (MongoDB required) for API
                  collections + user <span className="font-mono">demo@private-c.local</span> / <span className="font-mono">DummyPass12345</span>.
                </p>
              </Card>
            </section>

            <section id="settings-about">
              <Card className="w-full">
                <div className="flex items-start gap-2 text-muted-foreground">
                  <Settings size={18} className="mt-0.5 shrink-0" />
                  <p className="text-xs leading-relaxed">
                    <span className="font-medium text-foreground">4. About.</span> Site trust copy is resolved on the Private-C API:
                    cached in MongoDB when available; otherwise Gemini runs on the server and the result is stored. Privacy policies for
                    hosts listed in <code className="font-mono text-[10px]">POLICY_MONITOR_HOSTS</code> are refreshed on a weekly timer.
                    Extension sync still posts to the configured backend; API URL and keys are not exposed in this UI.
                  </p>
                </div>
              </Card>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
