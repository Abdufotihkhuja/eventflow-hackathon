/**
 * Разбивает полное имя на firstName и lastName
 * @param fullName - полное имя пользователя
 * @returns объект с firstName и lastName
 */
export function parseFullName(fullName: string): {
  firstName: string;
  lastName?: string;
} {
  if (!fullName) {
    return { firstName: '' };
  }

  const trimmedName = fullName.trim();
  const parts = trimmedName.split(/\s+/);

  if (parts.length === 0) {
    return { firstName: '' };
  }

  if (parts.length === 1) {
    return { firstName: parts[0] };
  }

  // Первое слово = firstName, остальное = lastName
  const firstName = parts[0];
  const lastName = parts.slice(1).join(' ');

  return { firstName, lastName };
}
