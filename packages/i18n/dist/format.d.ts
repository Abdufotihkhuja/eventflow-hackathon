import { fallbackLocale, type Locale } from "./config.js";
export type DateInput = Date | string | number;
export declare function toIntlLocale(locale: Locale | string | null | undefined): string;
export declare function formatDate(value: DateInput, locale?: Locale | string | null | undefined, options?: Intl.DateTimeFormatOptions): string;
export declare function formatDateTime(value: DateInput, locale?: Locale | string | null | undefined, options?: Intl.DateTimeFormatOptions): string;
export declare function formatNumber(value: number, locale?: Locale | string | null | undefined, options?: Intl.NumberFormatOptions): string;
export declare function formatCurrency(value: number, currency: string, locale?: Locale | string | null | undefined, options?: Intl.NumberFormatOptions): string;
export declare function getDateFnsLocale<TLocale>(locale: Locale | string | null | undefined, localeMap: Partial<Record<Locale, TLocale>> & Record<typeof fallbackLocale, TLocale>): TLocale;
//# sourceMappingURL=format.d.ts.map