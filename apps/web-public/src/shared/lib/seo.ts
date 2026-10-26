import type { Locale } from "@eventflow/i18n";

import type { Metadata } from "next";

import {
  fallbackLocale,
  seoDefaultLocale,
  SUPPORTED_LOCALES,
  withLocalePath,
} from "./i18n-routing";

/** Brand name used across titles, Open Graph, and Twitter cards. */
export const SITE_NAME = "EVENTFLOW";

/**
 * Absolute origin of the public site. Used as `metadataBase` so relative
 * canonical / Open Graph / Twitter URLs resolve to absolute ones, and so
 * file-convention OG images get an absolute `og:image` URL.
 */
// The public site's own origin. In this monorepo `NEXT_PUBLIC_PUBLIC_URL` is
// the public site (web-public), while `NEXT_PUBLIC_APP_URL` is the *cabinet*
// (app.*) — so canonical/OG/sitemap must use PUBLIC_URL. `||` (not `??`) so an
// empty-string build arg falls back instead of producing `new URL("")`.
export const siteUrl = (
  process.env.NEXT_PUBLIC_PUBLIC_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://eventflow.uz"
).replace(/\/+$/, "");

export const metadataBase = new URL(siteUrl);

/** `og:locale` value for each supported app locale. */
const OG_LOCALE: Record<Locale, string> = {
  en: "en_US",
  ru: "ru_RU",
  uz: "uz_UZ",
};

export function ogLocale(locale: Locale): string {
  return OG_LOCALE[locale] ?? OG_LOCALE[fallbackLocale];
}

export function createLocalizedAlternates(locale: Locale, pathname: string) {
  return {
    canonical: withLocalePath(pathname, locale),
    languages: {
      ...Object.fromEntries(
        SUPPORTED_LOCALES.map((language) => [
          language,
          withLocalePath(pathname, language),
        ]),
      ),
      "x-default": withLocalePath(pathname, seoDefaultLocale),
    },
  };
}

interface PageMetadataInput {
  locale: Locale;
  /** Unlocalized path, e.g. "/events" or "/". */
  path: string;
  /** Bare title — the root layout's `%s | EVENTFLOW` template adds the brand. */
  title: string;
  description: string;
  /** Use the title verbatim, skipping the brand template (for the homepage). */
  absoluteTitle?: boolean;
  type?: "website" | "article";
  /**
   * Explicit OG/Twitter image(s). Omit to let the file-convention
   * `opengraph-image` for the route provide the image.
   */
  images?: string[];
}

/**
 * Builds a consistent `Metadata` object for a public page: localized title /
 * description, canonical + hreflang alternates, and matching Open Graph +
 * Twitter card. Image resolution defaults to the route's `opengraph-image`.
 */
export function buildPageMetadata({
  locale,
  path,
  title,
  description,
  absoluteTitle = false,
  type = "website",
  images,
}: PageMetadataInput): Metadata {
  const url = withLocalePath(path, locale);

  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: createLocalizedAlternates(locale, path),
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      locale: ogLocale(locale),
      alternateLocale: SUPPORTED_LOCALES.filter((l) => l !== locale).map(
        ogLocale,
      ),
      type,
      ...(images ? { images } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(images ? { images } : {}),
    },
  };
}
