import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import {
  BLOCKNOTE_LIMITS,
  BLOCKNOTE_ALLOWED_BLOCK_TYPES,
} from '../constants/blocknote.constants';

/**
 * Кастомный валидатор для BlockNote документов
 * Проверяет структуру, размер и безопасность документа
 */
@ValidatorConstraint({ name: 'isBlockNoteDocument', async: false })
export class IsBlockNoteDocument implements ValidatorConstraintInterface {
  validate(value: any): boolean {
    if (!value) return true; // nullable

    if (!Array.isArray(value)) return false;

    // Проверка размера сериализованного JSON
    const jsonSize = JSON.stringify(value).length;
    if (jsonSize > BLOCKNOTE_LIMITS.MAX_DOCUMENT_SIZE) {
      return false;
    }

    // Подсчёт общего количества блоков
    let blockCount = 0;
    const countBlocks = (blocks: any[]) => {
      blockCount += blocks.length;
      blocks.forEach((block) => {
        if (block.children && Array.isArray(block.children)) {
          countBlocks(block.children);
        }
      });
    };
    countBlocks(value);

    if (blockCount > BLOCKNOTE_LIMITS.MAX_BLOCKS_COUNT) {
      return false;
    }

    // Валидация структуры с проверкой глубины
    return value.every((block) => this.isValidBlock(block, 1));
  }

  private isValidBlock(block: any, depth: number): boolean {
    // Проверка глубины вложенности
    if (depth > BLOCKNOTE_LIMITS.MAX_NESTING_DEPTH) {
      return false;
    }

    // Базовая структура
    if (
      typeof block !== 'object' ||
      typeof block.id !== 'string' ||
      typeof block.type !== 'string'
    ) {
      return false;
    }

    // Проверка допустимых типов блоков
    if (!BLOCKNOTE_ALLOWED_BLOCK_TYPES.includes(block.type)) {
      return false;
    }

    // Валидация ID (должен быть безопасным)
    if (
      block.id.length > BLOCKNOTE_LIMITS.MAX_ID_LENGTH ||
      !/^[a-zA-Z0-9_-]+$/.test(block.id)
    ) {
      return false;
    }

    // Валидация контента
    if (block.content !== undefined) {
      // Для table блоков content это объект tableContent
      if (block.type === 'table') {
        if (!this.isValidTableContent(block.content)) {
          return false;
        }
      } else {
        // Для остальных блоков content это массив inline контента
        if (!Array.isArray(block.content)) return false;
        if (!block.content.every((c: any) => this.isValidInlineContent(c))) {
          return false;
        }
      }
    }

    // Валидация вложенных блоков
    if (block.children !== undefined) {
      if (!Array.isArray(block.children)) return false;
      if (!block.children.every((c: any) => this.isValidBlock(c, depth + 1))) {
        return false;
      }
    }

    return true;
  }

  private isValidTableContent(content: any): boolean {
    if (typeof content !== 'object' || content === null) return false;

    // Обязательно: type должен быть tableContent
    if (content.type !== 'tableContent') return false;

    // Обязательно: headerRows должен быть числом
    if (typeof content.headerRows !== 'number') return false;

    // Обязательно: rows должен быть массивом
    if (!Array.isArray(content.rows)) return false;

    // Обязательно: columnWidths должен быть массивом (после нормализации)
    if (!Array.isArray(content.columnWidths)) return false;

    // Валидация каждой строки и ячейки
    return content.rows.every((row: any) => {
      if (!row || !Array.isArray(row.cells)) return false;

      return row.cells.every((cell: any) => {
        if (!cell || cell.type !== 'tableCell') return false;

        // Проверка обязательных props ячейки
        if (!cell.props || typeof cell.props !== 'object') return false;

        const requiredCellProps = [
          'colspan',
          'rowspan',
          'textColor',
          'textAlignment',
          'backgroundColor',
        ];
        for (const prop of requiredCellProps) {
          if (!(prop in cell.props)) return false;
        }

        // Валидация контента ячейки
        if (!Array.isArray(cell.content)) return false;

        return cell.content.every((c: any) => this.isValidInlineContent(c));
      });
    });
  }

  private isValidInlineContent(content: any): boolean {
    if (typeof content !== 'object') return false;

    // Проверка типа
    if (!['text', 'link'].includes(content.type)) return false;

    // Валидация текста
    if (content.text && typeof content.text === 'string') {
      if (content.text.length > BLOCKNOTE_LIMITS.MAX_TEXT_LENGTH) {
        return false;
      }
    }

    // Валидация ссылок
    if (content.type === 'link' && content.href) {
      if (typeof content.href !== 'string') return false;
      if (content.href.length > BLOCKNOTE_LIMITS.MAX_URL_LENGTH) return false;

      // Базовая проверка URL (детальная санитизация в утилитах)
      try {
        const url = new URL(content.href);
        if (!['http:', 'https:', 'mailto:'].includes(url.protocol)) {
          return false;
        }
      } catch {
        return false;
      }
    }

    // Рекурсивная проверка вложенного контента
    if (content.content && Array.isArray(content.content)) {
      return content.content.every((c: any) => this.isValidInlineContent(c));
    }

    return true;
  }

  defaultMessage(): string {
    return 'Description must be a valid and safe BlockNote document structure';
  }
}
