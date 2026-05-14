/** Normalize club names for fuzzy matching across OpenFootball vs FotMob/SofaScore. */

export function normalizeClubName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(fc|sc|ac|ec|cd|cf|pe|ce|ba|rj|pr|go|mg|rs|sp)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function namesLikelyMatch(a: string, b: string): boolean {
  const na = normalizeClubName(a);
  const nb = normalizeClubName(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  const ta = new Set(na.split(/\s+/).filter((w) => w.length > 2));
  const tb = new Set(nb.split(/\s+/).filter((w) => w.length > 2));
  let overlap = 0;
  for (const w of ta) {
    if (tb.has(w)) overlap += 1;
  }
  return overlap >= 1 && (overlap / Math.min(ta.size, tb.size || 1)) >= 0.5;
}

/** YYYYMMDD from ISO date yyyy-mm-dd */
export function toYmdCompact(isoDate: string): string {
  if (!isoDate || typeof isoDate !== "string") return "19700101";
  return isoDate.slice(0, 10).replace(/-/g, "");
}

export function addDaysYmd(ymd: string, delta: number): string {
  const y = Number(ymd.slice(0, 4));
  const m = Number(ymd.slice(4, 6)) - 1;
  const d = Number(ymd.slice(6, 8));
  const dt = new Date(Date.UTC(y, m, d + delta));
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}${mm}${dd}`;
}

export function isoToUtcMidnightMs(isoDate: string): number {
  const [y, m, d] = isoDate.slice(0, 10).split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

/** True if `a` is the same calendar day as `b` in UTC, or within ±1 day. */
export function dateWithinOneDay(isoA: string, isoB: string): boolean {
  const da = isoToUtcMidnightMs(isoA);
  const db = isoToUtcMidnightMs(isoB);
  return Math.abs(da - db) <= 86400000;
}
