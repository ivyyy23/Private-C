import { useMemo, useState } from "react";
import { Search, ChevronRight } from "lucide-react";
import { Card } from "../components/Card.jsx";
import { Header } from "../components/Header.jsx";
import { DetailDrawer } from "../components/DetailDrawer.jsx";
import { useTrackerLog } from "../hooks/useTrackerLog.js";
import { tracker_activity as mock_trackers } from "../data/mockData.js";

const CATEGORY_STYLE = {
  "ad network": "bg-red-500/12 text-red-400 border-red-500/25",
  "session recording": "bg-orange-500/12 text-orange-400 border-orange-500/25",
  "social tracker": "bg-purple-500/12 text-purple-400 border-purple-500/25",
  fingerprinting: "bg-yellow-500/12 text-yellow-400 border-yellow-500/25",
  retargeting: "bg-cyan-500/12 text-cyan-400 border-cyan-500/25",
  analytics: "bg-sky-500/12 text-sky-400 border-sky-500/25",
  "tag manager": "bg-violet-500/12 text-violet-400 border-violet-500/25",
  cdn: "bg-muted text-foreground/80 border-border",
};

export default function TrackerActivityPage() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const { log, hydrated } = useTrackerLog();

  const hasChrome = typeof chrome !== "undefined" && !!chrome.storage?.local;
  const rows = useMemo(() => {
    const q = search.toLowerCase();
    const source = hasChrome && hydrated && log.length > 0 ? log : mock_trackers;
    return source.filter(
      (t) =>
        (t.tracker_domain || "").toLowerCase().includes(q) ||
        (t.source_site || "").toLowerCase().includes(q) ||
        (t.category || "").toLowerCase().includes(q)
    );
  }, [search, log, hydrated, hasChrome]);

  const totalHits = useMemo(() => {
    if (!hasChrome || !log.length) return rows.length;
    return log.reduce((acc, t) => acc + (t.hit_count || 1), 0);
  }, [log, rows.length, hasChrome]);

  const subtitle =
    hasChrome && log.length > 0
      ? `${log.length} tracker hosts · ${totalHits} network requests logged (live)`
      : hasChrome && hydrated
        ? `${mock_trackers.length} sample rows · browse with the extension to capture live requests`
        : `${mock_trackers.length} trackers (demo)`;

  return (
    <div className="flex-1 flex flex-col bg-background">
      <Header title="Tracker Activity" subtitle={subtitle} />

      <main className="flex-1 px-6 py-6 space-y-4">
        {hasChrome && hydrated && log.length === 0 && (
          <p className="text-sm text-muted-foreground border border-border bg-card/50 px-3 py-2 rounded-none">
            No tracker-classified requests recorded yet. Visit a news or retail site over HTTPS, then refresh this page.
            Private-C matches requests against a built-in tracker domain list (network-level, not a full ad blocker).
          </p>
        )}

        <div className="relative max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
          <input
            type="text"
            placeholder="Search tracker or site…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-card border border-border rounded-none pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/55 focus:ring-1 focus:ring-primary/20"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {rows.map((t) => (
            <button
              key={t.id || `${t.source_site}-${t.tracker_domain}-${t.timestamp}`}
              type="button"
              onClick={() => setSelected(t)}
              className="text-left rounded-none border border-border bg-card p-4 hover:border-foreground/20 hover:bg-muted/30 transition-all group shadow-[0_0_0_1px_hsl(var(--app-border))]"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <p className="font-mono text-foreground text-sm font-semibold break-all">{t.tracker_domain}</p>
                <ChevronRight size={14} className="shrink-0 text-muted-foreground/40 group-hover:text-primary transition-colors mt-0.5" />
              </div>

              <p className="text-xs text-muted-foreground mb-3">
                From <span className="text-primary">{t.source_site}</span>
                {t.hit_count > 1 && (
                  <span className="ml-2 text-foreground/70">· {t.hit_count} requests</span>
                )}
              </p>

              <div className="flex items-center justify-between gap-2">
                <span
                  className={`text-[10px] font-semibold uppercase tracking-wider border rounded-none px-2 py-0.5 ${
                    CATEGORY_STYLE[t.category] ?? "bg-primary/12 text-primary border-primary/25"
                  }`}
                >
                  {t.category}
                </span>
                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-none px-2 py-0.5 capitalize">
                  {t.action || "observed"}
                </span>
              </div>

              <p className="text-[10px] text-muted-foreground mt-3">
                {new Date(t.timestamp).toLocaleString()}
                {t.last_resource_type && (
                  <span className="ml-2 opacity-80">· {t.last_resource_type}</span>
                )}
              </p>
            </button>
          ))}
        </div>

        {rows.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No trackers match your search.</p>
        )}
      </main>

      {selected && <DetailDrawer item={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
