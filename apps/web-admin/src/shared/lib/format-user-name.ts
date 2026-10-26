/**
 * Утилита для форматирования имени пользователя
 * Объединяет firstName и lastName в полное имя
 */

export function formatUserName(firstName: string, lastName?: string | null): string {
  if (!lastName) {
    return firstName
  }
  return `${firstName} ${lastName}`.trim()
}

/**
 * Получить инициалы из имени и фамилии
 */
export function getUserInitials(firstName: string, lastName?: string | null): string {
  const firstInitial = firstName.charAt(0).toUpperCase()
  const lastInitial = lastName?.charAt(0).toUpperCase() || ''

  return `${firstInitial}${lastInitial}`.slice(0, 2)
}
