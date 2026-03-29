import { useMemo, useState } from "react";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { Card } from "../components/Card.jsx";
import { Badge } from "../components/Badge.jsx";
import { Header } from "../components/Header.jsx";
import { DetailDrawer } from "../components/DetailDrawer.jsx";
import { useTrackerLog } from "../hooks/useTrackerLog.js";
import { buildLoginAlertsFromLog } from "../lib/liveAnalytics.js";

const RISK_ICON_STYLE = {
  critical: "text-red-400 bg-red-500/15",
  high: "text-orange-400 bg-orange-500/15",
  medium: "text-yellow-400 bg-yellow-500/15",
  low: "text-blue-400 bg-blue-500/15",
};

export default function LoginAlertsPage() {
  const [selected, setSelected] = useState(null);
  const { log } = useTrackerLog();

  const alerts = useMemo(() => buildLoginAlertsFromLog(log, 50), [log]);

  return (
    <div className="flex-1 flex flex-col bg-background">
      <Header
        title="Login Alerts"
        subtitle={`${alerts.length} live signal${alerts.length === 1 ? "" : "s"} from tracker log (session / fingerprint / sensitive categories)`}
      />

      <main className="flex-1 px-6 py-6 space-y-4">
        {alerts.length === 0 ? (
          <Card className="border-border bg-card/60">
            <p className="text-sm text-muted-foreground leading-relaxed p-4">
              No sensitive-class tracker events recorded yet. This list is built from your{" "}
              <strong className="text-foreground">live network log</strong> (e.g. session recording, fingerprinting,
              analytics on sites you visit)—not from static samples. Browse normally with the extension; entries appear as
              matching requests are classified.
            </p>
          </Card>
        ) : (
          alerts.map((alert) => (
            <button
              key={alert.id}
              type="button"
              onClick={() => setSelected(alert)}
              className="w-full text-left"
            >
              <Card glow className="hover:border-primary/45 transition-all group">
                <div className="flex items-center gap-4">
                  <div className={`shrink-0 w-10 h-10 rounded-none flex items-center justify-center ${RISK_ICON_STYLE[alert.risk_level]}`}>
                    <AlertTriangle size={18} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-mono text-foreground font-semibold text-sm">{alert.site}</p>
                      <Badge level={alert.risk_level} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 capitalize">{alert.detail}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(alert.timestamp).toLocaleString()}
                    </p>
                  </div>

                  <div className="hidden md:block max-w-xs">
                    <p className="text-xs text-muted-foreground line-clamp-2">{alert.recommendation}</p>
                  </div>

                  <ChevronRight size={16} className="shrink-0 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                </div>
              </Card>
            </button>
          ))
        )}
      </main>

      {selected && <DetailDrawer item={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
