/**
 * Константы и лимиты для работы с BlockNote документами
 * Эти ограничения предотвращают DoS атаки и обеспечивают безопасность
 */

export const BLOCKNOTE_LIMITS = {
  MAX_DOCUMENT_SIZE: 500_000, // 500KB сериализованного JSON
  MAX_BLOCKS_COUNT: 1000, // Максимальное количество блоков
  MAX_NESTING_DEPTH: 10, // Максимальная глубина вложенности
  MAX_TEXT_LENGTH: 50_000, // Максимальная длина текста в одном блоке
  MAX_URL_LENGTH: 2048, // Максимальная длина URL
  MAX_ID_LENGTH: 100, // Максимальная длина ID блока
} as const;

/**
 * Белый список допустимых типов блоков
 * Другие типы будут отклонены валидатором
 */
export const BLOCKNOTE_ALLOWED_BLOCK_TYPES = [
  'paragraph',
  'heading',
  'bulletListItem',
  'numberedListItem',
  'checkListItem',
  'toggleListItem', // Сворачиваемый список
  'table',
  'image',
  'video',
  'audio',
  'file',
  'codeBlock',
  'quote',
] as const;

/**
 * Белый список разрешённых протоколов для URL
 * javascript: и data: URI блокируются для предотвращения XSS
 */
export const BLOCKNOTE_ALLOWED_PROTOCOLS = [
  'http:',
  'https:',
  'mailto:',
] as const;
