const nf = (min: number, max: number) =>
  new Intl.NumberFormat("tr-TR", { minimumFractionDigits: min, maximumFractionDigits: max });

const cache = new Map<string, Intl.NumberFormat>();
function num(min: number, max: number) {
  const key = `${min}-${max}`;
  let f = cache.get(key);
  if (!f) {
    f = nf(min, max);
    cache.set(key, f);
  }
  return f;
}

export function fmtNum(v: number | null | undefined, digits = 2, minDigits = digits): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  return num(minDigits, digits).format(v);
}

export function fmtUsd(v: number | null | undefined, digits = 2): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  return `${num(digits, digits).format(v)} $`;
}

export function fmtSigned(v: number | null | undefined, digits = 2, suffix = ""): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  const s = num(digits, digits).format(Math.abs(v));
  return `${v > 0 ? "+" : v < 0 ? "−" : ""}${s}${suffix}`;
}

/** Percent from a ratio (0.123 -> %12,3). Turkish puts the sign before the number. */
export function fmtPct(ratio: number | null | undefined, digits = 1): string {
  if (ratio === null || ratio === undefined || Number.isNaN(ratio)) return "—";
  const v = ratio * 100;
  const s = num(digits, digits).format(Math.abs(v));
  return `${v < 0 && s.replace(/[0,.]/g, "") !== "" ? "−" : ""}%${s}`;
}

/** Signed percent from a value already in percent units (1.5 -> +%1,50). */
export function fmtSignedPct(pct: number | null | undefined, digits = 2): string {
  if (pct === null || pct === undefined || Number.isNaN(pct)) return "—";
  const sign = pct > 0 ? "+" : pct < 0 ? "−" : "";
  return `${sign}%${num(digits, digits).format(Math.abs(pct))}`;
}

export function fmtPrice(v: number | null | undefined, digits?: number): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  const d = digits ?? (v >= 1000 ? 2 : v >= 1 ? 4 : v >= 0.01 ? 5 : 8);
  return num(d, d).format(v);
}

export function priceDigits(v: number): number {
  return v >= 1000 ? 2 : v >= 1 ? 4 : v >= 0.01 ? 5 : 8;
}

export function fmtR(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  return `${fmtSigned(v, 2)}R`;
}

export function fmtQty(v: number): string {
  return v >= 100 ? fmtNum(v, 2) : v >= 1 ? fmtNum(v, 4) : fmtNum(v, 6, 2);
}

const dtf = new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
const df = new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short", year: "numeric" });
const tf = new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

export const fmtDateTime = (ts: number) => dtf.format(new Date(ts * 1000));
export const fmtDate = (ts: number) => df.format(new Date(ts * 1000));
export const fmtTime = (ts: number) => tf.format(new Date(ts * 1000));

export function fmtDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "—";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}g ${h}sa`;
  if (h > 0) return `${h}sa ${m}dk`;
  if (m > 0) return `${m}dk`;
  return `${Math.max(0, Math.floor(seconds))}sn`;
}

export function fmtAgo(ts: number): string {
  const s = Date.now() / 1000 - ts;
  if (s < 5) return "şimdi";
  return `${fmtDuration(s)} önce`;
}

export const base = (symbol: string) => symbol.split("/")[0];

export const tone = (v: number | null | undefined) =>
  v === null || v === undefined || v === 0 ? "text-muted" : v > 0 ? "text-up" : "text-down";
