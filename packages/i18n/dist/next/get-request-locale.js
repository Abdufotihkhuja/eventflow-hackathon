import { fallbackLocale } from "../config.js";
import { getLocaleFromCookieHeader, getLocaleFromCookieReader } from "./cookies.js";
export function getRequestLocaleFromCookies(cookies) {
    if (!cookies) {
        return fallbackLocale;
    }
    if (typeof cookies === "string") {
        return getLocaleFromCookieHeader(cookies);
    }
    if (typeof Headers !== "undefined" && cookies instanceof Headers) {
        return getLocaleFromCookieHeader(cookies.get("cookie"));
    }
    return getLocaleFromCookieReader(cookies);
}
//# sourceMappingURL=get-request-locale.js.map