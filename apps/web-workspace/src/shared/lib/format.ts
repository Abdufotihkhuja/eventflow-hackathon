/**
 * Format number to shorter notation (e.g., 1000 -> 1K)
 */
export function formatNumber(num: number | undefined, decimals = 1): string {
  if (num === undefined || num === null) return '0'

  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(decimals)}M`
  }

  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(decimals)}K`
  }

  return num.toString()
}

/**
 * Format number as currency (RUB by default)
 */
export function formatCurrency(
  amount: number | undefined,
  locale = 'ru-RU',
  currency = 'RUB'
): string {
  if (amount === undefined || amount === null) return '₽0'

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Calculate percentage change between two values
 */
export function calculatePercentChange(
  current: number | undefined,
  previous: number | undefined
): number {
  if (!current || !previous || previous === 0) return 0
  return Math.round(((current - previous) / previous) * 100)
}

/**
 * Get trend type based on percentage change
 */
export function getTrendType(percentChange: number | undefined): 'up' | 'down' | 'neutral' {
  if (!percentChange) return 'neutral'
  if (percentChange > 0) return 'up'
  if (percentChange < 0) return 'down'
  return 'neutral'
}

/**
 * Даты с API считаем UTC (ISO 8601 с Z).
 * Intl.DateTimeFormat без timeZone выводит в локальном времени пользователя.
 */

/**
 * Format date to localized string (API UTC → user local).
 */
export function formatDate(date: string | Date, locale = 'ru-RU'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(dateObj)
}

/**
 * Format time to localized string (API UTC → user local).
 */
export function formatTime(date: string | Date, locale = 'ru-RU'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(dateObj)
}

/**
 * Значение для <input type="datetime-local">: UTC ISO → локальные YYYY-MM-DDTHH:mm.
 * API отдаёт UTC (ISO 8601 с Z), в поле показываем то же мгновение в часовом поясе пользователя.
 */
export function toDateTimeLocalValue(isoDate: string | undefined): string {
  if (!isoDate) return ''
  const date = new Date(isoDate)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${d}T${h}:${min}`
}

/**
 * Парсит строку даты YYYY-MM-DD как календарный день в локальной зоне.
 * new Date('YYYY-MM-DD') в JS даёт UTC-полночь — в западных часовых поясах при форматировании день сдвигается.
 * T12:00:00 без Z парсится как локальное время, календарный день при выводе сохраняется.
 */
export function parseCalendarDate(dateOnly: string): Date {
  return new Date(dateOnly + 'T12:00:00')
}

/**
 * Приводит дату к ISO 8601 с суффиксом Z для отправки на API.
 * Бэкенд требует явную таймзону; строка без Z (например 2025-06-15T10:00:00) приводит к 400.
 * Локальную строку из datetime-local парсим как локальное время, затем отдаём UTC с Z.
 */
export function toISO8601Z(date: string | Date | undefined | null): string | undefined {
  if (date === undefined || date === null) return undefined
  const d = typeof date === 'string' ? new Date(date) : date
  if (Number.isNaN(d.getTime())) return undefined
  return d.toISOString()
}

/**
 * Приводит числовое поле API к number.
 * Prisma-поля Decimal (latitude/longitude/price) сериализуются в JSON строкой,
 * хотя в типах они объявлены как number — без этого zod-схемы форм падают
 * с «Invalid input: expected number, received string», а карта получает строку.
 */
export function toOptionalNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}
