import {
  BlockNoteDocument,
  BlockNoteBlock,
  BlockNoteInlineContent,
} from '../types/blocknote.types';
import { BLOCKNOTE_ALLOWED_PROTOCOLS } from '../constants/blocknote.constants';

/**
 * Утилиты для работы с BlockNote документами
 * Включает конвертацию и санитизацию для безопасности
 */
export class BlockNoteUtil {
  /**
   * Санитизирует текст, удаляя потенциально опасные символы
   * Защита от XSS атак
   */
  private static sanitizeText(text: string): string {
    return text
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * Санитизирует URL, проверяя протокол и блокируя опасные схемы
   * Защита от javascript: и data: URI инъекций
   */
  private static sanitizeUrl(url: string): string {
    try {
      const parsed = new URL(url);

      // Проверка разрешённых протоколов
      if (!BLOCKNOTE_ALLOWED_PROTOCOLS.includes(parsed.protocol as any)) {
        return '#';
      }

      // Запрет на javascript: и data: URI
      if (
        url.toLowerCase().startsWith('javascript:') ||
        url.toLowerCase().startsWith('data:')
      ) {
        return '#';
      }

      return url;
    } catch {
      return '#';
    }
  }

  /**
   * Санитизирует цвет, разрешая только hex формат
   * Предотвращает инъекцию произвольного CSS
   */
  private static sanitizeColor(color: string): string | null {
    if (/^#[0-9A-Fa-f]{3}$|^#[0-9A-Fa-f]{6}$/.test(color)) {
      return color;
    }
    return null;
  }

  /**
   * Конвертирует BlockNote документ в простой текст (для превью)
   * Используется для генерации shortDescription или поиска
   */
  static toPlainText(document: BlockNoteDocument, maxLength?: number): string {
    let text = '';

    const extractText = (blocks: BlockNoteBlock[]) => {
      for (const block of blocks) {
        if (block.content && Array.isArray(block.content)) {
          for (const content of block.content) {
            text += this.inlineContentToText(content);
          }
          text += '\n';
        }

        if (block.children && block.children.length > 0) {
          extractText(block.children);
        }
      }
    };

    extractText(document);
    text = text.trim();

    if (maxLength && text.length > maxLength) {
      return text.substring(0, maxLength) + '...';
    }

    return text;
  }

  private static inlineContentToText(content: BlockNoteInlineContent): string {
    if (content.type === 'text' && content.text) {
      return content.text;
    }

    if (content.type === 'link' && content.content) {
      return content.content.map((c) => this.inlineContentToText(c)).join('');
    }

    return '';
  }

  /**
   * Конвертирует BlockNote документ в безопасный HTML
   * Полная санитизация всех данных для предотвращения XSS
   */
  static toHTML(document: BlockNoteDocument): string {
    return document.map((block) => this.blockToHTML(block)).join('');
  }

  private static blockToHTML(block: BlockNoteBlock): string {
    const content = block.content
      ? block.content.map((c) => this.inlineContentToHTML(c)).join('')
      : '';

    const children = block.children
      ? block.children.map((c) => this.blockToHTML(c)).join('')
      : '';

    switch (block.type) {
      case 'heading':
        // Ограничиваем уровень заголовка от 1 до 6
        const level = Math.min(Math.max(block.props?.level || 1, 1), 6);
        return `<h${level}>${content}</h${level}>`;
      case 'paragraph':
        return `<p>${content}</p>`;
      case 'bulletListItem':
        return `<li>${content}${children ? `<ul>${children}</ul>` : ''}</li>`;
      case 'numberedListItem':
        return `<li>${content}${children ? `<ol>${children}</ol>` : ''}</li>`;
      case 'checkListItem':
        const checked = block.props?.checked ? 'checked' : '';
        return `<li><input type="checkbox" ${checked} disabled>${content}</li>`;
      case 'quote':
        return `<blockquote>${content}${children}</blockquote>`;
      case 'codeBlock':
        const language = this.sanitizeText(block.props?.language || '');
        return `<pre><code class="language-${language}">${this.sanitizeText(content)}</code></pre>`;
      default:
        return `<div>${content}${children}</div>`;
    }
  }

  private static inlineContentToHTML(content: BlockNoteInlineContent): string {
    let text = content.text ? this.sanitizeText(content.text) : '';

    if (content.type === 'link' && content.href) {
      const sanitizedHref = this.sanitizeUrl(content.href);
      const linkText = content.content
        ? content.content.map((c) => this.inlineContentToHTML(c)).join('')
        : text;
      // Добавляем rel="noopener noreferrer" для безопасности
      return `<a href="${sanitizedHref}" rel="noopener noreferrer" target="_blank">${linkText}</a>`;
    }

    if (content.styles) {
      if (content.styles.bold) text = `<strong>${text}</strong>`;
      if (content.styles.italic) text = `<em>${text}</em>`;
      if (content.styles.underline) text = `<u>${text}</u>`;
      if (content.styles.strikethrough) text = `<s>${text}</s>`;

      // Санитизация цветов (только hex формат)
      if (content.styles.textColor) {
        const color = this.sanitizeColor(content.styles.textColor);
        if (color) text = `<span style="color:${color}">${text}</span>`;
      }
      if (content.styles.backgroundColor) {
        const color = this.sanitizeColor(content.styles.backgroundColor);
        if (color)
          text = `<span style="background-color:${color}">${text}</span>`;
      }
    }

    return text;
  }

  /**
   * Проверяет, является ли документ пустым
   */
  static isEmpty(document: BlockNoteDocument): boolean {
    if (!document || document.length === 0) return true;

    return document.every((block) => {
      const hasNoContent =
        !block.content ||
        block.content.length === 0 ||
        block.content.every((c) => !c.text || c.text.trim() === '');
      const hasNoChildren = !block.children || block.children.length === 0;

      return hasNoContent && hasNoChildren;
    });
  }

  /**
   * Валидирует структуру BlockNote документа
   */
  static isValid(document: any): document is BlockNoteDocument {
    if (!Array.isArray(document)) return false;

    return document.every((block) => this.isValidBlock(block));
  }

  private static isValidBlock(block: any): boolean {
    return (
      typeof block === 'object' &&
      typeof block.id === 'string' &&
      typeof block.type === 'string'
    );
  }

  /**
   * Нормализует BlockNote документ, добавляя недостающие поля
   * Особенно важно для таблиц которые требуют специфическую структуру
   */
  static normalizeDocument(document: any[]): any[] {
    if (!Array.isArray(document)) return [];

    return document.map((block) => this.normalizeBlock(block));
  }

  /**
   * Нормализует отдельный блок
   */
  private static normalizeBlock(block: any): any {
    if (!block || typeof block !== 'object') return block;

    // Добавляем children если отсутствует
    if (!Array.isArray(block.children)) {
      block.children = [];
    }

    // Рекурсивно нормализуем children
    block.children = block.children.map((child: any) =>
      this.normalizeBlock(child),
    );

    // Специальная обработка для таблиц
    if (block.type === 'table') {
      return this.normalizeTableBlock(block);
    }

    return block;
  }

  /**
   * Нормализует блок таблицы согласно спецификации BlockNote
   */
  private static normalizeTableBlock(block: any): any {
    // Базовые props
    if (!block.props || typeof block.props !== 'object') {
      block.props = {};
    }
    block.props = {
      textColor: block.props.textColor ?? 'default',
      backgroundColor: block.props.backgroundColor ?? 'default',
      ...block.props,
    };

    // Инициализируем content если отсутствует
    if (!block.content || typeof block.content !== 'object') {
      block.content = {
        type: 'tableContent',
        headerRows: 0,
        rows: [],
        columnWidths: [],
      };
    }

    // Добавляем type в content
    if (block.content.type !== 'tableContent') {
      block.content.type = 'tableContent';
    }

    // Добавляем headerRows если отсутствует
    if (typeof block.content.headerRows !== 'number') {
      block.content.headerRows = 0;
    }

    // Добавляем rows если отсутствует
    if (!Array.isArray(block.content.rows)) {
      block.content.rows = [];
    }

    // Подсчитываем максимальное количество колонок
    let maxColumns = 0;

    // Нормализуем каждую строку
    block.content.rows = block.content.rows.map((row: any) => {
      if (!row || typeof row !== 'object') {
        row = { cells: [] };
      }

      if (!Array.isArray(row.cells)) {
        row.cells = [];
      }

      // Нормализуем каждую ячейку
      row.cells = row.cells.map((cell: any) => this.normalizeTableCell(cell));

      if (row.cells.length > maxColumns) {
        maxColumns = row.cells.length;
      }

      return row;
    });

    // Добавляем columnWidths если отсутствует или неправильной длины
    if (!Array.isArray(block.content.columnWidths)) {
      block.content.columnWidths = [];
    }

    // Расширяем columnWidths до нужной длины
    while (block.content.columnWidths.length < maxColumns) {
      block.content.columnWidths.push(null);
    }

    // Добавляем children если отсутствует
    if (!Array.isArray(block.children)) {
      block.children = [];
    }

    return block;
  }

  /**
   * Нормализует ячейку таблицы
   */
  private static normalizeTableCell(cell: any): any {
    if (!cell || typeof cell !== 'object') {
      cell = {};
    }

    // Добавляем type
    if (cell.type !== 'tableCell') {
      cell.type = 'tableCell';
    }

    // Нормализуем props
    if (!cell.props || typeof cell.props !== 'object') {
      cell.props = {};
    }

    cell.props = {
      colspan: cell.props.colspan ?? 1,
      rowspan: cell.props.rowspan ?? 1,
      textColor: cell.props.textColor ?? 'default',
      textAlignment: cell.props.textAlignment ?? 'left',
      backgroundColor: cell.props.backgroundColor ?? 'default',
    };

    // Добавляем content если отсутствует
    if (!Array.isArray(cell.content)) {
      cell.content = [];
    }

    return cell;
  }
}
