import { APP_LOCALES, type AppLocale } from './translation.types';

export const TAHRIRCHI_LOCALE_BY_APP_LOCALE: Record<AppLocale, string> = {
  ru: 'rus_Cyrl',
  uz: 'uzn_Latn',
  en: 'eng_Latn',
};

export function getSupportedTranslationLocales(): readonly AppLocale[] {
  return APP_LOCALES;
}

export function mapAppLocaleToTahrirchi(locale: AppLocale): string {
  return TAHRIRCHI_LOCALE_BY_APP_LOCALE[locale];
}
