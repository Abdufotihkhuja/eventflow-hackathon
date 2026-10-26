"use client";
import { useMemo } from "react";
import { SUPPORTED_LOCALES, localeLabels } from "../config.js";
import { useI18n } from "./i18n-provider.js";
const languageNameKeys = {
    en: "common.languages.english",
    ru: "common.languages.russian",
    uz: "common.languages.uzbek",
};
const shortLocaleLabels = {
    en: "EN",
    ru: "RU",
    uz: "UZ",
};
export function useLanguageSwitcher() {
    const { locale, setLocale, t } = useI18n();
    const options = useMemo(() => SUPPORTED_LOCALES.map((optionLocale) => ({
        locale: optionLocale,
        label: t(languageNameKeys[optionLocale]),
        fallbackLabel: localeLabels[optionLocale],
        shortLabel: shortLocaleLabels[optionLocale],
        isCurrent: optionLocale === locale,
    })), [locale, t]);
    const currentLanguage = options.find((option) => option.locale === locale) ?? options[0];
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
//# sourceMappingURL=use-language-switcher.js.map