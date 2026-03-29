import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Globe,
  Activity,
  KeyRound,
  FileBarChart2,
  Settings,
  ShieldCheck,
} from "lucide-react";
import clsx from "clsx";
import { useExtensionState } from "../hooks/useExtensionState.js";

const links = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/blocked-sites", label: "Blocked Sites", icon: Globe },
  { to: "/tracker-activity", label: "Tracker Activity", icon: Activity },
  { to: "/login-alerts", label: "Login Alerts", icon: KeyRound },
  { to: "/privacy-reports", label: "Privacy Reports", icon: FileBarChart2 },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const { state } = useExtensionState();
  const accountHint = state?.isLoggedIn && state?.account?.email
    ? state.account.email
    : "Not signed in";

  return (
    <nav className="w-60 min-h-screen bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col shrink-0">
      <div className="px-5 py-5 border-b border-sidebar-border flex items-center gap-3">
        <div className="w-8 h-8 rounded-none bg-muted border border-border flex items-center justify-center">
          <ShieldCheck size={16} className="text-foreground" />
        </div>
        <div>
          <p className="font-semibold text-foreground tracking-tight text-sm leading-none">Private-C</p>
          <p className="text-[10px] text-muted-foreground tracking-widest uppercase mt-0.5">Privacy Shield</p>
        </div>
      </div>

      <ul className="flex flex-col gap-0.5 px-3 py-4 flex-1">
        {links.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-3 px-3 py-2.5 rounded-none text-sm font-medium transition-colors duration-150 select-none border",
                  isActive
                    ? "bg-muted text-foreground border-foreground/25"
                    : "text-sidebar-foreground border-transparent hover:text-foreground hover:bg-sidebar-accent hover:border-border"
                )
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>

      <div className="px-5 py-4 border-t border-sidebar-border space-y-2">
        <div className="rounded-none bg-muted/40 border border-border p-3">
          <div className="flex items-center gap-2 mb-0.5">
            <ShieldCheck size={14} className="text-foreground shrink-0" />
            <span className="text-xs font-medium text-foreground">Protection</span>
          </div>
          <p className="text-[10px] text-muted-foreground leading-snug truncate" title={accountHint}>
            {accountHint}
          </p>
        </div>
        <p className="text-[10px] text-muted-foreground tracking-wide">v1.0.0 · Extension dashboard</p>
      </div>
    </nav>
  );
}
