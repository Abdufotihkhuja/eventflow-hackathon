export { SUPPORTED_LOCALES, fallbackLocale, isSupportedLocale, localeCookieName, localeLabels, localeStorageKey, normalizeLocale, type Locale, } from "./config.js";
export { formatCurrency, formatDate, formatDateTime, formatNumber, getDateFnsLocale, toIntlLocale } from "./format.js";
export { interpolate } from "./interpolation.js";
export { en, messagesByLocale, ru, uz } from "./locales.js";
export { plural, type LocalizedPluralForms, type PluralCategory, type PluralForms, } from "./plural.js";
export { createLocaleCookie, getBrowserLocale, getInitialLocale, getLocaleFromCookieString, getStoredLocale, persistLocale, setStoredLocale, setStoredLocaleCookie, syncDocumentLocale, } from "./storage.js";
export { createLabelGetter, translateOptions, type LabelKey, type LabelKeyMap, type TranslatableOption, } from "./static-data.js";
export { UZ_CITY_CODES, UZ_CITY_LABEL_KEYS, getCityLabel, getUzCityOptions, isUzCityCode, type UzCityCode, } from "./cities.js";
export { createTranslator, t, type MessageCatalog, type TranslatorOptions } from "./translate.js";
export type { LocaleMessages, MessageTree, PrimitiveTranslationValue, TranslationKey, TranslationParams, Translator, } from "./types.js";
//# sourceMappingURL=index.d.ts.map