export function AuthShell({ title, subtitle, children }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md border border-border bg-card/80 backdrop-blur-sm glow-edge pc-scan-border rounded-none p-8">
        <header className="mb-8 text-center space-y-1">
          <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-muted-foreground">Private-C</p>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">{title}</h1>
          {subtitle && <p className="text-xs text-muted-foreground leading-relaxed">{subtitle}</p>}
        </header>
        {children}
      </div>
    </div>
  );
}
