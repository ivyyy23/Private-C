import { useEffect } from "react";
import { X, AlertTriangle, Info } from "lucide-react";
import { Badge } from "./Badge.jsx";

export function DetailDrawer({ item, onClose }) {
  useEffect(() => {
    const handler = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!item) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      <aside className="fixed right-0 top-0 h-full w-full max-w-md bg-sidebar border-l border-border z-50 flex flex-col shadow-2xl text-sidebar-accent-foreground">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <span className="text-sm font-semibold text-foreground tracking-wide uppercase">
            Why this was blocked
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-none hover:bg-muted"
            aria-label="Close details"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Site / Domain</p>
            <p className="text-foreground font-semibold text-lg break-all">
              {item.url ?? item.site ?? item.tracker_domain ?? "—"}
            </p>
            {item.risk_level && (
              <div className="mt-2">
                <Badge level={item.risk_level} />
              </div>
            )}
          </div>

          <section className="rounded-none bg-muted/50 border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Info size={14} className="text-foreground" />
              <span className="text-xs font-semibold text-foreground uppercase tracking-wider">Plain explanation</span>
            </div>
            <p className="text-sm text-foreground/90 leading-relaxed">{item.plain_reason}</p>
          </section>

          <section className="rounded-none bg-muted border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={14} className="text-warning" />
              <span className="text-xs font-semibold text-warning uppercase tracking-wider">Technical detail</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed font-mono">{item.technical_reason}</p>
          </section>

          <section className="rounded-none bg-success/8 border border-success/25 p-4">
            <p className="text-xs font-semibold text-success uppercase tracking-wider mb-2">Recommended action</p>
            <p className="text-sm text-foreground/90 leading-relaxed">{item.recommendation}</p>
          </section>

          {item.reason && (
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Block reason</p>
              <p className="text-sm text-foreground/80">{item.reason}</p>
            </div>
          )}
          {item.action && (
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Action taken</p>
              <p className="text-sm text-foreground/80 capitalize">{item.action}</p>
            </div>
          )}
          {item.timestamp && (
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Detected at</p>
              <p className="text-sm text-foreground/80">{new Date(item.timestamp).toLocaleString()}</p>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
