import { Moon, Sun } from "lucide-react";
import { useTheme } from "../theme/ThemeProvider.jsx";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="fixed bottom-5 right-5 z-[100] flex items-center gap-2 border border-border bg-card/95 px-3 py-2 text-xs font-medium uppercase tracking-widest text-foreground shadow-[0_0_0_1px_hsl(var(--app-border)),0_8px_24px_hsl(0_0%_0%/0.35)] backdrop-blur-sm hover:bg-muted transition-colors rounded-none"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? <Sun size={14} className="text-muted-foreground" /> : <Moon size={14} className="text-muted-foreground" />}
      <span>{isDark ? "Light" : "Dark"}</span>
    </button>
  );
}
