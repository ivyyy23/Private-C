import { useMemo, useState } from "react";
import { ChevronRight, ShieldOff } from "lucide-react";
import { Card } from "../components/Card.jsx";
import { Header } from "../components/Header.jsx";
import { DetailDrawer } from "../components/DetailDrawer.jsx";
import { useTrackerLog } from "../hooks/useTrackerLog.js";
import { buildPrivacyReportsFromLog } from "../lib/liveAnalytics.js";

function ScoreRing({ score }) {
  const color =
    score >= 70 ? "#34d399" :
    score >= 45 ? "#fbbf24" :
    "#f87171";
  const pct = score / 100;
  const r = 20;
  const circumference = 2 * Math.PI * r;
  return (
    <svg width="52" height="52" className="shrink-0">
      <circle cx="26" cy="26" r={r} stroke="rgba(148,163,184,0.2)" strokeWidth="5" fill="none" />
      <circle
        cx="26"
        cy="26"
        r={r}
        stroke={color}
        strokeWidth="5"
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - pct)}
        strokeLinecap="round"
        transform="rotate(-90 26 26)"
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
      <text x="26" y="31" textAnchor="middle" fontSize="11" fontWeight="700" fill={color}>
        {score}
      </text>
    </svg>
  );
}

export default function PrivacyReportsPage() {
  const [selected, setSelected] = useState(null);
  const { log } = useTrackerLog();

  const reports = useMemo(() => buildPrivacyReportsFromLog(log, 24), [log]);

  return (
    <div className="flex-1 flex flex-col bg-background">
      <Header title="Privacy Reports" subtitle={`${reports.length} site${reports.length === 1 ? "" : "s"} from live tracker log`} />

      <main className="flex-1 px-6 py-6 space-y-4">
        <Card className="border-border bg-muted/30">
          <div className="flex items-start gap-3">
            <ShieldOff size={16} className="text-foreground/70 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-1">Live rollup</p>
              <p className="text-sm text-foreground/85 leading-relaxed">
                Scores and policy bullets are <strong>derived from your recorded third-party tracker contacts</strong> per
                site—not from a static catalog. More distinct tracker domains on a site lower the heuristic score. Open
                any card for wording from the latest matching log entry where available.
              </p>
            </div>
          </div>
        </Card>

        {reports.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12 border border-dashed border-border rounded-none">
            No per-site rollup yet. Visit a few different websites with the extension; reports appear from aggregated
            tracker activity.
          </p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {reports.map((report) => (
              <button
                key={report.id}
                type="button"
                onClick={() => setSelected(report)}
                className="text-left rounded-none border border-border bg-card p-4 hover:border-foreground/20 hover:bg-muted/30 transition-all group shadow-[0_0_0_1px_hsl(var(--app-border))]"
              >
                <div className="flex items-center gap-4 mb-4">
                  <ScoreRing score={report.privacy_score} />
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-foreground font-bold text-base break-all">{report.site}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {report.trackers} tracker host{report.trackers !== 1 ? "s" : ""} (distinct)
                    </p>
                  </div>
                  <ChevronRight size={14} className="shrink-0 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                </div>

                <ul className="space-y-1.5">
                  {report.risky_policies.map((policy) => (
                    <li key={policy} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="w-1.5 h-1.5 shrink-0 rounded-none bg-foreground/40" />
                      {policy}
                    </li>
                  ))}
                </ul>

                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-[11px] text-muted-foreground line-clamp-2">{report.plain_reason}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      {selected && <DetailDrawer item={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
