import { fallbackLocale, localeCookieMaxAge, localeCookieName, localeStorageKey, normalizeLocale, } from "./config.js";
function canUseDocument() {
    return typeof document !== "undefined";
}
function canUseLocalStorage() {
    try {
        return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
    }
    catch {
        return false;
    }
}
export function getLocaleFromCookieString(cookieString) {
    if (!cookieString) {
        return null;
    }
    const cookies = cookieString.split(";").map((part) => part.trim());
    const localeCookie = cookies.find((part) => part.startsWith(`${localeCookieName}=`));
    if (!localeCookie) {
        return null;
    }
    const value = decodeURIComponent(localeCookie.slice(localeCookieName.length + 1));
    return normalizeLocale(value);
}
export function getStoredLocale() {
    if (!canUseLocalStorage()) {
        return null;
    }
    return normalizeLocale(window.localStorage.getItem(localeStorageKey));
}
export function setStoredLocale(locale) {
    if (canUseLocalStorage()) {
        window.localStorage.setItem(localeStorageKey, locale);
    }
}
export function createLocaleCookie(locale) {
    return [
        `${localeCookieName}=${encodeURIComponent(locale)}`,
        "Path=/",
        `Max-Age=${localeCookieMaxAge}`,
        "SameSite=Lax",
    ].join("; ");
}
export function setStoredLocaleCookie(locale) {
    if (canUseDocument()) {
        document.cookie = createLocaleCookie(locale);
    }
}
export function syncDocumentLocale(locale) {
    if (canUseDocument()) {
        document.documentElement.lang = locale;
    }
}
export function getBrowserLocale() {
    if (typeof navigator === "undefined") {
        return null;
    }
    const candidates = [navigator.language, ...(navigator.languages ?? [])];
    for (const candidate of candidates) {
        const locale = normalizeLocale(candidate);
        if (locale) {
            return locale;
        }
    }
    return null;
}
export function getInitialLocale(options) {
    return (getStoredLocale() ??
        getLocaleFromCookieString(canUseDocument() ? document.cookie : null) ??
        (options?.includeBrowserLocale ? getBrowserLocale() : null) ??
        fallbackLocale);
}
export function persistLocale(locale) {
    setStoredLocale(locale);
    setStoredLocaleCookie(locale);
    syncDocumentLocale(locale);
}
//# sourceMappingURL=storage.js.map