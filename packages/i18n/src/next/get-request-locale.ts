import { fallbackLocale, type Locale } from "../config.js";
import { getLocaleFromCookieHeader, getLocaleFromCookieReader, type CookieReader } from "./cookies.js";

export function getRequestLocaleFromCookies(
  cookies?: CookieReader | Headers | string | null,
): Locale {
  if (!cookies) {
    return fallbackLocale;
  }

  if (typeof cookies === "string") {
    return getLocaleFromCookieHeader(cookies);
  }

  if (typeof Headers !== "undefined" && cookies instanceof Headers) {
    return getLocaleFromCookieHeader(cookies.get("cookie"));
  }

  return getLocaleFromCookieReader(cookies as CookieReader);
}
