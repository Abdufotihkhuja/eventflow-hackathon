/**
 * Локали интерфейса платформы — значения `Account.locale` (BL-37).
 * Зеркалит DEVICE_LOCALES из PUT /me/devices и Locale почтового рендера
 * (`modules/mail/email/types.ts`). NULL в БД = 'ru' (де-факто дефолт писем).
 */
export const ACCOUNT_LOCALES = ['ru', 'uz', 'en'] as const;

export type AccountLocale = (typeof ACCOUNT_LOCALES)[number];

export function isAccountLocale(value: unknown): value is AccountLocale {
  return (
    typeof value === 'string' &&
    (ACCOUNT_LOCALES as readonly string[]).includes(value)
  );
}
