import { PLATFORM_TIMEZONE } from '../dispatch/quiet-hours';

/**
 * Общие хелперы пяти цепочек (Батч 6б): dedup-ключи, TZ-математика,
 * форматирование времени. Форматы ключей — колонка «Dedup key»
 * NOTIFICATIONS_CATALOG §3–7; любое отклонение задокументировано на месте.
 */

/** Окно квантования dedup-ключей модерации (анти-дребезг submit/undo, MOD §3). */
export const MOD_WINDOW_SECONDS = 600;

export function epochSeconds(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

/** eventVersion каталога: epoch-секунды даты на момент планирования. */
export function eventVersion(date: Date): number {
  return epochSeconds(date);
}

/** 10-минутный квант модерационных ключей: {submitEpoch÷600}. */
export function moderationWindow(date: Date): number {
  return Math.floor(epochSeconds(date) / MOD_WINDOW_SECONDS);
}

/** TZ события: Event.timezone ?? платформенный дефолт (OQ-18). */
export function resolveEventTimezone(
  timezone: string | null | undefined,
): string {
  return timezone ?? PLATFORM_TIMEZONE;
}

/** 'HH:mm' в заданной IANA-зоне (holdUntil у REG-02, startTime у REM-01). */
export function formatTimeInZone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    timeZone,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/** 'yyyy-mm-dd' локального дня зоны (ключи дайджеста REG-22 и чек-ина REG-09). */
export function formatDateKeyInZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
  return parts; // en-CA даёт ровно YYYY-MM-DD
}

/**
 * Ближайший будущий момент `hour:00` локального времени зоны (фабрика
 * digest-строк 09:00 Asia/Tashkent, OQ-15). Если сегодняшние hour:00 уже
 * прошли — завтрашние.
 */
export function nextLocalHour(
  from: Date,
  hour: number,
  timeZone: string,
): Date {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts: Record<string, number> = {};
  for (const part of formatter.formatToParts(from)) {
    if (part.type !== 'literal') {
      parts[part.type] = Number(part.value);
    }
  }
  const localHour = parts.hour === 24 ? 0 : parts.hour;
  // Смещение зоны: локальные части, прочитанные как UTC, минус сам момент.
  const partsAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    localHour,
    parts.minute,
    parts.second,
  );
  const zoneOffsetMs =
    partsAsUtc - Math.floor(from.getTime() / 1000) * 1000;
  const dayShift = localHour >= hour ? 1 : 0;
  const targetLocalAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day + dayShift,
    hour,
    0,
    0,
  );
  return new Date(targetLocalAsUtc - zoneOffsetMs);
}

/** Минорные единицы (тийины) → строка мажорных для email-контекста ('150 000'). */
export function formatAmountMajor(amountMinor: bigint): string {
  const major = amountMinor / 100n;
  return major
    .toString(10)
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}
