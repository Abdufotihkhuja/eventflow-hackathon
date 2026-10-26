/**
 * Нормализует структуру таблиц в BlockNote контенте
 * Исправляет проблемы с отсутствующими полями и порядком полей в tableContent
 */

interface TableCell {
  type: string
  props: {
    colspan: number
    rowspan: number
    textColor: string
    textAlignment: string
    backgroundColor: string
  }
  content: unknown[]
}

interface TableRow {
  cells: TableCell[]
}

// Структура TableContent согласно документации BlockNote
// https://www.blocknotejs.org/docs/features/blocks/tables
interface TableContent {
  type: 'tableContent'
  columnWidths: number[]
  headerRows: number
  rows: TableRow[]
}

interface BlockNoteBlock {
  id?: string
  type: string
  props?: Record<string, unknown>
  content?: string | unknown[] | TableContent | Record<string, unknown>
  children?: unknown[]
}

/**
 * Нормализует один блок таблицы
 */
function normalizeTableBlock(block: BlockNoteBlock): BlockNoteBlock {
  if (block.type !== 'table') {
    return block
  }

  // Если content отсутствует или не объект, создаём базовую структуру
  if (!block.content || typeof block.content !== 'object' || Array.isArray(block.content)) {
    return {
      ...block,
      content: {
        type: 'tableContent',
        headerRows: 0,
        rows: [],
        columnWidths: [],
      },
      children: block.children || [],
    }
  }

  const content = block.content as Record<string, unknown>

  // Получаем количество колонок из первой строки
  const rows = Array.isArray(content.rows) ? (content.rows as TableRow[]) : []
  const columnsCount = rows.length > 0 && rows[0]?.cells ? rows[0].cells.length : 0

  // Нормализуем columnWidths - BlockNote требует массив чисел, null не допускается
  let normalizedColumnWidths: number[] = []
  if (Array.isArray(content.columnWidths)) {
    // Заменяем null на дефолтную ширину (120px)
    normalizedColumnWidths = (content.columnWidths as unknown[]).map(width =>
      typeof width === 'number' ? width : 120
    )
  } else if (columnsCount > 0) {
    // Создаём массив дефолтных ширин
    normalizedColumnWidths = Array(columnsCount).fill(120)
  }

  // Нормализуем headerRows
  const normalizedHeaderRows = typeof content.headerRows === 'number' ? content.headerRows : 0

  // КРИТИЧНО: порядок полей ДОЛЖЕН соответствовать схеме BlockNote!
  // type -> columnWidths -> headerRows -> rows
  const normalizedContent: TableContent = {
    type: 'tableContent',
    columnWidths: normalizedColumnWidths,
    headerRows: normalizedHeaderRows,
    rows: rows,
  }

  // Debug: проверяем что было и что стало
  if (process.env.NODE_ENV === 'development') {
    if (!content.type || content.type !== 'tableContent') {
      console.log('[normalizeBlockNoteTables] Добавлен type: tableContent для таблицы', block.id)
    }
    if (typeof content.headerRows !== 'number') {
      console.log('[normalizeBlockNoteTables] Добавлен headerRows:', normalizedHeaderRows, 'для таблицы', block.id)
    }
    if (content.columnWidths?.some((w: unknown) => w === null)) {
      console.log('[normalizeBlockNoteTables] Заменены null в columnWidths на числа для таблицы', block.id)
    }
  }

  // Нормализуем каждую строку
  normalizedContent.rows = normalizedContent.rows.map(row => {
    if (!row.cells || !Array.isArray(row.cells)) {
      return { cells: [] }
    }

    return {
      cells: row.cells.map(cell => ({
        type: cell.type || 'tableCell',
        props: {
          colspan: cell.props?.colspan ?? 1,
          rowspan: cell.props?.rowspan ?? 1,
          textColor: cell.props?.textColor ?? 'default',
          textAlignment: cell.props?.textAlignment ?? 'left',
          backgroundColor: cell.props?.backgroundColor ?? 'default',
        },
        content: Array.isArray(cell.content) ? cell.content : [],
      })),
    }
  })

  // columnWidths уже нормализован выше

  return {
    ...block,
    content: normalizedContent,
    children: block.children || [],
  }
}

/**
 * Рекурсивно нормализует блок и его children
 */
function normalizeBlockRecursive(block: BlockNoteBlock): BlockNoteBlock {
  // Сначала нормализуем сам блок (если это таблица)
  const normalizedBlock = normalizeTableBlock(block)

  // Затем рекурсивно обрабатываем children
  if (normalizedBlock.children && Array.isArray(normalizedBlock.children)) {
    normalizedBlock.children = normalizedBlock.children.map(child =>
      normalizeBlockRecursive(child as BlockNoteBlock)
    )
  }

  return normalizedBlock
}

/**
 * Нормализует массив BlockNote блоков
 * Исправляет все таблицы в массиве (включая вложенные в children)
 */
export function normalizeBlockNoteTables(
  blocks: BlockNoteBlock[] | null | undefined
): BlockNoteBlock[] {
  if (!blocks || !Array.isArray(blocks)) {
    return []
  }

  return blocks.map(block => normalizeBlockRecursive(block))
}

/**
 * Проверяет, содержит ли блок таблицу (рекурсивно проверяет children)
 */
export function hasTableBlock(blocks: BlockNoteBlock[] | null | undefined): boolean {
  if (!blocks || !Array.isArray(blocks)) {
    return false
  }

  const checkBlock = (block: BlockNoteBlock): boolean => {
    if (block.type === 'table') {
      return true
    }
    if (block.children && Array.isArray(block.children)) {
      return block.children.some(child => checkBlock(child as BlockNoteBlock))
    }
    return false
  }

  return blocks.some(checkBlock)
}
