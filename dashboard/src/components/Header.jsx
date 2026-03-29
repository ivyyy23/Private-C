import { Bell } from "lucide-react";

export function Header({ title, subtitle }) {
  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-20">
      <div>
        <h1 className="font-semibold text-lg text-foreground tracking-tight leading-none">{title}</h1>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-[11px] text-foreground bg-muted border border-border px-2.5 py-1 rounded-none">
          <span className="w-1.5 h-1.5 bg-success animate-pulse rounded-none" />
          Protected
        </div>
        <button
          type="button"
          className="relative text-muted-foreground hover:text-foreground p-1.5 rounded-none hover:bg-muted transition-colors"
          aria-label="Notifications"
        >
          <Bell size={16} />
          <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-destructive rounded-none border border-card" />
        </button>
      </div>
    </header>
  );
}
