import {
  fallbackLocale,
  localeCookieMaxAge,
  localeCookieName,
  normalizeLocale,
  type Locale,
} from "../config.js";
import { getLocaleFromCookieString } from "../storage.js";

export type CookieValue = { value?: string } | string | null | undefined;

export type CookieReader = {
  get(name: string): CookieValue;
};

export interface LocaleCookieOptions {
  name: typeof localeCookieName;
  value: Locale;
  path: "/";
  maxAge: number;
  sameSite: "lax";
}

export function getLocaleFromCookieReader(cookies: CookieReader | null | undefined): Locale {
  const cookieValue = cookies?.get(localeCookieName);
  const value = typeof cookieValue === "string" ? cookieValue : cookieValue?.value;

  return normalizeLocale(value) ?? fallbackLocale;
}

export function getLocaleFromCookieHeader(cookieHeader: string | null | undefined): Locale {
  return getLocaleFromCookieString(cookieHeader) ?? fallbackLocale;
}

export function getLocaleCookieOptions(locale: Locale | string): LocaleCookieOptions {
  return {
    name: localeCookieName,
    value: normalizeLocale(locale) ?? fallbackLocale,
    path: "/",
    maxAge: localeCookieMaxAge,
    sameSite: "lax",
  };
}

export function createLocaleSetCookieHeader(locale: Locale | string): string {
  const options = getLocaleCookieOptions(locale);

  return [
    `${options.name}=${encodeURIComponent(options.value)}`,
    `Path=${options.path}`,
    `Max-Age=${options.maxAge}`,
    `SameSite=${options.sameSite}`,
  ].join("; ");
}
