import {
  Globe,
  Activity,
  KeyRound,
  ShieldAlert,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  summary_stats,
  recent_activity,
  daily_activity,
  top_domains,
  new_detections_seed,
} from "../data/mockData.js";
import { Card } from "../components/Card.jsx";
import { Header } from "../components/Header.jsx";
import { DetectionsStrip } from "../components/DetectionsStrip.jsx";
import { useExtensionState } from "../hooks/useExtensionState.js";
import { useTrackerHitTotal } from "../hooks/useTrackerLog.js";

const GRID = "hsl(0 0% 100% / 0.06)";
const SERIES_A = "#9a9a9a";
const SERIES_B = "#6b6b6b";

const STAT_CARDS = [
  {
    key: "total_blocked_sites",
    label: "Blocked Websites",
    icon: Globe,
    color: "text-foreground",
    bg: "bg-muted",
    border: "border-border",
  },
  {
    key: "total_blocked_trackers",
    label: "Tracker requests (network)",
    icon: Activity,
    color: "text-foreground/90",
    bg: "bg-muted",
    border: "border-border",
  },
  {
    key: "total_login_alerts",
    label: "Risky Login Attempts",
    icon: KeyRound,
    color: "text-warning",
    bg: "bg-warning/10",
    border: "border-warning/25",
  },
  {
    key: "privacy_alerts_today",
    label: "Privacy Alerts Today",
    icon: ShieldAlert,
    color: "text-destructive",
    bg: "bg-destructive/10",
    border: "border-destructive/30",
  },
];

const ACTIVITY_TYPE_STYLE = {
  tracker: "bg-muted text-foreground border border-border",
  blocked: "bg-destructive/15 text-destructive border border-destructive/25",
  cookie: "bg-warning/12 text-warning border border-warning/25",
  login: "bg-muted text-foreground/80 border border-border",
};

function statValue(key, state, hasChrome, trackerHitTotal) {
  if (!hasChrome || !state?.stats) {
    return summary_stats[key];
  }
  const s = state.stats;
  if (key === "total_blocked_sites") return s.blockedSites ?? summary_stats[key];
  if (key === "total_blocked_trackers") {
    if (typeof trackerHitTotal === "number") return trackerHitTotal;
    return s.trackersDetected ?? s.cookiesStopped ?? summary_stats[key];
  }
  if (key === "privacy_alerts_today") return s.privacyConcerns ?? summary_stats[key];
  return summary_stats[key];
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border px-3 py-2 text-xs text-foreground shadow-none rounded-none">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};

export default function DashboardPage() {
  const { state, hasChrome } = useExtensionState();
  const trackerHitTotal = useTrackerHitTotal();

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background">
      <Header
        title="Dashboard"
        subtitle={`Overview · ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`}
      />

      <main className="flex-1 min-h-0 overflow-y-auto px-6 py-6 space-y-6">
        <DetectionsStrip initialItems={new_detections_seed} />

        {hasChrome && state && (
          <p className="text-xs text-muted-foreground">
            Live counters reflect this profile. Charts are synthetic until telemetry binds. Site-risk voice uses Chrome TTS; ElevenLabs runs from notification setup when keyed.
          </p>
        )}

        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {STAT_CARDS.map(({ key, label, icon: Icon, color, bg, border }) => (
            <Card key={key} glow className={`border ${border}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">{label}</p>
                  <p className={`text-2xl sm:text-3xl font-bold ${color}`}>
                    {statValue(key, state, hasChrome, trackerHitTotal)}
                  </p>
                </div>
                <div className={`${bg} p-2 rounded-none border border-border`}>
                  <Icon size={18} className={color} />
                </div>
              </div>
            </Card>
          ))}
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <Card className="xl:col-span-2" glow>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-4">Daily Blocked Activity</p>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={daily_activity} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid stroke={GRID} strokeDasharray="4 4" />
                <XAxis dataKey="day" tick={{ fill: "hsl(var(--app-muted-fg))", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(var(--app-muted-fg))", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="blocked"
                  name="Blocked"
                  stroke={SERIES_A}
                  fill={SERIES_A}
                  fillOpacity={0.12}
                  strokeWidth={1.5}
                  dot={false}
                />
                <Area
                  type="monotone"
                  dataKey="trackers"
                  name="Trackers"
                  stroke={SERIES_B}
                  fill={SERIES_B}
                  fillOpacity={0.1}
                  strokeWidth={1.5}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-2">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="w-2.5 h-0.5 bg-foreground/50 inline-block" />
                Blocked
              </span>
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="w-2.5 h-0.5 bg-foreground/30 inline-block" />
                Trackers
              </span>
            </div>
          </Card>

          <Card glow>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-4">Top Blocked Domains</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={top_domains} layout="vertical" margin={{ top: 0, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={GRID} horizontal={false} />
                <XAxis type="number" tick={{ fill: "hsl(var(--app-muted-fg))", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="domain" tick={{ fill: "hsl(var(--app-muted-fg))", fontSize: 10 }} axisLine={false} tickLine={false} width={92} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Blocks" fill="hsl(0 0% 45%)" radius={0} opacity={0.9} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </section>

        <Card glow>
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-4">Recent Activity</p>
          <ul className="divide-y divide-border">
            {recent_activity.map((item) => (
              <li key={item.id} className="flex items-center justify-between py-2.5 gap-3 group">
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`shrink-0 w-2 h-2 rounded-none ${
                      item.type === "blocked"
                        ? "bg-destructive"
                        : item.type === "tracker"
                          ? "bg-foreground/45"
                          : item.type === "login"
                            ? "bg-foreground/35"
                            : "bg-warning"
                    }`}
                  />
                  <p className="text-sm text-foreground/85 truncate">{item.text}</p>
                </div>
                <span className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-none ${ACTIVITY_TYPE_STYLE[item.type]}`}>
                  {item.time}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </main>
    </div>
  );
}
