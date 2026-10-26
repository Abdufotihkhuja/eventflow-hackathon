export const PUBLIC_BUSINESS_LOCALES = ['ru', 'uz', 'en'] as const;

export type PublicBusinessLocale = (typeof PUBLIC_BUSINESS_LOCALES)[number];

type LocaleValues = Partial<Record<PublicBusinessLocale, string>>;

export type PublicBusinessTranslations = Record<string, LocaleValues>;

function isPublicBusinessLocale(value: unknown): value is PublicBusinessLocale {
  return (
    typeof value === 'string' &&
    PUBLIC_BUSINESS_LOCALES.includes(value as PublicBusinessLocale)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readTrimmed(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizePublicBusinessLocale(
  locale: unknown,
): PublicBusinessLocale | undefined {
  if (typeof locale !== 'string') return undefined;
  const normalized = locale
    .trim()
    .toLowerCase()
    .replaceAll('_', '-')
    .split('-')[0];
  return isPublicBusinessLocale(normalized) ? normalized : undefined;
}

export function getPublicBusinessLocaleFallbackOrder(
  requestedLocale?: PublicBusinessLocale | null,
): PublicBusinessLocale[] {
  const order: PublicBusinessLocale[] = [];
  if (requestedLocale) {
    order.push(requestedLocale);
  }

  for (const locale of PUBLIC_BUSINESS_LOCALES) {
    if (!order.includes(locale)) {
      order.push(locale);
    }
  }

  return order;
}

/**
 * Returns the list of locales for which `translations[fieldKey]` contains a
 * non-empty string. Used to emit `availableLocales` on public DTOs so the
 * web app knows which locale URLs actually carry first-class content and
 * which only show fallback text (and therefore should be `noindex` to avoid
 * polluting search engines with language-mismatched pages).
 *
 * Note: the scalar fallback's language is unknown (it could be ru/uz/en),
 * so we deliberately do not infer locale coverage from it — only the
 * explicit `translations` map.
 */
export function availableLocalesFromTranslations(
  translations: unknown,
  fieldKey: string,
): PublicBusinessLocale[] {
  const fieldTranslations = isRecord(translations)
    ? translations[fieldKey]
    : undefined;
  const localeValues = isRecord(fieldTranslations) ? fieldTranslations : {};
  const result: PublicBusinessLocale[] = [];
  for (const locale of PUBLIC_BUSINESS_LOCALES) {
    if (readTrimmed(localeValues[locale])) {
      result.push(locale);
    }
  }
  return result;
}

export function resolveLocalizedBusinessField(
  translations: unknown,
  fieldKey: string,
  requestedLocale?: string | null,
  scalarFallback?: string | null,
): string {
  const locale = normalizePublicBusinessLocale(requestedLocale);
  const fieldTranslations = isRecord(translations)
    ? translations[fieldKey]
    : undefined;
  const localeValues = isRecord(fieldTranslations) ? fieldTranslations : {};

  for (const fallbackLocale of getPublicBusinessLocaleFallbackOrder(locale)) {
    const value = readTrimmed(localeValues[fallbackLocale]);
    if (value) {
      return value;
    }
  }

  return readTrimmed(scalarFallback) ?? '';
}
