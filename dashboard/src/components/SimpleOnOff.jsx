/** Plain Off / On control (no animated switch). */
export function SimpleOnOff({ value, onChange, disabled, labelledBy }) {
  return (
    <div
      className="flex border border-border shrink-0"
      role="group"
      aria-labelledby={labelledBy}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(false)}
        className={`px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition-colors ${
          !value ? "bg-foreground text-background" : "bg-transparent text-muted-foreground hover:text-foreground"
        } disabled:opacity-40`}
      >
        Off
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(true)}
        className={`border-l border-border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition-colors ${
          value ? "bg-foreground text-background" : "bg-transparent text-muted-foreground hover:text-foreground"
        } disabled:opacity-40`}
      >
        On
      </button>
    </div>
  );
}
