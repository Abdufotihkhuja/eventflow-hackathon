import { fallbackLocale, localeCookieMaxAge, localeCookieName, normalizeLocale, } from "../config.js";
import { getLocaleFromCookieString } from "../storage.js";
export function getLocaleFromCookieReader(cookies) {
    const cookieValue = cookies?.get(localeCookieName);
    const value = typeof cookieValue === "string" ? cookieValue : cookieValue?.value;
    return normalizeLocale(value) ?? fallbackLocale;
}
export function getLocaleFromCookieHeader(cookieHeader) {
    return getLocaleFromCookieString(cookieHeader) ?? fallbackLocale;
}
export function getLocaleCookieOptions(locale) {
    return {
        name: localeCookieName,
        value: normalizeLocale(locale) ?? fallbackLocale,
        path: "/",
        maxAge: localeCookieMaxAge,
        sameSite: "lax",
    };
}
export function createLocaleSetCookieHeader(locale) {
    const options = getLocaleCookieOptions(locale);
    return [
        `${options.name}=${encodeURIComponent(options.value)}`,
        `Path=${options.path}`,
        `Max-Age=${options.maxAge}`,
        `SameSite=${options.sameSite}`,
    ].join("; ");
}
//# sourceMappingURL=cookies.js.map