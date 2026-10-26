import { type Locale } from "./config.js";
export declare function getLocaleFromCookieString(cookieString?: string | null): Locale | null;
export declare function getStoredLocale(): Locale | null;
export declare function setStoredLocale(locale: Locale): void;
export declare function createLocaleCookie(locale: Locale): string;
export declare function setStoredLocaleCookie(locale: Locale): void;
export declare function syncDocumentLocale(locale: Locale): void;
export declare function getBrowserLocale(): Locale | null;
export declare function getInitialLocale(options?: {
    includeBrowserLocale?: boolean;
}): Locale;
export declare function persistLocale(locale: Locale): void;
//# sourceMappingURL=storage.d.ts.map