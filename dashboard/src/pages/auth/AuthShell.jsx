import { useBrandLogo } from "../../hooks/useBrandLogo.js";

export function AuthShell({ title, subtitle, children }) {
  const brandLogo = useBrandLogo();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md border border-border bg-card/80 backdrop-blur-sm glow-edge pc-scan-border rounded-none p-8">
        <header className="mb-8 text-center space-y-3">
          {brandLogo ? (
            <div className="flex justify-center">
              <img src={brandLogo} alt="Private-C" className="h-12 w-12 object-contain border border-border bg-muted" width={48} height={48} />
            </div>
          ) : null}
          <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-muted-foreground">Private-C</p>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">{title}</h1>
          {subtitle && <p className="text-xs text-muted-foreground leading-relaxed">{subtitle}</p>}
        </header>
        {children}
      </div>
    </div>
  );
}
