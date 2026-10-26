import { randomBytes, timingSafeEqual } from 'crypto';
import type { CookieOptions } from 'express';

/**
 * CSRF-защита OAuth-флоу (stateless). Провайдер возвращает единственный
 * переживающий редирект параметр — `state`. Раньше он нёс только authType
 * (`user[.mobile]`) и НЕ проверялся на callback → login-CSRF: злоумышленник мог
 * инициировать OAuth-дэнс в браузере жертвы и завершить callback.
 *
 * Схема: на инициации кладём случайный nonce в короткоживущую httpOnly-cookie
 * И в конец `state`; на callback сверяем nonce из `state` с nonce из cookie
 * (constant-time). Нет cookie/несовпадение → отклоняем. sameSite=lax, чтобы
 * cookie доехала на top-level редиректе от провайдера.
 */
export const OAUTH_STATE_COOKIE = 'ef_oauth_state';

export function generateOAuthNonce(): string {
  return randomBytes(16).toString('hex');
}

export function oauthStateCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/v1/auth',
    maxAge: 10 * 60 * 1000, // 10 минут — окно на завершение OAuth-дэнса
  };
}

/** `user` / `user.mobile` + nonce последним сегментом. */
export function buildOAuthState(
  authType: string,
  isMobile: boolean,
  nonce: string,
): string {
  const base = isMobile ? `${authType}.mobile` : authType;
  return `${base}.${nonce}`;
}

/** nonce — последний сегмент state (после authType[.mobile]). */
export function extractOAuthNonce(state?: string): string | undefined {
  if (!state) return undefined;
  const segments = state.split('.');
  return segments.length >= 2 ? segments[segments.length - 1] : undefined;
}

/** Читает nonce из заголовка Cookie вручную (без зависимости cookie-parser). */
export function readOAuthStateCookie(
  cookieHeader?: string,
): string | undefined {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const name = part.slice(0, eq).trim();
    if (name === OAUTH_STATE_COOKIE) {
      return decodeURIComponent(part.slice(eq + 1).trim());
    }
  }
  return undefined;
}

export function oauthNonceMatches(a?: string, b?: string): boolean {
  if (!a || !b) return false;
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}
