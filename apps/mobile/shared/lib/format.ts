/**
 * Shared display formatters. UZS amounts, event date/time stamps, and the
 * deterministic poster seed (hue/pattern) derived from an event id so the
 * procedural posters are stable across renders without real cover art.
 */
import { env } from "@shared/config/env";
import type { Lang } from "@shared/data/events";

const LOCALE: Record<Lang, string> = { uz: "uz-UZ", ru: "ru-RU", en: "en-US" };

/** Resolve a relative `/uploads/...` path to an absolute, fetchable URL.
 *  Absolute http(s) URLs pass through unchanged. */
export function resolveMediaUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (/^https?:\/\//.test(path)) return path;
  return `${env.apiUrl}${path.startsWith("/") ? "" : "/"}${path}`;
}

/** "240 000 UZS" — grouped, no fraction. Currency defaults to UZS. */
export function formatPrice(
  amount: number,
  currency: string | null | undefined,
  lang: Lang,
): string {
  const grouped = new Intl.NumberFormat(LOCALE[lang], {
    maximumFractionDigits: 0,
  }).format(amount);
  return `${grouped} ${currency ?? "UZS"}`;
}

/** Locale-grouped integer ("1 247" / "1,247") — KPI values, list counts.
 *  One formatting style app-wide (design §9 flag: no raw `1247`). */
export function formatNumber(n: number, lang: Lang): string {
  return new Intl.NumberFormat(LOCALE[lang], { maximumFractionDigits: 0 }).format(n);
}

/** Compact month+day, e.g. "Jul 4" / "4 июл." — no weekday (kept locale-stable). */
export function formatDateStamp(iso: string, lang: Lang): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(LOCALE[lang], {
    month: "short",
    day: "numeric",
  }).format(d);
}

/** Full document date, e.g. "Jun 18, 2026" / "18 июн. 2026 г." — certificates
 *  and other archival surfaces where the year matters. */
export function formatDateFull(iso: string, lang: Lang): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(LOCALE[lang], {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

/** "июль 2026" / "July 2026" — a tenure stamp ("on EventFlow since …",
 *  "verified since …"), where the exact day is noise. */
export function formatMonthYear(iso: string, lang: Lang): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(LOCALE[lang], { month: "long", year: "numeric" }).format(d);
}

/** Day-of-month on its own, e.g. "1" — the poster plate sets it as the hero
 *  numeral, so it must not carry the month or a locale suffix. */
export function formatDayNum(iso: string, lang: Lang): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(LOCALE[lang], { day: "numeric" }).format(d);
}

/** Short month on its own, uppercased for the poster plate, e.g. "SEP" / "СЕНТ".
 *  Trailing dots are dropped — the plate sets it as a standalone label. */
export function formatMonthShort(iso: string, lang: Lang): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(LOCALE[lang], { month: "short" })
    .format(d)
    .replace(/\.$/, "")
    .toUpperCase();
}

/** 24-hour "15:00". */
export function formatTime(iso: string, lang: Lang): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(LOCALE[lang], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

/** "Вторник, 28 июля" / "Tuesday, 28 July" — the organizer home's dateline.
 *  Long weekday + day + long month: it is the only date on that screen, so it
 *  is spelled out rather than abbreviated. */
export function formatWeekdayLong(iso: string, lang: Lang): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const s = new Intl.DateTimeFormat(LOCALE[lang], {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(d);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "Wed, 1 Jul" — weekday + day + month. */
function fullDate(iso: string, lang: Lang): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(LOCALE[lang], {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(d);
}

/** Single date for same-day, else "start – end" range. */
export function formatDateRange(
  startIso: string,
  endIso: string | null | undefined,
  lang: Lang,
): string {
  const s = new Date(startIso);
  if (Number.isNaN(s.getTime())) return "";
  const e = endIso ? new Date(endIso) : null;
  const sameDay = e && s.toDateString() === e.toDateString();
  if (!e || sameDay) return fullDate(startIso, lang);
  return `${fullDate(startIso, lang)} – ${fullDate(endIso as string, lang)}`;
}

/** "09:00 – 17:30" (start only when no end). */
export function formatTimeRange(
  startIso: string,
  endIso: string | null | undefined,
  lang: Lang,
): string {
  const start = formatTime(startIso, lang);
  const end = endIso ? formatTime(endIso, lang) : "";
  return end ? `${start} – ${end}` : start;
}

/**
 * Strip a leading weekday token ("Sat, " / "сб, ") from a formatted date for
 * the compact card stamps. `\w` is Cyrillic-blind, so match any non-digit
 * token before ", " instead; dates without a weekday pass through unchanged.
 */
export function stripWeekday(date: string): string {
  return date.replace(/^[^,\d]+,\s*/, "");
}

const PATTERNS = ["sunburst", "grid", "arches", "dots", "rays"] as const;

function hash(id: string): number {
  let h = 5381;
  for (let i = 0; i < id.length; i++) h = (h * 33) ^ id.charCodeAt(i);
  return Math.abs(h);
}

/** Stable hue 0–359 from an event id. */
export function hueFromId(id: string): number {
  return hash(id) % 360;
}

/** Stable poster pattern from an event id. */
export function patternFromId(id: string): (typeof PATTERNS)[number] {
  return PATTERNS[hash(id) % PATTERNS.length];
}
