/**
 * Resolves a localized scalar field from a translations map with a graceful
 * fallback chain. Order: requested locale → any non-empty locale → scalar fallback.
 *
 * Mirrors apps/web-workspace/src/entities/event/lib/localized-field.ts so the
 * public landing pages render the right copy for the visitor's UI locale.
 */

type AppLocale = "ru" | "uz" | "en";

const LOCALE_ORDER: readonly AppLocale[] = ["ru", "uz", "en"];

function isAppLocale(value: string): value is AppLocale {
  return value === "ru" || value === "uz" || value === "en";
}

function isStringRecord(value: unknown): value is Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.values(value as Record<string, unknown>).every(
    (v) => typeof v === "string",
  );
}

export function resolveLocalizedField(
  translations: unknown,
  fieldKey: string,
  uiLocale: string,
  fallback: string | null | undefined,
): string {
  const safeFallback = (fallback ?? "").toString();

  if (
    !translations ||
    typeof translations !== "object" ||
    Array.isArray(translations)
  ) {
    return safeFallback;
  }

  const fieldEntry = (translations as Record<string, unknown>)[fieldKey];
  if (!isStringRecord(fieldEntry)) {
    return safeFallback;
  }

  if (isAppLocale(uiLocale)) {
    const direct = fieldEntry[uiLocale]?.trim();
    if (direct) return direct;
  }

  for (const locale of LOCALE_ORDER) {
    const value = fieldEntry[locale]?.trim();
    if (value) return value;
  }

  return safeFallback;
}

/**
 * Same fallback chain but for rich (BlockNote) content stored as
 * Record<fieldKey, Record<locale, Block[]>>.
 */
export function resolveLocalizedRichField<TBlock>(
  richTranslations: unknown,
  fieldKey: string,
  uiLocale: string,
  fallback: TBlock[] | null | undefined,
): TBlock[] | null {
  const safeFallback = fallback && fallback.length > 0 ? fallback : null;

  if (
    !richTranslations ||
    typeof richTranslations !== "object" ||
    Array.isArray(richTranslations)
  ) {
    return safeFallback;
  }

  const fieldEntry = (richTranslations as Record<string, unknown>)[fieldKey];
  if (
    !fieldEntry ||
    typeof fieldEntry !== "object" ||
    Array.isArray(fieldEntry)
  ) {
    return safeFallback;
  }

  const localeMap = fieldEntry as Record<string, unknown>;

  if (isAppLocale(uiLocale)) {
    const direct = localeMap[uiLocale];
    if (Array.isArray(direct) && direct.length > 0) return direct as TBlock[];
  }

  for (const locale of LOCALE_ORDER) {
    const value = localeMap[locale];
    if (Array.isArray(value) && value.length > 0) return value as TBlock[];
  }

  return safeFallback;
}
