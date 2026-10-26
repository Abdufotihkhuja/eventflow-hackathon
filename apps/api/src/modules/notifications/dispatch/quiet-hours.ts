/**
 * Quiet hours — платформенная политика 22:00–08:00 (OQ-12, дефолт принят).
 *
 * Informational-уведомления, чей момент отправки попадает в тихое окно
 * локали события (Event.timezone ?? 'Asia/Tashkent'), сдвигаются ВПЕРЁД на
 * ближайшие 08:00. Transactional не сдвигаются (transactional-примат).
 *
 * Чистые функции без зависимостей — TZ-математика через Intl (Ташкент —
 * фиксированный UTC+5 без DST, но код честно спрашивает зону).
 */

export const PLATFORM_TIMEZONE = 'Asia/Tashkent';
export const QUIET_START_HOUR = 22; // включительно
export const QUIET_END_HOUR = 8; // исключительно (08:00 — уже не тихо)

interface ZonedParts {
  year: number;
  month: number; // 1–12
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function getZonedParts(date: Date, timeZone: string): ZonedParts {
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
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== 'literal') {
      parts[part.type] = Number(part.value);
    }
  }
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    // Intl отдаёт полночь как '24' в некоторых окружениях — нормализуем.
    hour: parts.hour === 24 ? 0 : parts.hour,
    minute: parts.minute,
    second: parts.second,
  };
}

/** Попадает ли момент в тихое окно [22:00, 08:00) локального времени зоны. */
export function isWithinQuietHours(
  date: Date,
  timeZone: string = PLATFORM_TIMEZONE,
): boolean {
  const { hour } = getZonedParts(date, timeZone);
  return hour >= QUIET_START_HOUR || hour < QUIET_END_HOUR;
}

/**
 * Сдвиг из тихого окна на ближайшие 08:00 локального времени зоны.
 * Момент вне окна возвращается как есть. Границы: 21:59 → как есть;
 * 22:00 → завтра 08:00; 07:59 → сегодня 08:00; 08:00 → как есть.
 */
export function shiftOutOfQuietHours(
  date: Date,
  timeZone: string = PLATFORM_TIMEZONE,
): Date {
  const parts = getZonedParts(date, timeZone);
  const inQuiet =
    parts.hour >= QUIET_START_HOUR || parts.hour < QUIET_END_HOUR;
  if (!inQuiet) {
    return date;
  }

  // Смещение зоны на этот момент: «локальные части, прочитанные как UTC»
  // минус сам момент (с точностью до секунды — миллисекунды Intl не отдаёт).
  const partsAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  const dateFloorSecond = Math.floor(date.getTime() / 1000) * 1000;
  const zoneOffsetMs = partsAsUtc - dateFloorSecond;

  // Вечер (>=22:00) → 08:00 следующего локального дня; ночь/утро (<08:00) →
  // 08:00 того же локального дня. Date.UTC нормализует перенос месяца/года.
  const dayShift = parts.hour >= QUIET_START_HOUR ? 1 : 0;
  const targetLocalAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day + dayShift,
    QUIET_END_HOUR,
    0,
    0,
  );
  return new Date(targetLocalAsUtc - zoneOffsetMs);
}
