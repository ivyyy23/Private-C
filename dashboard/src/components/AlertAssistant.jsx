/**
 * Floating alert panel: trench-coat silhouette + dialogue (sharp corners).
 * `variant`: info | warn | threat
 */
import clsx from "clsx";

function SpySilhouette({ className }) {
  return (
    <svg
      className={clsx("shrink-0 text-foreground", className)}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 120 160"
      fill="none"
      aria-hidden
      width={72}
      height={96}
    >
      <path
        fill="currentColor"
        d="M60 8c-8 0-14 6-15 14l-1 8c-6 2-10 8-10 15v6l-8 22 4 2 6-14v46l-12 38h10l8-28 4 28h8l4-28 8 28h10L76 94V48l6 14 4-2-8-22v-6c0-7-4-13-10-15l-1-8c-1-8-7-14-15-14Z"
      />
      <ellipse cx="60" cy="22" rx="10" ry="11" fill="currentColor" opacity="0.95" />
      <ellipse cx="55" cy="22" rx="2.2" ry="2.8" fill="var(--assistant-eye, #fff)" opacity="0.92" />
      <ellipse cx="65" cy="22" rx="2.2" ry="2.8" fill="var(--assistant-eye, #fff)" opacity="0.92" />
      <ellipse cx="55" cy="22" rx="1" ry="1.2" fill="currentColor" />
      <ellipse cx="65" cy="22" rx="1" ry="1.2" fill="currentColor" />
      <path stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.35" d="M48 52 L60 68 L72 52" />
    </svg>
  );
}

export function AlertAssistant({ message, variant = "info", className }) {
  const border =
    variant === "threat"
      ? "border-destructive/50"
      : variant === "warn"
        ? "border-warning/45"
        : "border-border";

  return (
    <aside
      className={clsx(
        "flex gap-4 border bg-card/95 p-4 max-w-md glow-edge backdrop-blur-sm rounded-none",
        border,
        className
      )}
      role="status"
    >
      <SpySilhouette className="opacity-90" />
      <div className="min-w-0 flex-1 pt-1">
        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground mb-1">Private-C</p>
        <p className="text-sm leading-relaxed text-foreground">{message}</p>
      </div>
    </aside>
  );
}
