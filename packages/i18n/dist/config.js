export const SUPPORTED_LOCALES = ["en", "ru", "uz"];
export const fallbackLocale = "en";
export const localeStorageKey = "eventflow.locale";
export const localeCookieName = "eventflow.locale";
export const localeCookieMaxAge = 60 * 60 * 24 * 365;
export const localeLabels = {
    en: "English",
    ru: "Русский",
    uz: "O‘zbekcha",
};
export function isSupportedLocale(value) {
    return typeof value === "string" && SUPPORTED_LOCALES.includes(value);
}
export function normalizeLocale(value) {
    if (typeof value !== "string") {
        return null;
    }
    const normalized = value.trim().toLowerCase().replaceAll("_", "-");
    const baseLocale = normalized.split("-")[0];
    return isSupportedLocale(baseLocale) ? baseLocale : null;
}
//# sourceMappingURL=config.js.map