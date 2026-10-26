/**
 * Градиентные шаблоны для баннеров событий
 */
export const BANNER_TEMPLATES = {
  PURPLE_SUNSET: 'purple_sunset',
  OCEAN_BLUE: 'ocean_blue',
  FOREST_GREEN: 'forest_green',
  GOLDEN_HOUR: 'golden_hour',
} as const

export type BannerTemplate = (typeof BANNER_TEMPLATES)[keyof typeof BANNER_TEMPLATES]

export const BANNER_TEMPLATE_LABELS: Record<BannerTemplate, string> = {
  [BANNER_TEMPLATES.PURPLE_SUNSET]: 'Purple Sunset',
  [BANNER_TEMPLATES.OCEAN_BLUE]: 'Ocean Blue',
  [BANNER_TEMPLATES.FOREST_GREEN]: 'Forest Green',
  [BANNER_TEMPLATES.GOLDEN_HOUR]: 'Golden Hour',
}

export const BANNER_TEMPLATE_GRADIENTS: Record<BannerTemplate, string> = {
  [BANNER_TEMPLATES.PURPLE_SUNSET]: 'bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500',
  [BANNER_TEMPLATES.OCEAN_BLUE]: 'bg-gradient-to-r from-blue-600 to-purple-600',
  [BANNER_TEMPLATES.FOREST_GREEN]: 'bg-gradient-to-r from-green-400 via-cyan-400 to-blue-500',
  [BANNER_TEMPLATES.GOLDEN_HOUR]: 'bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600',
}

/**
 * Проверяет, является ли coverImage шаблоном
 * @param coverImage - значение coverImage из события (может быть `template:${template}` или URL)
 * @returns true если это шаблон
 */
export function isBannerTemplate(coverImage: string | null | undefined): boolean {
  return coverImage?.startsWith('template:') ?? false
}

/**
 * Извлекает шаблон из coverImage
 * @param coverImage - значение coverImage из события
 * @returns шаблон или null
 */
export function getBannerTemplate(coverImage: string | null | undefined): BannerTemplate | null {
  if (!isBannerTemplate(coverImage) || !coverImage) return null
  const template = coverImage.replace('template:', '') as BannerTemplate
  return Object.values(BANNER_TEMPLATES).includes(template) ? template : null
}

/**
 * Получает CSS класс градиента для шаблона
 * @param coverImage - значение coverImage из события
 * @returns CSS класс градиента или null
 */
export function getBannerTemplateGradient(coverImage: string | null | undefined): string | null {
  const template = getBannerTemplate(coverImage)
  return template ? BANNER_TEMPLATE_GRADIENTS[template] : null
}
