import type { AgendaMaterial, AgendaMaterialType } from '@api/services'

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
 * Выводит отображаемое имя из URL, если нет в кэше.
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

/**
 * Нормализует массив URL (ответ GET /materials) в список для UI.
 * nameOverrides — кэш имён из ответов загрузки (originalName) и добавления ссылки (title).
 */
export function normalizeMaterials(
  urls: string[],
  nameOverrides: Record<string, string> = {}
): AgendaMaterial[] {
  return urls.map(url => {
    const type = getMaterialType(url)
    const name = nameOverrides[url] ?? deriveMaterialDisplayName(url)
    return {
      id: url,
      type,
      name,
      url,
    }
  })
}
