import { createContext, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "privateCUiTheme";

const ThemeContext = createContext({
  theme: "dark",
  setTheme: () => {},
  toggleTheme: () => {},
});

function readStoredTheme() {
  if (typeof chrome !== "undefined" && chrome.storage?.local) {
    return null;
  }
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    const t = readStoredTheme();
    return t === "light" || t === "dark" ? t : "dark";
  });

  useEffect(() => {
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      chrome.storage.local.get(STORAGE_KEY, (r) => {
        const t = r[STORAGE_KEY];
        if (t === "light" || t === "dark") {
          setThemeState(t);
        }
      });
    }
  }, []);

  useEffect(() => {
    const el = document.documentElement;
    el.dataset.uiTheme = theme;
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      chrome.storage.local.set({ [STORAGE_KEY]: theme });
    } else {
      try {
        localStorage.setItem(STORAGE_KEY, theme);
      } catch {
        /* ignore */
      }
    }
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      setTheme: setThemeState,
      toggleTheme: () => setThemeState((t) => (t === "dark" ? "light" : "dark")),
    }),
    [theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
