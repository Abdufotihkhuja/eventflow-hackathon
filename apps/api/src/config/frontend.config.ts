import { registerAs } from '@nestjs/config';

export const frontendConfig = registerAs('frontend', () => ({
  /** URL приложения организатора (app). QR билета ведёт сюда — сканирует организатор. */
  appUrl: process.env.FRONTEND_APP_URL || 'http://app.localhost',
  /**
   * URL супер-админки. Отдельный хост, поэтому он обязан быть в allowlist
   * Origin у CookieCsrfGuard — иначе любой запрос из консоли, к которому
   * браузер прицепил куку web-сессии, отлетает с WEB_ORIGIN_REJECTED.
   */
  adminUrl: process.env.FRONTEND_ADMIN_URL || 'http://admin.localhost',
  /** URL публичного сайта (участники). «Один QR для всех» ведёт сюда — сканируют участники. */
  publicUrl: process.env.FRONTEND_PUBLIC_URL || 'http://localhost',
  /** URL страницы верификации сертификата (только публичный сайт eventflow.uz). QR в сертификате ведёт сюда. Без fallback на app. */
  certificateVerifyUrl:
    process.env.FRONTEND_PUBLIC_URL || 'http://localhost',
}));
