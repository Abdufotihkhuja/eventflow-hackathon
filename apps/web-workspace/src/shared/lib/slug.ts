/**
 * Валидация slug по спецификации API (events, blog): a-z, 0-9, дефис.
 * @see docs/EVENT_BLOG_SLUG_API.md
 */

/** Допустимые символы: только строчные латинские буквы, цифры и дефис */
export const SLUG_VALID_REGEX = /^[a-z0-9-]+$/

/** Рекомендуемая максимальная длина slug (events и blog) */
export const SLUG_MAX_LENGTH = 200

/**
 * Проверяет, что строка является валидным slug (формат и длина).
 * Перед проверкой применяется trim и toLowerCase.
 */
export function isValidSlug(value: string): boolean {
  const trimmed = value.trim().toLowerCase()
  if (trimmed.length === 0 || trimmed.length > SLUG_MAX_LENGTH) return false
  return SLUG_VALID_REGEX.test(trimmed)
}
