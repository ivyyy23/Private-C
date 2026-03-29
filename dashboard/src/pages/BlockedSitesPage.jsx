import { useMemo, useState, useCallback } from "react";
import { Search, Filter, ChevronRight } from "lucide-react";
import { Card } from "../components/Card.jsx";
import { Badge } from "../components/Badge.jsx";
import { Header } from "../components/Header.jsx";
import { DetailDrawer } from "../components/DetailDrawer.jsx";
import { SimpleOnOff } from "../components/SimpleOnOff.jsx";
import { useExtensionState } from "../hooks/useExtensionState.js";
import { patchExtensionState } from "../lib/extensionBridge.js";

const RISK_LEVELS = ["all", "critical", "high", "medium", "low"];

export default function BlockedSitesPage() {
  const { state, hasChrome } = useExtensionState();
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [allowBusy, setAllowBusy] = useState(null);

  const rows = useMemo(() => {
    const blockedMap = state?.blockedSitesByHost || {};
    const blockedHosts = Object.entries(blockedMap)
      .filter(([, v]) => v)
      .map(([h]) => h.toLowerCase());

    return blockedHosts.map((host) => ({
      id: `live-${host}`,
      hostKey: host,
      url: host,
      reason: "Threat-flagged site",
      risk_level: "high",
      timestamp: null,
      action: "blocked",
      plain_reason:
        "Private-C recorded this hostname after a threat signal while browsing. You can allow all cookies and trackers for this host from the table if you fully trust it.",
      technical_reason: "Host appears in extension blockedSitesByHost state (incremented when a configured threat pattern matched).",
      recommendation: "Leave blocked unless you intentionally trust this domain.",
    }));
  }, [state?.blockedSitesByHost]);

  const filtered = useMemo(() => {
    return rows.filter((s) => {
      const matchSearch =
        s.url.toLowerCase().includes(search.toLowerCase()) ||
        s.reason.toLowerCase().includes(search.toLowerCase());
      const matchRisk = riskFilter === "all" || s.risk_level === riskFilter;
      return matchSearch && matchRisk;
    });
  }, [rows, search, riskFilter]);

  const setAllowAll = useCallback(
    async (hk, allow) => {
      if (!hasChrome || !state) return;
      setAllowBusy(hk);
      try {
        await patchExtensionState({
          allowAllTrackingByHost: { ...(state.allowAllTrackingByHost || {}), [hk]: allow },
          firstVisitDecided: { ...(state.firstVisitDecided || {}), [hk]: true },
        });
      } catch {
        /* ignore */
      } finally {
        setAllowBusy(null);
      }
    },
    [hasChrome, state]
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      <Header
        title="Blocked Sites"
        subtitle={`${rows.length} live · Hosts recorded by Private-C in this profile (no demo rows)`}
      />

      <main className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-6">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
            <input
              type="text"
              placeholder="Search URL or reason…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-none border border-border bg-card py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/55 focus:outline-none focus:ring-1 focus:ring-primary/20"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={14} className="shrink-0 text-muted-foreground/50" />
            <div className="flex gap-1">
              {RISK_LEVELS.map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setRiskFilter(l)}
                  className={`rounded-none px-2.5 py-1.5 text-xs font-medium capitalize transition-colors ${
                    riskFilter === l
                      ? "border border-primary/40 bg-primary/20 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>

        <Card glow>
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {rows.length === 0
                ? "No blocked sites in storage yet. When Private-C flags a configured threat host, it will appear here."
                : "No results match your filters."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {["Website", "Reason", "Risk", "Date / Time", "Action", "Allow all", ""].map((h) => (
                      <th
                        key={h}
                        title={h === "Allow all" ? "On = allow all cookies & trackers for this host (Private-C won’t flag it). Off = restrict." : undefined}
                        className="pb-3 pr-4 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground last:pr-0"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((row) => {
                    const hk = row.hostKey;
                    const allowed = !!(state?.allowAllTrackingByHost && state.allowAllTrackingByHost[hk]);
                    return (
                      <tr
                        key={row.id + hk}
                        className="group cursor-pointer transition-colors hover:bg-muted/50"
                        onClick={() => setSelected(row)}
                      >
                        <td className="py-3 pr-4 font-mono text-xs text-foreground">{row.url}</td>
                        <td className="py-3 pr-4 capitalize text-muted-foreground">{row.reason}</td>
                        <td className="py-3 pr-4">
                          <Badge level={row.risk_level} />
                        </td>
                        <td className="whitespace-nowrap py-3 pr-4 text-xs text-muted-foreground">
                          {row.timestamp ? new Date(row.timestamp).toLocaleString() : "—"}
                        </td>
                        <td className="py-3 pr-4">
                          <span className="rounded-none border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-xs capitalize text-emerald-400">
                            {row.action}
                          </span>
                        </td>
                        <td
                          className="py-3 pr-4"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {hasChrome && state ? (
                            <>
                              <span id={`allow-${hk}`} className="sr-only">
                                Allow all cookies and trackers for {row.url}
                              </span>
                              <SimpleOnOff
                                value={allowed}
                                disabled={allowBusy === hk}
                                onChange={(v) => setAllowAll(hk, v)}
                                labelledBy={`allow-${hk}`}
                              />
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-3 text-muted-foreground/40 transition-colors group-hover:text-primary">
                          <ChevronRight size={14} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </main>

      {selected && <DetailDrawer item={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
