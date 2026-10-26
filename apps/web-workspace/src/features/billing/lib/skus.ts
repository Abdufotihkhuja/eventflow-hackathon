/**
 * Известные SKU каталога (сид D-15) → ключи i18n `billing.addons.skus.*`.
 * Неизвестные коды (добавленные оператором позже) рендерятся кодом как есть —
 * честно, без сломанных ключей перевода.
 */

export const KNOWN_SKUS = [
  'COIN_AI_100MIN',
  'COIN_GEN_100',
  'AD_FEATURED_WEEK',
  'AD_EMAIL_CAMPAIGN',
  'AD_SMS_CAMPAIGN',
] as const

export type KnownSku = (typeof KNOWN_SKUS)[number]

export function isKnownSku(code: string): code is KnownSku {
  return (KNOWN_SKUS as readonly string[]).includes(code)
}

/** SMS-кампании «скоро»: провайдера нет (решение D-2 группы D). */
export const COMING_SOON_SKUS: ReadonlySet<string> = new Set(['AD_SMS_CAMPAIGN'])
