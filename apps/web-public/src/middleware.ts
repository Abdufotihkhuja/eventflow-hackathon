import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_FILE = /\.[^/]+$/;
const LOCALE_HEADER = "x-eventflow-locale";
const SUPPORTED_LOCALES = ["en", "ru", "uz"] as const;
const fallbackLocale: Locale = "en";
const localeCookieName = "eventflow.locale";
const localeCookieMaxAge = 60 * 60 * 24 * 365;

type Locale = (typeof SUPPORTED_LOCALES)[number];

function isSupportedLocale(value: unknown): value is Locale {
  return typeof value === "string" && SUPPORTED_LOCALES.includes(value as Locale);
}

function normalizeLocale(value: unknown): Locale | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase().replaceAll("_", "-");
  const [baseLocale] = normalized.split("-");

  return isSupportedLocale(baseLocale) ? baseLocale : null;
}

function shouldBypass(pathname: string): boolean {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/trpc") ||
    pathname.startsWith("/_vercel") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname === "/icon.svg" ||
    PUBLIC_FILE.test(pathname)
  );
}

function getPreferredLocale(request: NextRequest): Locale {
  return normalizeLocale(request.cookies.get(localeCookieName)?.value) ?? fallbackLocale;
}

function setLocaleCookie(response: NextResponse, locale: Locale): void {
  response.cookies.set(localeCookieName, locale, {
    path: "/",
    maxAge: localeCookieMaxAge,
    sameSite: "lax",
  });
}

function redirectWithLocale(
  request: NextRequest,
  locale: Locale,
  pathname: string,
): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = pathname === "/" ? `/${locale}` : `/${locale}${pathname}`;

  const response = NextResponse.redirect(url);
  setLocaleCookie(response, locale);

  return response;
}

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  if (shouldBypass(pathname)) {
    return NextResponse.next();
  }

  const [, firstSegment = "", ...restSegments] = pathname.split("/");

  if (isSupportedLocale(firstSegment)) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set(LOCALE_HEADER, firstSegment);

    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

    setLocaleCookie(response, firstSegment);

    return response;
  }

  if (/^[a-z]{2}$/i.test(firstSegment) && firstSegment.length > 0) {
    return redirectWithLocale(
      request,
      fallbackLocale,
      `/${restSegments.join("/")}`.replace(/\/+$/, "") || "/",
    );
  }

  return redirectWithLocale(request, getPreferredLocale(request), pathname);
}

export const config = {
  matcher: ["/((?!api|trpc|_next|_vercel|.*\\..*).*)"],
};
