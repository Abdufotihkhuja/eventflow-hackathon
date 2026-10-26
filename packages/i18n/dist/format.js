import { fallbackLocale, normalizeLocale } from "./config.js";
export function toIntlLocale(locale) {
    const normalizedLocale = normalizeLocale(locale) ?? fallbackLocale;
    if (normalizedLocale === "en") {
        return "en-US";
    }
    if (normalizedLocale === "ru") {
        return "ru-RU";
    }
    return "uz-Latn-UZ";
}
function toDate(value) {
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}
function hasDateTimeOptions(options) {
    return options != null && Object.keys(options).length > 0;
}
export function formatDate(value, locale = fallbackLocale, options) {
    const date = toDate(value);
    if (!date) {
        return "";
    }
    return new Intl.DateTimeFormat(toIntlLocale(locale), hasDateTimeOptions(options) ? options : { dateStyle: "medium" }).format(date);
}
export function formatDateTime(value, locale = fallbackLocale, options) {
    const date = toDate(value);
    if (!date) {
        return "";
    }
    return new Intl.DateTimeFormat(toIntlLocale(locale), hasDateTimeOptions(options) ? options : { dateStyle: "medium", timeStyle: "short" }).format(date);
}
export function formatNumber(value, locale = fallbackLocale, options) {
    return new Intl.NumberFormat(toIntlLocale(locale), options).format(value);
}
export function formatCurrency(value, currency, locale = fallbackLocale, options) {
    return formatNumber(value, locale, {
        style: "currency",
        currency,
        ...options,
    });
}
export function getDateFnsLocale(locale, localeMap) {
    const normalizedLocale = normalizeLocale(locale) ?? fallbackLocale;
    return localeMap[normalizedLocale] ?? localeMap[fallbackLocale];
}
//# sourceMappingURL=format.js.map