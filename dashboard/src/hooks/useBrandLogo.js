import { useEffect, useState } from "react";

/**
 * Extension dashboard: packaged `assets/Logo.png`.
 * Vite dev: `public/Logo.png`.
 */
export function useBrandLogo() {
  const [src, setSrc] = useState("");

  useEffect(() => {
    if (typeof chrome !== "undefined" && chrome.runtime?.getURL) {
      setSrc(`${chrome.runtime.getURL("assets/Logo.png")}?v=2`);
    } else {
      setSrc("../../../Logo.png");
    }
  }, []);

  return src;
}
