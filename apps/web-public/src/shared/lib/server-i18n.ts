import { createTranslator, normalizeLocale, type Locale } from "@eventflow/i18n";
import { getRequestLocaleFromCookies } from "@eventflow/i18n/next";
import { cookies, headers } from "next/headers";

const localeHeader = "x-eventflow-locale";

export async function getServerLocale(explicitLocale?: Locale | string | null) {
  const routeLocale = normalizeLocale(explicitLocale);

  if (routeLocale) {
    return routeLocale;
  }

  const requestLocale = normalizeLocale((await headers()).get(localeHeader));
  const locale = requestLocale ?? getRequestLocaleFromCookies(await cookies());

  return locale;
}

export async function getServerTranslator(explicitLocale?: Locale | string | null) {
  const locale = await getServerLocale(explicitLocale);

  return {
    locale,
    t: createTranslator(locale),
  };
}
