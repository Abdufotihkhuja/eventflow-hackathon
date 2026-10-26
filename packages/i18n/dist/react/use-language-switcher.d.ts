import { type Locale } from "../config.js";
export interface LanguageSwitcherOption {
    locale: Locale;
    label: string;
    fallbackLabel: string;
    shortLabel: string;
    isCurrent: boolean;
}
export declare function useLanguageSwitcher(): {
    locale: "en" | "ru" | "uz";
    setLocale: (locale: Locale | string) => void;
    options: LanguageSwitcherOption[];
    currentLanguage: LanguageSwitcherOption;
    languageLabel: string;
    selectLanguageLabel: string;
    currentLanguageLabel: string;
};
//# sourceMappingURL=use-language-switcher.d.ts.map