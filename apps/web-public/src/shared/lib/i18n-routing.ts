import {
  SUPPORTED_LOCALES,
  fallbackLocale,
  isSupportedLocale,
  normalizeLocale,
  type Locale,
} from "@eventflow/i18n";

export const localeRouteParam = "locale";

/**
 * Locale used for `hreflang=x-default` and the sitemap canonical entry.
 *
 * Deliberately distinct from `fallbackLocale` (the in-app runtime fallback for
 * unknown locales, which stays English as the international catalog default).
 * EVENTFLOW's primary market is Uzbekistan, so search engines should treat the
 * Uzbek URL as the default when no language preference is signalled — this
 * concentrates ranking authority on `/uz/*` for Google.uz and Yandex.uz.
 */
export const seoDefaultLocale: Locale = "uz";

export function getPathLocale(pathname: string | null | undefined): Locale | null {
  if (!pathname) {
    return null;
  }

  const [, firstSegment] = pathname.split("/");
  return normalizeLocale(firstSegment);
}

export function stripLocalePrefix(pathname: string | null | undefined): string {
  if (!pathname) {
    return "/";
  }

  const [pathWithoutQuery, suffix = ""] = pathname.split(/(?=[?#])/, 2);
  const segments = pathWithoutQuery.split("/");
  const firstSegment = segments[1];

  if (!isSupportedLocale(firstSegment)) {
    return pathname;
  }

  const stripped = `/${segments.slice(2).join("/")}`.replace(/\/+$/, "");
  return `${stripped || "/"}${suffix}`;
}

export function withLocalePath(href: string, locale: Locale): string {
  if (
    !href.startsWith("/") ||
    href.startsWith("//") ||
    href.startsWith("/api") ||
    href.startsWith("/_next")
  ) {
    return href;
  }

  const [pathAndSearch, hash = ""] = href.split("#", 2);
  const [pathname, search = ""] = pathAndSearch.split("?", 2);
  const strippedPathname = stripLocalePrefix(pathname);
  const localizedPathname =
    strippedPathname === "/" ? `/${locale}` : `/${locale}${strippedPathname}`;

  return [
    localizedPathname,
    search ? `?${search}` : "",
    hash ? `#${hash}` : "",
  ].join("");
}

export function replaceLocaleInPath(pathname: string | null, locale: Locale): string {
  return withLocalePath(stripLocalePrefix(pathname), locale);
}

export function getRouteLocale(value: unknown): Locale {
  return normalizeLocale(value) ?? fallbackLocale;
}

export function isLocaleRoute(value: unknown): value is Locale {
  return isSupportedLocale(value);
}

export function getLocalizedAlternates(pathname: string) {
  const cleanPath = stripLocalePrefix(pathname);

  return {
    canonical: withLocalePath(cleanPath, getPathLocale(pathname) ?? fallbackLocale),
    languages: Object.fromEntries([
      ...SUPPORTED_LOCALES.map((locale) => [
        locale,
        withLocalePath(cleanPath, locale),
      ]),
      ["x-default", withLocalePath(cleanPath, seoDefaultLocale)],
    ]) as Record<Locale | "x-default", string>,
  };
}

export { SUPPORTED_LOCALES, fallbackLocale, isSupportedLocale, normalizeLocale };
export type { Locale };
