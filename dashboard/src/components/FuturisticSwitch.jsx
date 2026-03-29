import clsx from "clsx";

export function FuturisticSwitch({ checked, onChange, disabled, id, label }) {
  return (
    <label
      htmlFor={id}
      className={clsx(
        "flex items-center gap-3 cursor-pointer select-none",
        disabled && "opacity-40 cursor-not-allowed"
      )}
    >
      <button
        type="button"
        role="switch"
        id={id}
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={clsx(
          "relative h-6 w-11 shrink-0 border border-border bg-muted transition-colors rounded-none",
          checked && "bg-foreground/15 border-foreground/25"
        )}
      >
        <span
          className={clsx(
            "absolute top-0.5 left-0.5 h-[18px] w-[18px] border border-border bg-card transition-transform rounded-none",
            checked && "translate-x-5 bg-foreground border-foreground"
          )}
        />
      </button>
      {label && <span className="text-sm text-foreground">{label}</span>}
    </label>
  );
}
