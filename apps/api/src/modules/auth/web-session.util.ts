import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { CookieOptions, Request } from 'express';

export const WEB_ACCESS_COOKIE = '__Host-ef_access';
export const WEB_REFRESH_COOKIE = '__Host-ef_refresh';
export const WEB_CSRF_COOKIE = '__Host-ef_csrf';
export const WEB_ACCESS_COOKIE_DEV = 'ef_access';
export const WEB_REFRESH_COOKIE_DEV = 'ef_refresh';
export const WEB_CSRF_COOKIE_DEV = 'ef_csrf';

export interface WebCookieNames {
  access: string;
  refresh: string;
  csrf: string;
}

const SECURE_COOKIE_NAMES: WebCookieNames = {
  access: WEB_ACCESS_COOKIE,
  refresh: WEB_REFRESH_COOKIE,
  csrf: WEB_CSRF_COOKIE,
};

const INSECURE_COOKIE_NAMES: WebCookieNames = {
  access: WEB_ACCESS_COOKIE_DEV,
  refresh: WEB_REFRESH_COOKIE_DEV,
  csrf: WEB_CSRF_COOKIE_DEV,
};

/**
 * Оба набора имён — и `__Host-`, и без префикса.
 *
 * Набор выбирается по протоколу запроса, поэтому он меняется, когда меняется
 * X-Forwarded-Proto от прокси. У пользователя, который логинился до такой
 * смены, в браузере остаётся набор из прошлой жизни: `res.cookie` под новым
 * именем его не трогает, а `readWebCookie` продолжает его находить. Чистить
 * сессию надо по обоим наборам, иначе осиротевшая кука переживает logout и
 * снова выглядит как живая web-сессия.
 */
export const ALL_WEB_COOKIE_NAMES: readonly WebCookieNames[] = [
  SECURE_COOKIE_NAMES,
  INSECURE_COOKIE_NAMES,
];

export function webCookieNames(request: Request): WebCookieNames {
  return isSecureWebRequest(request)
    ? SECURE_COOKIE_NAMES
    : INSECURE_COOKIE_NAMES;
}

export function readWebAccessCookie(request: Request): string | undefined {
  return readWebCookie(request.headers.cookie, WEB_ACCESS_COOKIE, WEB_ACCESS_COOKIE_DEV);
}

export function readWebRefreshCookie(request: Request): string | undefined {
  return readWebCookie(request.headers.cookie, WEB_REFRESH_COOKIE, WEB_REFRESH_COOKIE_DEV);
}

export function readWebCsrfCookie(request: Request): string | undefined {
  return readWebCookie(request.headers.cookie, WEB_CSRF_COOKIE, WEB_CSRF_COOKIE_DEV);
}

export function readCookie(
  cookieHeader: string | undefined,
  name: string,
): string | undefined {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(';')) {
    const [key, ...value] = part.trim().split('=');
    if (key === name) return decodeURIComponent(value.join('='));
  }
  return undefined;
}

export function createCsrfToken(secret: string): string {
  const nonce = randomBytes(32).toString('base64url');
  return `${nonce}.${signCsrfNonce(nonce, secret)}`;
}

export function verifyCsrfToken(token: string, secret: string): boolean {
  const separator = token.lastIndexOf('.');
  if (separator <= 0) return false;
  const nonce = token.slice(0, separator);
  const supplied = token.slice(separator + 1);
  const expected = signCsrfNonce(nonce, secret);
  const suppliedBuffer = Buffer.from(supplied);
  const expectedBuffer = Buffer.from(expected);
  return (
    suppliedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(suppliedBuffer, expectedBuffer)
  );
}

export function webCookieOptions(
  request: Request,
  maxAge: number,
  httpOnly: boolean,
): CookieOptions {
  return {
    httpOnly,
    secure: isSecureWebRequest(request),
    sameSite: 'strict',
    path: '/',
    maxAge,
  };
}

function isSecureWebRequest(request: Request): boolean {
  if (request.secure) return true;
  const forwardedProto = request.headers['x-forwarded-proto'];
  const value = Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto;
  return value?.split(',')[0]?.trim().toLowerCase() === 'https';
}

function readWebCookie(
  cookieHeader: string | undefined,
  secureName: string,
  devName: string,
): string | undefined {
  return readCookie(cookieHeader, secureName) ?? readCookie(cookieHeader, devName);
}

function signCsrfNonce(nonce: string, secret: string): string {
  return createHmac('sha256', secret).update(nonce).digest('base64url');
}
