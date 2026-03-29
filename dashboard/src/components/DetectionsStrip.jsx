import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { X } from "lucide-react";

function ShieldGlyph({ className }) {
  return (
    <svg
      className={clsx("shrink-0 text-foreground", className)}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M12 2.5 20 5.2v5.8c0 4.2-2.8 8.2-8 9.8-5.2-1.6-8-5.6-8-9.8V5.2L12 2.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="miter"
      />
    </svg>
  );
}

/**
 * Count (top-left), View all → modal with blurred backdrop, Clear all outside strip.
 * Strip shows one line; X advances to next.
 */
export function DetectionsStrip({ items: itemsProp = [] }) {
  const [items, setItems] = useState(() => itemsProp.slice(0, 5));
  const [allOpen, setAllOpen] = useState(false);

  useEffect(() => {
    setItems(itemsProp.slice(0, 5));
  }, [itemsProp]);

  const clearAll = useCallback(() => {
    setItems([]);
    setAllOpen(false);
  }, []);

  const dismissCurrent = useCallback(() => {
    setItems((prev) => prev.slice(1));
  }, []);

  useEffect(() => {
    if (!allOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") setAllOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [allOpen]);

  if (items.length === 0) {
    return null;
  }

  const current = items[0];
  const count = items.length;

  const modal =
    allOpen &&
    createPortal(
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="pc-detections-modal-title">
        <button
          type="button"
          className="absolute inset-0 bg-background/65 backdrop-blur-md"
          aria-label="Close"
          onClick={() => setAllOpen(false)}
        />
        <div className="relative z-10 flex max-h-[min(85vh,560px)] w-full max-w-lg flex-col border border-border bg-card shadow-[0_0_0_1px_hsl(var(--app-border)),0_24px_48px_hsl(0_0%_0%/0.4)] rounded-none">
          <header className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-4 py-3">
            <div className="min-w-0">
              <p id="pc-detections-modal-title" className="text-sm font-semibold text-foreground">
                New alerts
              </p>
              <p className="mt-0.5 font-mono text-xs tabular-nums text-muted-foreground">{count} total</p>
            </div>
            <button
              type="button"
              onClick={() => setAllOpen(false)}
              className="flex h-8 w-8 shrink-0 items-center justify-center border border-border bg-background text-muted-foreground hover:text-foreground rounded-none"
              aria-label="Close dialog"
            >
              <X size={16} strokeWidth={2.25} />
            </button>
          </header>
          <ul className="min-h-0 flex-1 list-none overflow-y-auto divide-y divide-border p-0 m-0" role="list">
            {items.map((item, i) => (
              <li key={item.id} className="px-4 py-3 text-sm leading-snug text-foreground/90">
                <span className="mr-2 inline-block w-5 font-mono text-[11px] tabular-nums text-muted-foreground">{i + 1}.</span>
                {item.text}
              </li>
            ))}
          </ul>
        </div>
      </div>,
      document.body
    );

  return (
    <div className="w-full shrink-0 space-y-1.5">
      {modal}

      <div className="flex items-center justify-between gap-2 px-0.5">
        <span
          className="inline-flex min-h-[1.5rem] min-w-[1.5rem] items-center justify-center border border-border bg-muted px-2 font-mono text-xs font-semibold tabular-nums text-foreground"
          title={`${count} alert${count === 1 ? "" : "s"}`}
          aria-label={`${count} alerts`}
        >
          {count}
        </span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setAllOpen(true)}
            className="text-[10px] font-semibold uppercase tracking-wide text-foreground underline-offset-2 hover:underline"
          >
            View all
          </button>
          <button
            type="button"
            onClick={clearAll}
            className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
          >
            Clear all
          </button>
        </div>
      </div>

      <aside
        className="relative flex h-12 w-full max-h-12 items-stretch overflow-hidden border border-border bg-card/95 glow-edge rounded-none select-none"
        role="status"
        aria-live="polite"
        aria-label="New detections"
      >
        <div className="flex shrink-0 items-center border-r border-border/60 px-2.5" aria-hidden>
          <ShieldGlyph className="opacity-90" />
        </div>

        <div className="flex min-w-0 flex-1 items-center py-2 pl-3 pr-11">
          <p className="min-w-0 flex-1 truncate text-sm leading-tight text-foreground" title={current.text}>
            {current.text}
          </p>
        </div>

        <button
          type="button"
          onClick={dismissCurrent}
          className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center border border-border bg-background text-muted-foreground hover:text-foreground rounded-none"
          aria-label="Dismiss this alert and show next"
        >
          <X size={14} strokeWidth={2.25} />
        </button>
      </aside>
    </div>
  );
}
