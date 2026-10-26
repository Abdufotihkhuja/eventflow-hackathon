import { type ReactNode } from "react";
import { type Locale } from "../config.js";
import { type MessageCatalog } from "../translate.js";
import type { Translator } from "../types.js";
export interface I18nContextValue {
    locale: Locale;
    setLocale: (locale: Locale | string) => void;
    t: Translator;
}
export interface I18nProviderProps {
    children: ReactNode;
    initialLocale?: Locale | string | null;
    messages?: MessageCatalog;
}
export declare function I18nProvider({ children, initialLocale, messages, }: I18nProviderProps): import("react/jsx-runtime").JSX.Element;
export declare function useI18n(): I18nContextValue;
//# sourceMappingURL=i18n-provider.d.ts.map