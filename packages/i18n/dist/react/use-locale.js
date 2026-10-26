"use client";
import { useI18n } from "./i18n-provider.js";
export function useLocale() {
    const { locale } = useI18n();
    return locale;
}
//# sourceMappingURL=use-locale.js.map