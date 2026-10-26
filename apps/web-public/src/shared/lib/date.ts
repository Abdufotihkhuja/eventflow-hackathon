import { formatDate, formatDateTime } from "@eventflow/i18n";

/**
 * Утилиты для работы с датами с API.
 * Все даты с API считаются UTC (ISO 8601, предпочтительно с суффиксом Z).
 * При выводе используйте toLocaleString / Intl.DateTimeFormat без timeZone
 * (или timeZone: undefined) — будет локальное время пользователя.
 */

const HAS_TIMEZONE_RE = /Z$|[+-]\d{2}:?\d{2}$/;
const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Нормализует дату/время в ISO 8601 с указанием таймзоны (Z) для отправки в API.
 * Бэкенд требует таймзону; без Z возвращается 400.
 * - YYYY-MM-DD → YYYY-MM-DDTHH:mm:ss.sssZ
 * - YYYY-MM-DDTHH:mm:ss (без Z) → с суффиксом Z
 * - Уже с Z или ±HH:MM — без изменений.
 */
export function toUtcIsoString(value: string): string {
  const s = String(value).trim();
  if (!s) return s;
  if (HAS_TIMEZONE_RE.test(s)) return s;
  if (DATE_ONLY_RE.test(s)) return `${s}T00:00:00.000Z`;
  return s.replace(/Z?$/, "Z");
}

/**
 * Парсит строку даты с API как UTC.
 * Если в строке нет указания зоны (Z или ±HH:MM), дополняет Z для корректной интерпретации как UTC.
 */
export function parseUtcIso(isoString: string): Date {
  const s = String(isoString).trim();
  if (!s) return new Date(Number.NaN);
  const normalized = HAS_TIMEZONE_RE.test(s) ? s : s.replace(/Z?$/, "Z");
  const date = new Date(normalized);
  return date;
}

/**
 * Форматирует дату из API (UTC ISO) в локальную строку пользователя.
 * timeZone не задаётся — используется локальная зона браузера.
 */
export function formatUtcToLocalDate(
  isoString: string,
  options: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "long",
    year: "numeric",
  },
  locale?: string
): string {
  const date = parseUtcIso(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  return formatDate(date, locale, {
    ...options,
    timeZone: undefined,
  });
}

/**
 * Форматирует дату и время из API (UTC ISO) в локальную строку.
 */
export function formatUtcToLocalDateTime(
  isoString: string,
  options: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  },
  locale?: string
): string {
  const date = parseUtcIso(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  return formatDateTime(date, locale, {
    ...options,
    timeZone: undefined,
  });
}

/**
 * Форматирует только время (локальное) из UTC ISO строки.
 */
export function formatUtcToLocalTime(
  isoString: string,
  options: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
  },
  locale?: string
): string {
  const date = parseUtcIso(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  return formatDateTime(date, locale, {
    ...options,
    timeZone: undefined,
  });
}

/**
 * Возвращает YYYY-MM-DD в локальной дате для группировки.
 * Используйте вместо date.toISOString().split("T")[0], чтобы группировать по локальному дню.
 */
export function toLocalDateKey(date: Date): string {
  if (Number.isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Известные таймзоны и их offset (минуты). Asia/Tashkent = UTC+5. */
const TZ_OFFSET_MINUTES: Record<string, number> = {
  "Asia/Tashkent": 300,
  "Asia/Samarkand": 300,
  "Europe/Moscow": 180,
  UTC: 0,
};

/**
 * Интерпретирует date+startTime как локальное время в указанной таймзоне.
 * Бэкенд может хранить локальное время с Z (ошибка): "1970-01-01T22:30:00.000Z" = 22:30 в городе события.
 * Возвращает корректный ISO UTC для последующего отображения.
 */
export function parseAgendaTimeAsLocal(
  dateStr: string,
  timeStr: string,
  timezone: string
): string {
  const d = (dateStr.split("T")[0] ?? "").trim();
  const t = (timeStr.split("T")[1] ?? timeStr).trim().replace(/\.\d{3}Z?$/i, "");
  if (!d || !t || !/^\d{4}-\d{2}-\d{2}$/.test(d) || !/^\d{1,2}:\d{2}(:\d{2})?$/.test(t)) {
    return `${d}T${t}Z`;
  }
  const [h, m, s = "00"] = t.split(":");
  const localIso = `${d}T${h.padStart(2, "0")}:${m.padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  const offsetMinutes =
    TZ_OFFSET_MINUTES[timezone] ?? getTimezoneOffsetMinutes(timezone, new Date(`${d}T12:00:00Z`));
  const offsetHours = Math.trunc(offsetMinutes / 60);
  const offsetMins = Math.abs(offsetMinutes % 60);
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const offsetStr = `${sign}${String(Math.abs(offsetHours)).padStart(2, "0")}:${String(offsetMins).padStart(2, "0")}`;
  const withOffset = `${localIso}${offsetStr}`;
  const utcDate = new Date(withOffset);
  return Number.isNaN(utcDate.getTime()) ? `${d}T${t}Z` : utcDate.toISOString();
}

/**
 * Смещение таймзоны в минутах (UTC+5 → 300). Fallback для неизвестных зон.
 */
function getTimezoneOffsetMinutes(tz: string, date: Date): number {
  try {
    const fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      timeZoneName: "longOffset",
    });
    const part = fmt.formatToParts(date).find((p) => p.type === "timeZoneName");
    const val = part?.value ?? "";
    const match = val.match(/GMT([+-])(\d{1,2}):?(\d{2})?/);
    if (match) {
      const sign = match[1] === "+" ? 1 : -1;
      const hours = parseInt(match[2], 10) || 0;
      const mins = parseInt(match[3], 10) || 0;
      return sign * (hours * 60 + mins);
    }
  } catch {
    // ignore
  }
  return 0;
}
