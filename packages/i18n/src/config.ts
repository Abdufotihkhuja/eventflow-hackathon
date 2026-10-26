export const SUPPORTED_LOCALES = ["en", "ru", "uz"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const fallbackLocale: Locale = "en";

export const localeStorageKey = "eventflow.locale";

export const localeCookieName = "eventflow.locale";

export const localeCookieMaxAge = 60 * 60 * 24 * 365;

export const localeLabels: Record<Locale, string> = {
  en: "English",
  ru: "Русский",
  uz: "O‘zbekcha",
};

export function isSupportedLocale(value: unknown): value is Locale {
  return typeof value === "string" && SUPPORTED_LOCALES.includes(value as Locale);
}

export function normalizeLocale(value: unknown): Locale | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase().replaceAll("_", "-");
  const baseLocale = normalized.split("-")[0];

  return isSupportedLocale(baseLocale) ? baseLocale : null;
}
