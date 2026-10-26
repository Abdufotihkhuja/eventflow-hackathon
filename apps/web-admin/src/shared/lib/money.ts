/**
 * Отображение денег в минорных единицах (D-3: тийины строкой на проводе).
 *
 * ТОЛЬКО display: вся арифметика — BigInt, никакого parseFloat/Number по
 * денежным строкам. 1 сум/доллар/… = 100 минорных единиц.
 */

const MINOR_PER_MAJOR = 100n

/**
 * "150000050" + "UZS" → "1 500 000.50 UZS" (дробная часть — только если не 0).
 * Невалидная строка возвращается как есть, чтобы не скрывать проблему данных.
 */
export function formatMinorAmount(
  amountMinor: string,
  currency: string,
  locale: string = 'ru'
): string {
  let value: bigint
  try {
    value = BigInt(amountMinor)
  } catch {
    return `${amountMinor} ${currency}`
  }

  const negative = value < 0n
  const abs = negative ? -value : value
  const major = abs / MINOR_PER_MAJOR
  const minor = abs % MINOR_PER_MAJOR
  const majorStr = new Intl.NumberFormat(locale).format(major)
  const minorStr = minor === 0n ? '' : `.${minor.toString(10).padStart(2, '0')}`

  return `${negative ? '−' : ''}${majorStr}${minorStr} ${currency}`
}

/**
 * Ввод суммы в мажорных единицах ("1500000", "1 500 000,50") → строка
 * минорных единиц ("150000050") для API. null — невалидный или нулевой ввод.
 * Считаем строками/BigInt — без float-математики по деньгам.
 */
export function parseMajorToMinor(input: string): string | null {
  const normalized = input.trim().replace(/\s+/g, '').replace(',', '.')
  if (!/^\d{1,15}(\.\d{1,2})?$/.test(normalized)) return null

  const [intPart, fracPart = ''] = normalized.split('.')
  const minor = BigInt(intPart) * MINOR_PER_MAJOR + BigInt(fracPart.padEnd(2, '0') || '0')
  if (minor === 0n) return null

  return minor.toString(10)
}
