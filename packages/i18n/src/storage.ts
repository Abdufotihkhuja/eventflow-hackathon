import {
  fallbackLocale,
  localeCookieMaxAge,
  localeCookieName,
  localeStorageKey,
  normalizeLocale,
  type Locale,
} from "./config.js";

function canUseDocument(): boolean {
  return typeof document !== "undefined";
}

function canUseLocalStorage(): boolean {
  try {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
  } catch {
    return false;
  }
}

export function getLocaleFromCookieString(cookieString?: string | null): Locale | null {
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

export function getStoredLocale(): Locale | null {
  if (!canUseLocalStorage()) {
    return null;
  }

  return normalizeLocale(window.localStorage.getItem(localeStorageKey));
}

export function setStoredLocale(locale: Locale): void {
  if (canUseLocalStorage()) {
    window.localStorage.setItem(localeStorageKey, locale);
  }
}

export function createLocaleCookie(locale: Locale): string {
  return [
    `${localeCookieName}=${encodeURIComponent(locale)}`,
    "Path=/",
    `Max-Age=${localeCookieMaxAge}`,
    "SameSite=Lax",
  ].join("; ");
}

export function setStoredLocaleCookie(locale: Locale): void {
  if (canUseDocument()) {
    document.cookie = createLocaleCookie(locale);
  }
}

export function syncDocumentLocale(locale: Locale): void {
  if (canUseDocument()) {
    document.documentElement.lang = locale;
  }
}

export function getBrowserLocale(): Locale | null {
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

export function getInitialLocale(options?: { includeBrowserLocale?: boolean }): Locale {
  return (
    getStoredLocale() ??
    getLocaleFromCookieString(canUseDocument() ? document.cookie : null) ??
    (options?.includeBrowserLocale ? getBrowserLocale() : null) ??
    fallbackLocale
  );
}

export function persistLocale(locale: Locale): void {
  setStoredLocale(locale);
  setStoredLocaleCookie(locale);
  syncDocumentLocale(locale);
}
