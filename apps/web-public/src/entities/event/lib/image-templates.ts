/**
 * Константы и утилиты для работы с шаблонами изображений событий
 */

import { resolveMediaUrl } from "@shared/lib/utils";

/**
 * Типы шаблонов баннеров
 */
export const BANNER_TEMPLATES = {
  PURPLE_SUNSET: "purple_sunset",
  OCEAN_BLUE: "ocean_blue",
  FOREST_GREEN: "forest_green",
  GOLDEN_HOUR: "golden_hour",
} as const;

export type BannerTemplate =
  (typeof BANNER_TEMPLATES)[keyof typeof BANNER_TEMPLATES];

/**
 * Названия шаблонов для UI
 */
export const BANNER_TEMPLATE_LABELS: Record<BannerTemplate, string> = {
  [BANNER_TEMPLATES.PURPLE_SUNSET]: "Purple Sunset",
  [BANNER_TEMPLATES.OCEAN_BLUE]: "Ocean Blue",
  [BANNER_TEMPLATES.FOREST_GREEN]: "Forest Green",
  [BANNER_TEMPLATES.GOLDEN_HOUR]: "Golden Hour",
};

/**
 * Tailwind классы градиентов для каждого шаблона
 */
export const BANNER_TEMPLATE_GRADIENTS: Record<BannerTemplate, string> = {
  [BANNER_TEMPLATES.PURPLE_SUNSET]:
    "bg-gradient-to-r from-purple-600 via-ember-400 to-ember-400",
  [BANNER_TEMPLATES.OCEAN_BLUE]: "bg-gradient-to-r from-forest-500 to-purple-600",
  [BANNER_TEMPLATES.FOREST_GREEN]:
    "bg-gradient-to-r from-forest-300 via-forest-300 to-forest-400",
  [BANNER_TEMPLATES.GOLDEN_HOUR]:
    "bg-gradient-to-r from-[var(--warning)] via-ember-400 to-[var(--danger)]",
};

/**
 * Тип результата обработки изображения
 */
export type ImageResult =
  | { type: "url"; value: string }
  | { type: "gradient"; value: string; template: BannerTemplate };

/**
 * Проверяет, является ли значение шаблоном градиента
 */
export function isGradientTemplate(value: string): boolean {
  return value.startsWith("template:") || value.startsWith("gradient:");
}

/**
 * Получает класс градиента для шаблона
 * Нормализует название шаблона (пробелы -> подчеркивания, нижний регистр)
 */
export function getGradientClass(templateName: string): string | null {
  // Нормализуем название: пробелы -> подчеркивания, нижний регистр
  const normalized = templateName.toLowerCase().replace(/\s+/g, "_");
  const template = normalized as BannerTemplate;
  return BANNER_TEMPLATE_GRADIENTS[template] ?? null;
}

/**
 * Обрабатывает значение coverImage и возвращает тип и значение
 * 
 * @param coverImage - Значение из API
 * @returns Объект с типом (url или gradient) и значением
 */
export function processImageValue(
  coverImage?: string | null
): ImageResult {
  if (!coverImage) {
    return { type: "url", value: "/images/image.png" };
  }

  // Обработка template: или gradient:
  if (coverImage.startsWith("template:") || coverImage.startsWith("gradient:")) {
    const templateName = coverImage.replace(/^(template|gradient):/, "");
    // Нормализуем название для поиска в BANNER_TEMPLATE_GRADIENTS
    const normalizedName = templateName.toLowerCase().replace(/\s+/g, "_");
    const gradientClass = getGradientClass(templateName);

    if (gradientClass) {
      return {
        type: "gradient",
        value: gradientClass,
        template: normalizedName as BannerTemplate,
      };
    }

    // Если шаблон не найден, возвращаем fallback
    return { type: "url", value: "/images/image.png" };
  }

  // Полный URL
  if (coverImage.startsWith("http://") || coverImage.startsWith("https://")) {
    return { type: "url", value: coverImage };
  }

  return { type: "url", value: resolveMediaUrl(coverImage) ?? "/images/image.png" };
}
