import { registerAs } from '@nestjs/config';

/**
 * Push-канал (BL-14, транспорт — Expo Push Service, OQ-13).
 *
 * `EXPO_PUSH_ENABLED` — явный тумблер канала: пока креды не загружены в
 * Expo-проект (BL-12, внешняя задача), канал держится выключенным и мягко
 * деградирует — push-доставки сразу failed: push_channel_disabled, per-account
 * email-fallback срабатывает штатно (warning один раз на старте).
 *
 * `EXPO_ACCESS_TOKEN` — опционален: нужен, только если в Expo-проекте включён
 * Enhanced Security for Push Notifications.
 */
export const pushConfig = registerAs('push', () => ({
  enabled: process.env.EXPO_PUSH_ENABLED === 'true',
  accessToken: process.env.EXPO_ACCESS_TOKEN || undefined,
}));
