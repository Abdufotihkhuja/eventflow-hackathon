/**
 * Утилита для форматирования имени пользователя
 * Объединяет firstName и lastName в полное имя
 */

export function formatUserName(firstName?: string | null, lastName?: string | null): string {
  return [firstName, lastName]
    .map(part => part?.trim())
    .filter(Boolean)
    .join(' ')
}

/**
 * Получить инициалы из имени и фамилии.
 * Бэкенд может вернуть firstName/lastName как null (импортированные или
 * неполные профили), поэтому доступ к символам всегда защищён.
 */
export function getUserInitials(firstName?: string | null, lastName?: string | null): string {
  const firstInitial = firstName?.trim().charAt(0).toUpperCase() ?? ''
  const lastInitial = lastName?.trim().charAt(0).toUpperCase() ?? ''

  return `${firstInitial}${lastInitial}`.slice(0, 2)
}
