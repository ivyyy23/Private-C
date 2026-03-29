/**
 * Derive dashboard datasets from extension storage (tracker log + state).
 * No mock rows — empty arrays / zeroed charts when there is no telemetry yet.
 */

const DAY_MS = 86400000;

function dayKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseTs(entry) {
  const raw = entry?.timestamp || entry?.last_ts;
  if (!raw) return null;
  const t = new Date(raw).getTime();
  return Number.isFinite(t) ? t : null;
}

/** Last `days` calendar days, Mon–Sun style label + counts from tracker log. */
export function buildDailyActivityFromLog(log, days = 7) {
  const logArr = Array.isArray(log) ? log : [];
  const now = new Date();
  const keys = [];
  const short = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    keys.push(dayKey(d));
  }
  const map = new Map();
  for (const k of keys) {
    map.set(k, { day: "", blocked: 0, trackers: 0, alerts: 0 });
  }
  for (let i = 0; i < keys.length; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1 - i));
    const row = map.get(keys[i]);
    row.day = `${short[d.getDay()]} ${d.getMonth() + 1}/${d.getDate()}`;
  }
  for (const e of logArr) {
    const t = parseTs(e);
    if (t == null) continue;
    const dk = dayKey(new Date(t));
    if (!map.has(dk)) continue;
    const row = map.get(dk);
    const hits = Math.max(1, Number(e.hit_count) || 1);
    row.trackers += hits;
    const act = String(e.action || "").toLowerCase();
    if (act.includes("block")) row.blocked += hits;
  }
  return keys.map((k) => {
    const r = map.get(k);
    return { day: r.day, blocked: r.blocked, trackers: r.trackers, alerts: r.alerts };
  });
}

/** Top tracker domains by total hit weight. */
export function buildTopDomainsFromLog(log, limit = 8) {
  const logArr = Array.isArray(log) ? log : [];
  const weights = new Map();
  for (const e of logArr) {
    const host = String(e.tracker_domain || "").toLowerCase();
    if (!host) continue;
    const w = Math.max(1, Number(e.hit_count) || 1);
    weights.set(host, (weights.get(host) || 0) + w);
  }
  return [...weights.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([domain, count]) => ({ domain, count }));
}

function formatRelative(iso) {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "—";
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

/** Feed for dashboard “Recent activity” list. */
export function buildRecentActivityFromLog(log, limit = 14) {
  const logArr = Array.isArray(log) ? [...log] : [];
  logArr.sort((a, b) => {
    const ta = parseTs(a) || 0;
    const tb = parseTs(b) || 0;
    return tb - ta;
  });
  return logArr.slice(0, limit).map((e, i) => {
    const act = String(e.action || "").toLowerCase();
    const type = act.includes("block") ? "blocked" : "tracker";
    const text = `${e.source_site || "?"} — ${e.tracker_domain || "tracker"} (${e.category || "network"})`;
    return {
      id: e.id || `ra-${i}-${e.tracker_domain}`,
      text,
      time: formatRelative(e.timestamp),
      type,
    };
  });
}

/** Compact lines for DetectionsStrip. */
export function buildDetectionsFromLog(log, limit = 5) {
  const logArr = Array.isArray(log) ? log : [];
  const sorted = [...logArr].sort((a, b) => (parseTs(b) || 0) - (parseTs(a) || 0));
  const out = [];
  const seen = new Set();
  for (const e of sorted) {
    const key = `${e.source_site}|${e.tracker_domain}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const text = `${e.tracker_domain} on ${e.source_site} · ${e.category || "tracker"}`;
    out.push({ id: e.id || `nd-${key}`, text });
    if (out.length >= limit) break;
  }
  return out;
}

/** Per-source-site rollup for privacy-style cards. */
export function buildPrivacyReportsFromLog(log, limit = 12) {
  const logArr = Array.isArray(log) ? log : [];
  const bySite = new Map();
  for (const e of logArr) {
    const site = String(e.source_site || "").toLowerCase();
    if (!site) continue;
    if (!bySite.has(site)) {
      bySite.set(site, {
        trackers: new Set(),
        categories: new Set(),
        hits: 0,
        sample: e,
      });
    }
    const agg = bySite.get(site);
    if (e.tracker_domain) agg.trackers.add(e.tracker_domain);
    if (e.category) agg.categories.add(e.category);
    agg.hits += Math.max(1, Number(e.hit_count) || 1);
    const t = parseTs(e);
    const prev = parseTs(agg.sample);
    if (t != null && (prev == null || t > prev)) agg.sample = e;
  }
  const rows = [...bySite.entries()]
    .map(([site, agg]) => {
      const n = agg.trackers.size;
      const score = Math.max(5, Math.min(92, 78 - Math.min(60, n * 4 + Math.floor(agg.hits / 20))));
      const risky = [...agg.categories].slice(0, 4).map((c) => `Third-party: ${c}`);
      if (risky.length === 0) risky.push("Cross-site network requests observed");
      return {
        id: `pr-${site}`,
        site,
        privacy_score: score,
        trackers: n,
        risky_policies: risky,
        plain_reason:
          agg.sample?.plain_reason ||
          `${site} contacted ${n} distinct tracker-related host${n === 1 ? "" : "s"} while you browsed (live network log).`,
        technical_reason:
          agg.sample?.technical_reason ||
          `Aggregated ${agg.hits} classified requests across ${n} tracker domains.`,
        recommendation:
          agg.sample?.recommendation ||
          "Use per-site options in the extension popup to tighten cookies and trackers.",
      };
    })
    .sort((a, b) => b.trackers - a.trackers)
    .slice(0, limit);
  return rows;
}

const LOGINISH_CATEGORIES = /session|fingerprint|ip endpoint|social|analytics/i;

/** Heuristic “login / sensitive” signals from live tracker classifications (no separate login DB yet). */
export function buildLoginAlertsFromLog(log, limit = 20) {
  const logArr = [...(Array.isArray(log) ? log : [])].sort((a, b) => (parseTs(b) || 0) - (parseTs(a) || 0));
  const out = [];
  const seen = new Set();
  for (const e of logArr) {
    const cat = String(e.category || "");
    if (!LOGINISH_CATEGORIES.test(cat)) continue;
    const site = String(e.source_site || "").toLowerCase();
    if (!site) continue;
    const key = `${site}-${cat}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const level =
      /fingerprint|session/i.test(cat) ? "high" : /ip endpoint/i.test(cat) ? "medium" : "low";
    out.push({
      id: `la-${key}`,
      site,
      risk: cat,
      risk_level: level,
      recommendation:
        e.recommendation ||
        "Review this site before entering credentials. Consider stricter blocking in Private-C options.",
      timestamp: e.timestamp || new Date().toISOString(),
      plain_reason:
        e.plain_reason ||
        `Sensitive-classified request (${cat}) observed while visiting ${site}.`,
      technical_reason:
        e.technical_reason ||
        [e.last_resource_type && `Resource: ${e.last_resource_type}`, e.last_sample_url && `Sample: ${e.last_sample_url}`]
          .filter(Boolean)
          .join(" · ") ||
        "—",
      detail: cat,
    });
    if (out.length >= limit) break;
  }
  return out;
}

export function countAlertsTodayFromLog(log) {
  const logArr = Array.isArray(log) ? log : [];
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const t0 = start.getTime();
  let n = 0;
  for (const e of logArr) {
    const t = parseTs(e);
    if (t != null && t >= t0) n += 1;
  }
  return n;
}
