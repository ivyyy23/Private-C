import clsx from "clsx";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "../theme/ThemeProvider.jsx";

/** Inline control for Settings (no global floating toggle). */
export function ThemeToggle({ className }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={clsx(
        "flex items-center gap-2 border border-border bg-card px-3 py-2 text-xs font-medium uppercase tracking-widest text-foreground transition-colors hover:bg-muted rounded-none",
        className
      )}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? <Sun size={14} className="text-muted-foreground" /> : <Moon size={14} className="text-muted-foreground" />}
      <span>{isDark ? "Light" : "Dark"}</span>
    </button>
  );
}
