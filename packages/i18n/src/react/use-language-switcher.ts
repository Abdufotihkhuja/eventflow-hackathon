"use client";

import { useMemo } from "react";
import { SUPPORTED_LOCALES, localeLabels, type Locale } from "../config.js";
import type { TranslationKey } from "../types.js";
import { useI18n } from "./i18n-provider.js";

export interface LanguageSwitcherOption {
  locale: Locale;
  label: string;
  fallbackLabel: string;
  shortLabel: string;
  isCurrent: boolean;
}

const languageNameKeys = {
  en: "common.languages.english",
  ru: "common.languages.russian",
  uz: "common.languages.uzbek",
} satisfies Record<Locale, TranslationKey>;

const shortLocaleLabels = {
  en: "EN",
  ru: "RU",
  uz: "UZ",
} satisfies Record<Locale, string>;

export function useLanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();

  const options = useMemo<LanguageSwitcherOption[]>(
    () =>
      SUPPORTED_LOCALES.map((optionLocale) => ({
        locale: optionLocale,
        label: t(languageNameKeys[optionLocale]),
        fallbackLabel: localeLabels[optionLocale],
        shortLabel: shortLocaleLabels[optionLocale],
        isCurrent: optionLocale === locale,
      })),
    [locale, t],
  );

  const currentLanguage =
    options.find((option) => option.locale === locale) ?? options[0];

  return {
    locale,
    setLocale,
    options,
    currentLanguage,
    languageLabel: t("common.language"),
    selectLanguageLabel: t("common.selectLanguage"),
    currentLanguageLabel: t("common.currentLanguage", {
      language: currentLanguage.label,
    }),
  };
}
