/**
 * Константы безопасности
 */

/**
 * Количество раундов для bcrypt хеширования паролей
 * Рекомендуемое значение: 10-12 (увеличение на 1 удваивает время хеширования)
 */
export const BCRYPT_SALT_ROUNDS = 12;

/**
 * Время жизни кода верификации в минутах
 */
export const VERIFICATION_CODE_EXPIRATION_MINUTES = 5;

/**
 * Время жизни приглашения для сотрудника в часах
 */
export const MEMBER_INVITATION_EXPIRY_HOURS = 48;
