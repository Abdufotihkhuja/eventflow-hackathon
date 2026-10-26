/**
 * TypeScript типы для BlockNote документов
 * Основано на официальной документации BlockNote
 * @see https://www.blocknotejs.org/docs/editor-basics/document-structure
 */

/**
 * Стили для inline контента (текст)
 */
export interface BlockNoteStyles {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  textColor?: string; // hex формат (#RGB или #RRGGBB)
  backgroundColor?: string; // hex формат (#RGB или #RRGGBB)
}

/**
 * Inline контент - текст или ссылка
 */
export interface BlockNoteInlineContent {
  type: 'text' | 'link';
  text?: string;
  content?: BlockNoteInlineContent[]; // Для ссылок
  href?: string; // Для ссылок
  styles?: BlockNoteStyles;
}

/**
 * Блок документа
 */
export interface BlockNoteBlock {
  id: string; // Уникальный идентификатор блока
  type: string; // Тип блока (paragraph, heading, list, etc.)
  props?: Record<string, any>; // Свойства блока (level для heading, checked для checkbox, etc.)
  content?: BlockNoteInlineContent[]; // Содержимое блока
  children?: BlockNoteBlock[]; // Вложенные блоки
}

/**
 * Документ BlockNote - массив блоков
 */
export type BlockNoteDocument = BlockNoteBlock[];
