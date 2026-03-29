import { useState } from "react";
import { ChevronRight, ShieldOff } from "lucide-react";
import { privacy_reports } from "../data/mockData.js";
import { Card } from "../components/Card.jsx";
import { Header } from "../components/Header.jsx";
import { DetailDrawer } from "../components/DetailDrawer.jsx";

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
      <circle cx="26" cy="26" r={r} stroke="rgba(59,130,246,0.12)" strokeWidth="5" fill="none" />
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

  return (
    <div className="flex-1 flex flex-col bg-background">
      <Header title="Privacy Reports" subtitle="Per-site privacy analysis" />

      <main className="flex-1 px-6 py-6 space-y-4">
        {/* Why this matters box */}
        <Card className="border-cyan-500/22 bg-cyan-500/5">
          <div className="flex items-start gap-3">
            <ShieldOff size={16} className="text-cyan-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-1">Why this matters</p>
              <p className="text-sm text-foreground/85 leading-relaxed">
                Every website you visit may collect, share, and sell your personal data. A low privacy score
                means the site takes fewer precautions to protect your information. Click any site below
                to understand exactly what data is at risk and what you can do about it.
              </p>
            </div>
          </div>
        </Card>

        {/* Report cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {privacy_reports.map((report) => (
            <button
              key={report.id}
              onClick={() => setSelected(report)}
              className="text-left rounded-none border border-border bg-card p-4 hover:border-foreground/20 hover:bg-muted/30 transition-all group shadow-[0_0_0_1px_hsl(var(--app-border))]"
            >
              <div className="flex items-center gap-4 mb-4">
                <ScoreRing score={report.privacy_score} />
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-foreground font-bold text-base break-all">{report.site}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {report.trackers} tracker{report.trackers !== 1 ? "s" : ""} detected
                  </p>
                </div>
                <ChevronRight size={14} className="shrink-0 text-muted-foreground/40 group-hover:text-primary transition-colors" />
              </div>

              {/* Risky policies */}
              <ul className="space-y-1.5">
                {report.risky_policies.map((policy) => (
                  <li key={policy} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="w-1.5 h-1.5 shrink-0 rounded-none bg-red-400/70" />
                    {policy}
                  </li>
                ))}
              </ul>

              {/* Why this matters inline */}
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-[11px] text-muted-foreground line-clamp-2">{report.plain_reason}</p>
              </div>
            </button>
          ))}
        </div>
      </main>

      {selected && <DetailDrawer item={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
