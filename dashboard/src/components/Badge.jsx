import clsx from "clsx";

export function Badge({ level, children }) {
  const classes = {
    critical: "bg-red-500/15 text-red-400 border-red-500/30",
    high:     "bg-orange-500/15 text-orange-400 border-orange-500/30",
    medium:   "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    low:      "bg-muted text-muted-foreground border-border",
    info:     "bg-muted text-foreground/80 border-border",
  };
  return (
    <span
      className={clsx(
        "inline-flex items-center px-2 py-0.5 rounded-none text-xs font-semibold border uppercase tracking-wider",
        classes[level] ?? classes.info
      )}
    >
      {children ?? level}
    </span>
  );
}
