import type {
  AgendaMaterial,
  AgendaMaterialItem,
  AgendaMaterialType,
} from '@api/services'

type AppLocale = 'ru' | 'uz' | 'en'

const LOCALE_FALLBACK_ORDER: readonly AppLocale[] = ['ru', 'uz', 'en']

/**
 * Внешняя ссылка — начинается с http(s). Иначе считаем загруженным файлом.
 */
export function isExternalMaterialUrl(url: string): boolean {
  return /^https?:\/\//i.test(url.trim())
}

function getMaterialType(url: string): AgendaMaterialType {
  return isExternalMaterialUrl(url) ? 'LINK' : 'FILE'
}

/**
 * Выводит отображаемое имя из URL, если нет локализованной подписи.
 * Для файла: последний сегмент пути или «Документ».
 * Для ссылки: hostname или «Ссылка».
 */
export function deriveMaterialDisplayName(url: string): string {
  const trimmed = url.trim()
  if (isExternalMaterialUrl(trimmed)) {
    try {
      const host = new URL(trimmed).hostname
      return host.replace(/^www\./, '') || 'Ссылка'
    } catch {
      return 'Ссылка'
    }
  }
  const segment = trimmed.split('/').filter(Boolean).pop()
  if (segment) return segment
  return 'Документ'
}

function pickLocalizedLabel(
  translations: Partial<Record<AppLocale, string>> | undefined,
  uiLocale: string,
): string | null {
  if (!translations) return null
  const normalized = uiLocale === 'ru' || uiLocale === 'uz' || uiLocale === 'en' ? uiLocale : null
  if (normalized) {
    const direct = translations[normalized]?.trim()
    if (direct) return direct
  }
  for (const locale of LOCALE_FALLBACK_ORDER) {
    const value = translations[locale]?.trim()
    if (value) return value
  }
  return null
}

/**
 * Нормализует список материалов с сервера ({ items: [{url, titleTranslations}] })
 * в форму для UI с локализованным именем.
 *
 * @param items — items из API ответа
 * @param uiLocale — текущий UI-локаль интерфейса (ru/uz/en)
 * @param nameOverrides — локальный кэш имён (originalName при загрузке файла, etc.)
 *   используется как высокий приоритет fallback (если labels пусты).
 */
export function normalizeMaterials(
  items: AgendaMaterialItem[],
  uiLocale: string,
  nameOverrides: Record<string, string> = {},
): AgendaMaterial[] {
  return items.map(item => {
    const localized = pickLocalizedLabel(item.titleTranslations, uiLocale)
    const override = nameOverrides[item.url]
    const name = localized ?? override ?? deriveMaterialDisplayName(item.url)
    return {
      id: item.url,
      type: getMaterialType(item.url),
      name,
      url: item.url,
      titleTranslations: item.titleTranslations,
    }
  })
}
