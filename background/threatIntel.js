/**
 * Live threat lookups with chrome.storage.local caching (no static demo host map).
 * Providers: Google Safe Browsing v4 (API key), abuse.ch URLhaus (host, no key), optional PhishTank (app key).
 */
(function () {
  const CACHE_KEY = "privateCThreatIntelCache";
  const DEFAULT_TTL_MS = 45 * 60 * 1000;
  const MAX_CACHE_KEYS = 400;

  function cacheTtl(state) {
    const n = Number(state?.threatIntelCacheTtlMs);
    return Number.isFinite(n) && n >= 60_000 && n <= 24 * 60 * 60 * 1000 ? n : DEFAULT_TTL_MS;
  }

  async function readCache() {
    const data = await chrome.storage.local.get(CACHE_KEY);
    const raw = data[CACHE_KEY];
    return raw && typeof raw === "object" ? raw : {};
  }

  async function writeCache(map) {
    const keys = Object.keys(map);
    if (keys.length > MAX_CACHE_KEYS) {
      keys
        .map((k) => ({ k, at: map[k]?.at || 0 }))
        .sort((a, b) => a.at - b.at)
        .slice(0, keys.length - MAX_CACHE_KEYS)
        .forEach(({ k }) => delete map[k]);
    }
    await chrome.storage.local.set({ [CACHE_KEY]: map });
  }

  async function cacheGet(state, key) {
    const map = await readCache();
    const row = map[key];
    if (!row || typeof row.expiresAt !== "number") return null;
    if (Date.now() > row.expiresAt) return null;
    return row.value;
  }

  async function cacheSet(state, key, value) {
    const map = await readCache();
    map[key] = { at: Date.now(), expiresAt: Date.now() + cacheTtl(state), value };
    await writeCache(map);
  }

  async function checkSafeBrowsing(fullUrl, apiKey) {
    if (!apiKey || !fullUrl) return null;
    const body = {
      client: { clientId: "private-c-extension", clientVersion: "1.0.0" },
      threatInfo: {
        threatTypes: [
          "MALWARE",
          "SOCIAL_ENGINEERING",
          "UNWANTED_SOFTWARE",
          "POTENTIALLY_HARMFUL_APPLICATION",
        ],
        platformTypes: ["ANY_PLATFORM"],
        threatEntryTypes: ["URL"],
        threatEntries: [{ url: fullUrl }],
      },
    };
    const res = await fetch(
      `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Safe Browsing ${res.status}: ${t.slice(0, 200)}`);
    }
    const data = await res.json();
    const matches = data?.matches;
    if (!Array.isArray(matches) || matches.length === 0) return null;

    let worst = "medium";
    const types = new Set(matches.map((m) => m.threatType).filter(Boolean));
    if (types.has("MALWARE") || types.has("SOCIAL_ENGINEERING")) worst = "high";
    else if (types.has("UNWANTED_SOFTWARE") || types.has("POTENTIALLY_HARMFUL_APPLICATION")) worst = "medium";

    const reason = `Google Safe Browsing: ${[...types].join(", ") || "threat match"}`;
    const assistantLine =
      worst === "high"
        ? "This URL appears on Google Safe Browsing as dangerous. Do not enter credentials or download files."
        : "Google Safe Browsing flagged this URL. Proceed with caution and avoid downloads.";
    return { severity: worst, reason, assistantLine, source: "safeBrowsing" };
  }

  async function checkUrlhaus(host, authKey) {
    if (!host) return null;
    const headers = { "Content-Type": "application/json" };
    const ak = typeof authKey === "string" ? authKey.trim() : "";
    if (ak) headers["Auth-Key"] = ak;
    const res = await fetch("https://urlhaus-api.abuse.ch/v1/host/", {
      method: "POST",
      headers,
      body: JSON.stringify({ host }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.query_status !== "ok") return null;
    const n = Number(data.url_count || 0);
    if (!Number.isFinite(n) || n <= 0) return null;
    return {
      severity: "high",
      reason: `URLhaus: ${n} malware URL(s) associated with this host`,
      assistantLine:
        "This host is linked to malware distribution (URLhaus). Avoid downloads and sensitive logins.",
      source: "urlhaus",
    };
  }

  async function checkPhishTank(fullUrl, appKey) {
    if (!appKey || !fullUrl) return null;
    const u = `https://checkurl.phishtank.com/checkurl/?url=${encodeURIComponent(fullUrl)}&format=json&app_key=${encodeURIComponent(appKey)}`;
    const res = await fetch(u, { method: "GET" });
    if (!res.ok) return null;
    const data = await res.json();
    const results = data?.results;
    if (!results?.in_database || !results?.valid) return null;
    return {
      severity: "high",
      reason: "PhishTank: URL reported as phishing",
      assistantLine: "This URL is listed as a phishing site (PhishTank). Do not enter passwords or payment details.",
      source: "phishtank",
    };
  }

  function mergeThreats(a, b) {
    if (!a) return b;
    if (!b) return a;
    const order = { high: 3, medium: 2, low: 1 };
    const sa = order[a.severity] || 0;
    const sb = order[b.severity] || 0;
    if (sb > sa) return b;
    if (sa > sb) return a;
    return {
      severity: a.severity,
      reason: `${a.reason}; ${b.reason}`,
      assistantLine: a.severity === "high" ? a.assistantLine : b.assistantLine,
      source: `${a.source}+${b.source}`,
    };
  }

  /**
   * @returns {Promise<{ severity: string, reason: string, assistantLine: string, source?: string } | null>}
   */
  self.pcLookupThreatIntel = async function pcLookupThreatIntel(fullUrl, host, state) {
    const h = typeof host === "string" ? host.toLowerCase().trim() : "";
    if (!h || !fullUrl) return null;

    const cacheKey = `u:${fullUrl}`;
    const cached = await cacheGet(state, cacheKey);
    if (cached === false) return null;
    if (cached && typeof cached === "object" && cached.severity) return cached;

    const key = String(state?.safeBrowsingApiKey || "").trim();
    const phishKey = String(state?.phishtankApiKey || "").trim();
    const urlhausOn = state?.threatIntelUrlhausEnabled !== false;

    const tasks = [];
    if (key) {
      tasks.push(
        checkSafeBrowsing(fullUrl, key).catch((e) => {
          console.warn("Private-C Safe Browsing", e?.message || e);
          return null;
        })
      );
    }
    if (urlhausOn) {
      const uhAuth = String(state?.urlhausAuthKey || "").trim();
      tasks.push(
        checkUrlhaus(h, uhAuth).catch((e) => {
          console.warn("Private-C URLhaus", e?.message || e);
          return null;
        })
      );
    }
    if (phishKey) {
      tasks.push(
        checkPhishTank(fullUrl, phishKey).catch((e) => {
          console.warn("Private-C PhishTank", e?.message || e);
          return null;
        })
      );
    }

    if (tasks.length === 0) {
      return null;
    }

    const parts = await Promise.all(tasks);
    let merged = null;
    for (const p of parts) {
      merged = mergeThreats(merged, p);
    }

    await cacheSet(state, cacheKey, merged || false);
    return merged;
  };
})();
