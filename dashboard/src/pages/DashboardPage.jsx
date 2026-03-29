import { useMemo } from "react";
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
import { Card } from "../components/Card.jsx";
import { Header } from "../components/Header.jsx";
import { DetectionsStrip } from "../components/DetectionsStrip.jsx";
import { useExtensionState } from "../hooks/useExtensionState.js";
import { useTrackerHitTotal, useTrackerLog } from "../hooks/useTrackerLog.js";
import {
  buildDailyActivityFromLog,
  buildTopDomainsFromLog,
  buildRecentActivityFromLog,
  buildDetectionsFromLog,
  countAlertsTodayFromLog,
  buildLoginAlertsFromLog,
} from "../lib/liveAnalytics.js";

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
    label: "Sensitive-class signals",
    icon: KeyRound,
    color: "text-warning",
    bg: "bg-warning/10",
    border: "border-warning/25",
  },
  {
    key: "privacy_alerts_today",
    label: "Log events today",
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

function statValue(key, state, hasChrome, trackerHitTotal, loginAlertsLen, alertsToday) {
  if (!hasChrome || !state?.stats) {
    return 0;
  }
  const s = state.stats;
  if (key === "total_blocked_sites") {
    const n = Object.entries(state.blockedSitesByHost || {}).filter(([, v]) => v).length;
    return n;
  }
  if (key === "total_blocked_trackers") {
    if (typeof trackerHitTotal === "number") return trackerHitTotal;
    return s.trackersDetected ?? s.cookiesStopped ?? 0;
  }
  if (key === "total_login_alerts") return loginAlertsLen;
  if (key === "privacy_alerts_today") return alertsToday > 0 ? alertsToday : s.privacyConcerns ?? 0;
  return 0;
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
  const { log } = useTrackerLog();

  const dailyActivity = useMemo(() => buildDailyActivityFromLog(log, 7), [log]);
  const topDomains = useMemo(() => buildTopDomainsFromLog(log, 8), [log]);
  const recentActivity = useMemo(() => buildRecentActivityFromLog(log, 14), [log]);
  const detectionItems = useMemo(() => buildDetectionsFromLog(log, 5), [log]);
  const loginAlertsLen = useMemo(() => buildLoginAlertsFromLog(log, 500).length, [log]);
  const alertsToday = useMemo(() => countAlertsTodayFromLog(log), [log]);

  const chartDaily = dailyActivity.length ? dailyActivity : buildDailyActivityFromLog([], 7);
  const chartTop = topDomains.length ? topDomains : [{ domain: "—", count: 0 }];

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background">
      <Header
        title="Dashboard"
        subtitle={`Overview · ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`}
      />

      <main className="flex-1 min-h-0 overflow-y-auto px-6 py-6 space-y-6">
        {detectionItems.length > 0 && <DetectionsStrip items={detectionItems} />}

        {hasChrome && state && (
          <p className="text-xs text-muted-foreground">
            Charts and lists use your live tracker log (network-classified requests). Open sites in Chrome with the
            extension enabled to populate data — this view refreshes as storage updates.
          </p>
        )}

        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {STAT_CARDS.map(({ key, label, icon: Icon, color, bg, border }) => (
            <Card key={key} glow className={`border ${border}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">{label}</p>
                  <p className={`text-2xl sm:text-3xl font-bold ${color}`}>
                    {statValue(key, state, hasChrome, trackerHitTotal, loginAlertsLen, alertsToday)}
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
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-4">Daily activity (from log)</p>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={chartDaily} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid stroke={GRID} strokeDasharray="4 4" />
                <XAxis dataKey="day" tick={{ fill: "hsl(var(--app-muted-fg))", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(var(--app-muted-fg))", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="blocked"
                  name="Blocked (log)"
                  stroke={SERIES_A}
                  fill={SERIES_A}
                  fillOpacity={0.12}
                  strokeWidth={1.5}
                  dot={false}
                />
                <Area
                  type="monotone"
                  dataKey="trackers"
                  name="Tracker hits"
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
                Blocked (action)
              </span>
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="w-2.5 h-0.5 bg-foreground/30 inline-block" />
                Tracker hits
              </span>
            </div>
          </Card>

          <Card glow>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-4">Top tracker domains</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartTop} layout="vertical" margin={{ top: 0, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={GRID} horizontal={false} />
                <XAxis type="number" tick={{ fill: "hsl(var(--app-muted-fg))", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="domain" tick={{ fill: "hsl(var(--app-muted-fg))", fontSize: 10 }} axisLine={false} tickLine={false} width={92} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Hits" fill="hsl(0 0% 45%)" radius={0} opacity={0.9} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </section>

        <Card glow>
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-4">Recent activity</p>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No tracker log entries yet. Browse with the extension to record live network activity.</p>
          ) : (
            <ul className="divide-y divide-border">
              {recentActivity.map((item) => (
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
          )}
        </Card>
      </main>
    </div>
  );
}
