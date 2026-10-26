import type { EventDescription, BlockNoteBlock } from '@api/services/event.types'

/**
 * Извлекает текст из BlockNote блока рекурсивно
 */
function extractTextFromBlock(block: BlockNoteBlock): string {
  let contentText = ''

  // content может быть строкой или массивом
  if (typeof block.content === 'string') {
    contentText = block.content
  } else if (Array.isArray(block.content)) {
    contentText = block.content
      .map(item => {
        if (typeof item === 'string') return item
        if (item && typeof item === 'object' && 'text' in item) return item.text
        return ''
      })
      .filter(Boolean)
      .join('')
  }

  const childrenText =
    block.children
      ?.map(extractTextFromBlock)
      .filter(Boolean)
      .join(' ') ?? ''

  return [contentText, childrenText].filter(Boolean).join(' ')
}

/**
 * Проверяет, является ли описание массивом BlockNote блоков
 */
function isBlockNoteArray(description: EventDescription): description is BlockNoteBlock[] {
  return Array.isArray(description)
}

/**
 * Извлекает текст из описания события
 * Поддерживает как строки, так и массив BlockNote блоков
 */
export function getDescriptionText(description: EventDescription, maxLength?: number): string {
  if (!description) return ''

  // Если это строка - возвращаем как есть
  if (typeof description === 'string') {
    return maxLength ? description.slice(0, maxLength) : description
  }

  // Если это массив BlockNote блоков
  if (isBlockNoteArray(description)) {
    // Пустой массив — нет описания
    if (description.length === 0) return ''

    const text = description
      .map(extractTextFromBlock)
      .filter(Boolean)
      .join('\n')
      .trim()

    return maxLength ? text.slice(0, maxLength) : text
  }

  return ''
}
