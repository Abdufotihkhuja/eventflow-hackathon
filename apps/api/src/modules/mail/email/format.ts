import type { Locale } from './types';

/**
 * Дефолтная таймзона платформы (UZ-only): используется, когда у события
 * `Event.timezone` не заполнена или невалидна (NOTIFICATIONS_CATALOG §6, OQ-18).
 * Зеркалит PLATFORM_TIMEZONE из modules/notifications/dispatch/quiet-hours.ts.
 */
export const PLATFORM_TIMEZONE = 'Asia/Tashkent';

const INTL_LOCALE: Record<Locale, string> = {
  ru: 'ru-RU',
  en: 'en-GB',
  uz: 'uz-Latn-UZ',
};

/**
 * Форматирует момент времени для писем в таймзоне события
 * (`Event.timezone ?? 'Asia/Tashkent'`) и локали получателя,
 * например «22 мая 2026 г., 10:00» / "22 May 2026, 10:00".
 *
 * Терпим к мусору на входе (BL-26): невалидная дата → пустая строка
 * (билдер сам решает, показывать ли строку), невалидная таймзона →
 * фолбэк на Asia/Tashkent.
 */
export function formatEventDateTime(
  value: unknown,
  timezone: unknown,
  locale: Locale,
): string {
  const date =
    value instanceof Date
      ? value
      : typeof value === 'string' || typeof value === 'number'
        ? new Date(value)
        : null;
  if (!date || Number.isNaN(date.getTime())) return '';

  const options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  };
  const tz =
    typeof timezone === 'string' && timezone.trim()
      ? timezone.trim()
      : PLATFORM_TIMEZONE;

  try {
    return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
      ...options,
      timeZone: tz,
    }).format(date);
  } catch {
    // Невалидная IANA-зона в Event.timezone — не повод уронить письмо.
    return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
      ...options,
      timeZone: PLATFORM_TIMEZONE,
    }).format(date);
  }
}
