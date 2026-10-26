import { fallbackLocale, normalizeLocale, type Locale } from "./config.js";

export type DateInput = Date | string | number;

export function toIntlLocale(locale: Locale | string | null | undefined): string {
  const normalizedLocale = normalizeLocale(locale) ?? fallbackLocale;

  if (normalizedLocale === "en") {
    return "en-US";
  }

  if (normalizedLocale === "ru") {
    return "ru-RU";
  }

  return "uz-Latn-UZ";
}

function toDate(value: DateInput): Date | null {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function hasDateTimeOptions(options: Intl.DateTimeFormatOptions | undefined): boolean {
  return options != null && Object.keys(options).length > 0;
}

export function formatDate(
  value: DateInput,
  locale: Locale | string | null | undefined = fallbackLocale,
  options?: Intl.DateTimeFormatOptions,
): string {
  const date = toDate(value);

  if (!date) {
    return "";
  }

  return new Intl.DateTimeFormat(
    toIntlLocale(locale),
    hasDateTimeOptions(options) ? options : { dateStyle: "medium" },
  ).format(date);
}

export function formatDateTime(
  value: DateInput,
  locale: Locale | string | null | undefined = fallbackLocale,
  options?: Intl.DateTimeFormatOptions,
): string {
  const date = toDate(value);

  if (!date) {
    return "";
  }

  return new Intl.DateTimeFormat(
    toIntlLocale(locale),
    hasDateTimeOptions(options) ? options : { dateStyle: "medium", timeStyle: "short" },
  ).format(date);
}

export function formatNumber(
  value: number,
  locale: Locale | string | null | undefined = fallbackLocale,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(toIntlLocale(locale), options).format(value);
}

export function formatCurrency(
  value: number,
  currency: string,
  locale: Locale | string | null | undefined = fallbackLocale,
  options?: Intl.NumberFormatOptions,
): string {
  return formatNumber(value, locale, {
    style: "currency",
    currency,
    ...options,
  });
}

export function getDateFnsLocale<TLocale>(
  locale: Locale | string | null | undefined,
  localeMap: Partial<Record<Locale, TLocale>> & Record<typeof fallbackLocale, TLocale>,
): TLocale {
  const normalizedLocale = normalizeLocale(locale) ?? fallbackLocale;
  return localeMap[normalizedLocale] ?? localeMap[fallbackLocale];
}
