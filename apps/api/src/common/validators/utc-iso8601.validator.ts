import {
  registerDecorator,
  ValidationOptions,
} from 'class-validator';

/**
 * Проверяет, что строка — дата/время в UTC (ISO 8601 с указанием таймзоны).
 * Допускает:
 * - Только дату YYYY-MM-DD (интерпретируется как UTC в JS).
 * - Дата+время с суффиксом Z или смещением ±HH:MM (например 2025-06-15T10:00:00Z).
 * Запрещает дату-время без таймзоны (например 2025-06-15T10:00:00), чтобы избежать
 * интерпретации в локальном времени сервера (например Germany).
 */
function isUtcIso8601(value: unknown): boolean {
  if (typeof value !== 'string' || !value.trim()) return false;

  const trimmed = value.trim();

  // Только дата YYYY-MM-DD — допустимо (в JS парсится как UTC)
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/;
  if (dateOnly.test(trimmed)) {
    const d = new Date(trimmed);
    return !Number.isNaN(d.getTime());
  }

  // Дата-время: обязательно Z или смещение ±HH:MM / ±HHMM в конце
  const hasTimePart = trimmed.includes('T');
  if (!hasTimePart) return false;

  const withTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/;
  if (!withTimezone.test(trimmed)) return false;

  const d = new Date(trimmed);
  return !Number.isNaN(d.getTime());
}

export function IsUtcIso8601(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isUtcIso8601',
      target: object.constructor,
      propertyName,
      options: {
        message:
          'Дата и время должны быть в формате ISO 8601 с указанием таймзоны (например 2025-06-15T10:00:00Z или YYYY-MM-DD)',
        ...validationOptions,
      },
      validator: {
        validate(value: unknown) {
          return isUtcIso8601(value);
        },
      },
    });
  };
}
