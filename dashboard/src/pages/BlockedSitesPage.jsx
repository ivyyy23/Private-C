import { useState, useMemo } from "react";
import { Search, Filter, ChevronRight } from "lucide-react";
import { blocked_sites } from "../data/mockData.js";
import { Card } from "../components/Card.jsx";
import { Badge } from "../components/Badge.jsx";
import { Header } from "../components/Header.jsx";
import { DetailDrawer } from "../components/DetailDrawer.jsx";

const RISK_LEVELS = ["all", "critical", "high", "medium", "low"];

export default function BlockedSitesPage() {
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("all");
  const [selected, setSelected] = useState(null);

  const rows = useMemo(() => {
    return blocked_sites.filter((s) => {
      const matchSearch =
        s.url.toLowerCase().includes(search.toLowerCase()) ||
        s.reason.toLowerCase().includes(search.toLowerCase());
      const matchRisk = riskFilter === "all" || s.risk_level === riskFilter;
      return matchSearch && matchRisk;
    });
  }, [search, riskFilter]);

  return (
    <div className="flex-1 flex flex-col bg-background">
      <Header
        title="Blocked Sites"
        subtitle={`${blocked_sites.length} sites in database`}
      />

      <main className="flex-1 px-6 py-6 space-y-4">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
            <input
              type="text"
              placeholder="Search URL or reason…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-card border border-border rounded-none pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/55 focus:ring-1 focus:ring-primary/20"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-muted-foreground/50 shrink-0" />
            <div className="flex gap-1">
              {RISK_LEVELS.map((l) => (
                <button
                  key={l}
                  onClick={() => setRiskFilter(l)}
                  className={`text-xs px-2.5 py-1.5 rounded-none capitalize font-medium transition-colors ${
                    riskFilter === l
                      ? "bg-primary/20 text-primary border border-primary/40"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table */}
        <Card glow>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No results match your filters.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {["Website", "Reason", "Risk", "Date / Time", "Action", ""].map((h) => (
                      <th
                        key={h}
                        className="text-left text-[10px] uppercase tracking-widest text-muted-foreground font-semibold pb-3 pr-4 last:pr-0"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((row) => (
                    <tr
                      key={row.id}
                      className="group cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setSelected(row)}
                    >
                      <td className="py-3 pr-4 font-mono text-foreground text-xs">{row.url}</td>
                      <td className="py-3 pr-4 text-muted-foreground capitalize">{row.reason}</td>
                      <td className="py-3 pr-4"><Badge level={row.risk_level} /></td>
                      <td className="py-3 pr-4 text-muted-foreground text-xs whitespace-nowrap">
                        {new Date(row.timestamp).toLocaleString()}
                      </td>
                      <td className="py-3 pr-4">
                        <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-none px-2 py-0.5 capitalize">
                          {row.action}
                        </span>
                      </td>
                      <td className="py-3 text-muted-foreground/40 group-hover:text-primary transition-colors">
                        <ChevronRight size={14} />
                      </td>
                    </tr>
                  ))}
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
