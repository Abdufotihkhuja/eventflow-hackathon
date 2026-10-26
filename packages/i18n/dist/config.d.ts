export declare const SUPPORTED_LOCALES: readonly ["en", "ru", "uz"];
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export declare const fallbackLocale: Locale;
export declare const localeStorageKey = "eventflow.locale";
export declare const localeCookieName = "eventflow.locale";
export declare const localeCookieMaxAge: number;
export declare const localeLabels: Record<Locale, string>;
export declare function isSupportedLocale(value: unknown): value is Locale;
export declare function normalizeLocale(value: unknown): Locale | null;
//# sourceMappingURL=config.d.ts.map