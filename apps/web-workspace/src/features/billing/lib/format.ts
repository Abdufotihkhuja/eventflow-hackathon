/**
 * Форматирование биллинг-значений (C-2/C-3/C-4).
 *
 * Деньги приходят СТРОКАМИ в минорных единицах (D-3): тийины UZS, центы USD.
 * Никакой арифметики поверх float — только BigInt-деление на 100 для целой
 * части и остаток для копеечной (цены каталога кратны целым единицам).
 */

import { toIntlLocale } from '@eventflow/i18n'

import type { BillingCoinMetric } from '@api/services'

/** bps → человекочитаемый процент: 1200 → "12", 850 → "8.5". */
export function formatBpsPercent(bps: number): string {
  const percent = bps / 100
  if (Number.isInteger(percent)) return String(percent)
  return percent.toFixed(2).replace(/\.?0+$/, '')
}

/** Тийины строкой → "1 200 000 UZS" в локали пользователя (без копеек). */
export function formatUzsMinor(locale: string, minor: string): string {
  let units: number
  try {
    units = Number(BigInt(minor) / 100n)
  } catch {
    return minor
  }
  return new Intl.NumberFormat(toIntlLocale(locale), {
    style: 'currency',
    currency: 'UZS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(units)
}

/** USD-якорь в центах → "$599" (маркетинговый ориентир, не оферта). */
export function formatUsdAnchorCents(cents: number): string {
  const dollars = cents / 100
  return Number.isInteger(dollars) ? `$${dollars}` : `$${dollars.toFixed(2)}`
}

/** Дней до истечения периода (округление вверх; 0 = истекает сегодня). */
export function daysUntil(iso: string): number {
  const ms = new Date(iso).getTime() - Date.now()
  return Math.ceil(ms / 86_400_000)
}

/**
 * Количество монет в единицах метрики → отображаемое число (C-6).
 * AI хранится в секундах (CR-26) — показываем минуты (÷60, до 1 знака после
 * запятой, чтобы не врать округлением); генерации — целые штуки.
 */
export function formatCoinAmount(
  locale: string,
  metric: BillingCoinMetric,
  value: number
): string {
  const amount = metric === 'AI_SECONDS' ? value / 60 : value
  return new Intl.NumberFormat(toIntlLocale(locale), {
    maximumFractionDigits: metric === 'AI_SECONDS' ? 1 : 0,
  }).format(amount)
}
