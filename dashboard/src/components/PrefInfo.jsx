import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Info } from "lucide-react";
import clsx from "clsx";

/** Compact “i” control: toggles description popover. */
export function PrefInfo({ description }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const btnId = useId();
  const panelId = `${btnId}-panel`;

  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((o) => !o), []);

  useEffect(() => {
    if (!open) return;
    function onDoc(e) {
      if (!rootRef.current?.contains(e.target)) {
        close();
      }
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("touchstart", onDoc, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("touchstart", onDoc);
    };
  }, [open, close]);

  if (!description) return null;

  return (
    <span ref={rootRef} className="relative inline-flex shrink-0">
      <button
        type="button"
        id={btnId}
        aria-label="What this preference does"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggle();
        }}
        className={clsx(
          "flex h-6 w-6 items-center justify-center rounded-none border border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground",
          open && "border-foreground/50 text-foreground"
        )}
      >
        <Info size={12} strokeWidth={2.25} aria-hidden />
      </button>
      {open && (
        <span
          id={panelId}
          role="tooltip"
          className="absolute left-1/2 top-full z-50 mt-1 w-[min(18rem,calc(100vw-4rem))] -translate-x-1/2 border border-border bg-card p-2 text-left text-[11px] leading-snug text-foreground shadow-md sm:left-0 sm:translate-x-0"
        >
          {description}
        </span>
      )}
    </span>
  );
}
