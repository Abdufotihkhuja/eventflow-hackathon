export type RichTextPath = Array<string | number>

export type RichTextSegmentKind = 'text' | 'link_text' | 'table_cell_text' | 'caption'

export type RichTextSegment = {
  id: string
  path: RichTextPath
  kind: RichTextSegmentKind
  text: string
  blockId?: string
  blockType?: string
}

export type BlockNoteDocument = BlockNoteBlock[]

export type BlockNoteBlock = {
  id?: string
  type: string
  props?: Record<string, unknown>
  content?: unknown
  children?: unknown[]
  [key: string]: unknown
}

export type ValidationIssue = {
  code:
    | 'invalid_document'
    | 'missing_segment'
    | 'path_mismatch'
    | 'missing_path'
    | 'invalid_text_path'
    | 'duplicate_path'
    | 'structure_changed'
  message: string
  path?: RichTextPath
  segmentId?: string
}

export type ValidationResult = {
  valid: boolean
  errors: ValidationIssue[]
}

export type ApplyRichTextSegmentsResult = {
  document: BlockNoteDocument
  validation: ValidationResult
  appliedCount: number
  skippedCount: number
}

type SegmentCollectorOptions = {
  kind: RichTextSegmentKind
  block: BlockNoteBlock
}

const CODE_BLOCK_TYPES = new Set(['codeBlock', 'code'])

export function isBlockNoteDocument(value: unknown): value is BlockNoteDocument {
  return Array.isArray(value) && value.every(isBlockNoteBlock)
}

export function extractRichTextSegments(document: unknown): RichTextSegment[] {
  if (!isBlockNoteDocument(document)) {
    return []
  }

  const segments: RichTextSegment[] = []
  document.forEach((block, blockIndex) => {
    collectBlockSegments(block, [blockIndex], segments)
  })

  return segments
}

export function applyRichTextSegments(
  document: unknown,
  translatedSegments: RichTextSegment[]
): ApplyRichTextSegmentsResult {
  const cloned = deepCloneBlockNoteDocument(document)
  if (!cloned) {
    return {
      document: [],
      validation: invalidResult('invalid_document', 'Expected a top-level BlockNote block array'),
      appliedCount: 0,
      skippedCount: translatedSegments.length,
    }
  }

  const originalSegments = extractRichTextSegments(document)
  const originalById = new Map(originalSegments.map(segment => [segment.id, segment]))
  const errors: ValidationIssue[] = []
  const seenPaths = new Set<string>()

  for (const translated of translatedSegments) {
    const pathKey = encodePath(translated.path)
    if (seenPaths.has(pathKey)) {
      errors.push({
        code: 'duplicate_path',
        message: 'Multiple translated segments target the same path',
        path: translated.path,
        segmentId: translated.id,
      })
      continue
    }
    seenPaths.add(pathKey)

    const original = originalById.get(translated.id)
    if (!original) {
      errors.push({
        code: 'missing_segment',
        message: 'Translated segment does not exist in the original document',
        path: translated.path,
        segmentId: translated.id,
      })
      continue
    }

    const target = readPath(cloned, translated.path)
    if (!target.exists) {
      errors.push({
        code: 'missing_path',
        message: 'Translated segment path is missing from the cloned document',
        path: translated.path,
        segmentId: translated.id,
      })
      continue
    }

    if (encodePath(original.path) !== pathKey) {
      errors.push({
        code: 'path_mismatch',
        message: 'Translated segment path does not match the original segment path',
        path: translated.path,
        segmentId: translated.id,
      })
      continue
    }

    if (typeof target.value !== 'string') {
      errors.push({
        code: 'invalid_text_path',
        message: 'Translated segment path no longer points to a string text value',
        path: translated.path,
        segmentId: translated.id,
      })
      continue
    }

    if (target.value !== original.text) {
      errors.push({
        code: 'invalid_text_path',
        message: 'Original text at translated segment path no longer matches the extracted segment',
        path: translated.path,
        segmentId: translated.id,
      })
    }
  }

  if (errors.length > 0) {
    return {
      document: cloned,
      validation: { valid: false, errors },
      appliedCount: 0,
      skippedCount: translatedSegments.length,
    }
  }

  const originalClone = deepCloneDocument(cloned)

  for (const translated of translatedSegments) {
    writePath(cloned, translated.path, translated.text)
  }

  const validation = validateRichTextStructurePreserved(document, cloned)
  if (!validation.valid) {
    return {
      document: originalClone,
      validation,
      appliedCount: 0,
      skippedCount: translatedSegments.length,
    }
  }

  return {
    document: cloned,
    validation,
    appliedCount: translatedSegments.length,
    skippedCount: 0,
  }
}

export function computeRichTextVisibleTextHash(document: unknown): string {
  const payload = extractRichTextSegments(document).map(segment => ({
    kind: segment.kind,
    text: normalizeVisibleText(segment.text),
  }))

  return hashStableValue(payload)
}

export function computeRichTextStructureHash(document: unknown): string {
  if (!isBlockNoteDocument(document)) {
    return hashStableValue({ invalidDocument: true })
  }

  return hashStableValue(document.map((block, index) => createBlockStructure(block, [index])))
}

export function validateRichTextStructurePreserved(
  original: unknown,
  translated: unknown
): ValidationResult {
  if (!isBlockNoteDocument(original) || !isBlockNoteDocument(translated)) {
    return invalidResult(
      'invalid_document',
      'Both original and translated values must be top-level BlockNote block arrays'
    )
  }

  const originalHash = computeRichTextStructureHash(original)
  const translatedHash = computeRichTextStructureHash(translated)

  if (originalHash !== translatedHash) {
    return {
      valid: false,
      errors: [
        {
          code: 'structure_changed',
          message: 'BlockNote structure changed after text reinsertion',
        },
      ],
    }
  }

  return { valid: true, errors: [] }
}

function collectBlockSegments(
  block: BlockNoteBlock,
  blockPath: RichTextPath,
  segments: RichTextSegment[]
): void {
  if (CODE_BLOCK_TYPES.has(block.type)) {
    return
  }

  if (Array.isArray(block.content)) {
    collectInlineSegments(block.content, [...blockPath, 'content'], segments, {
      kind: 'text',
      block,
    })
  } else if (isTableContent(block.content) && block.type === 'table') {
    collectTableSegments(block, blockPath, segments)
  }

  if (Array.isArray(block.children)) {
    block.children.forEach((child, childIndex) => {
      if (isBlockNoteBlock(child)) {
        collectBlockSegments(child, [...blockPath, 'children', childIndex], segments)
      }
    })
  }
}

function collectTableSegments(
  block: BlockNoteBlock,
  blockPath: RichTextPath,
  segments: RichTextSegment[]
): void {
  const content = block.content
  if (!isTableContent(content)) return

  content.rows.forEach((row, rowIndex) => {
    if (!isRecord(row) || !Array.isArray(row.cells)) return

    row.cells.forEach((cell, cellIndex) => {
      if (!isRecord(cell) || !Array.isArray(cell.content)) return

      collectInlineSegments(
        cell.content,
        [...blockPath, 'content', 'rows', rowIndex, 'cells', cellIndex, 'content'],
        segments,
        { kind: 'table_cell_text', block }
      )
    })
  })
}

function collectInlineSegments(
  inlineItems: unknown[],
  basePath: RichTextPath,
  segments: RichTextSegment[],
  options: SegmentCollectorOptions
): void {
  inlineItems.forEach((item, index) => {
    const itemPath = [...basePath, index]
    if (!isRecord(item)) return

    if (item.type === 'text' && typeof item.text === 'string') {
      addSegment(segments, [...itemPath, 'text'], options.kind, item.text, options.block)
      return
    }

    if (item.type === 'link' && Array.isArray(item.content)) {
      collectInlineSegments(item.content, [...itemPath, 'content'], segments, {
        ...options,
        kind: options.kind === 'table_cell_text' ? 'table_cell_text' : 'link_text',
      })
    }
  })
}

function addSegment(
  segments: RichTextSegment[],
  path: RichTextPath,
  kind: RichTextSegmentKind,
  text: string,
  block: BlockNoteBlock
): void {
  if (shouldSkipVisibleText(text)) return

  segments.push({
    id: `${kind}:${encodePath(path)}`,
    path,
    kind,
    text,
    blockId: typeof block.id === 'string' ? block.id : undefined,
    blockType: block.type,
  })
}

function createBlockStructure(block: BlockNoteBlock, blockPath: RichTextPath): unknown {
  const base = {
    path: blockPath,
    id: typeof block.id === 'string' ? block.id : null,
    type: block.type,
    props: stableNonTextValue(block.props),
    content: createContentStructure(block, blockPath),
    children: Array.isArray(block.children)
      ? block.children.map((child, childIndex) =>
          isBlockNoteBlock(child)
            ? createBlockStructure(child, [...blockPath, 'children', childIndex])
            : { path: [...blockPath, 'children', childIndex], invalid: true }
        )
      : [],
  }

  return base
}

function createContentStructure(block: BlockNoteBlock, blockPath: RichTextPath): unknown {
  if (Array.isArray(block.content)) {
    return {
      kind: 'inline',
      items: block.content.map((item, index) =>
        createInlineStructure(item, [...blockPath, 'content', index])
      ),
    }
  }

  if (isTableContent(block.content) && block.type === 'table') {
    return {
      kind: 'table',
      columnWidths: [...block.content.columnWidths],
      headerRows: block.content.headerRows,
      rows: block.content.rows.map((row, rowIndex) => ({
        path: [...blockPath, 'content', 'rows', rowIndex],
        cells: isRecord(row) && Array.isArray(row.cells)
          ? row.cells.map((cell, cellIndex) =>
              createTableCellStructure(cell, [
                ...blockPath,
                'content',
                'rows',
                rowIndex,
                'cells',
                cellIndex,
              ])
            )
          : [],
      })),
    }
  }

  if (typeof block.content === 'string' && CODE_BLOCK_TYPES.has(block.type)) {
    return { kind: 'code', hasContent: true }
  }

  return { kind: block.content === undefined ? 'empty' : typeof block.content }
}

function createTableCellStructure(cell: unknown, cellPath: RichTextPath): unknown {
  if (!isRecord(cell)) {
    return { path: cellPath, invalid: true }
  }

  return {
    path: cellPath,
    type: typeof cell.type === 'string' ? cell.type : null,
    props: stableNonTextValue(cell.props),
    content: Array.isArray(cell.content)
      ? cell.content.map((item, index) => createInlineStructure(item, [...cellPath, 'content', index]))
      : [],
  }
}

function createInlineStructure(item: unknown, itemPath: RichTextPath): unknown {
  if (!isRecord(item)) {
    return { path: itemPath, kind: typeof item }
  }

  if (item.type === 'text') {
    return {
      path: itemPath,
      type: 'text',
      hasText: typeof item.text === 'string',
      styles: stableNonTextValue(item.styles),
    }
  }

  if (item.type === 'link') {
    return {
      path: itemPath,
      type: 'link',
      href: typeof item.href === 'string' ? item.href : null,
      content: Array.isArray(item.content)
        ? item.content.map((child, index) => createInlineStructure(child, [...itemPath, 'content', index]))
        : [],
    }
  }

  return {
    path: itemPath,
    type: typeof item.type === 'string' ? item.type : null,
  }
}

function stableNonTextValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stableNonTextValue)
  }

  if (!isRecord(value)) {
    return value ?? null
  }

  return Object.keys(value)
    .sort()
    .reduce<Record<string, unknown>>((acc, key) => {
      acc[key] = stableNonTextValue(value[key])
      return acc
    }, {})
}

function normalizeVisibleText(text: string): string {
  return text.trim().replace(/\s+/g, ' ')
}

function shouldSkipVisibleText(text: string): boolean {
  const normalized = normalizeVisibleText(text)
  if (normalized.length === 0) return true

  return (
    isUrlLike(normalized) ||
    isEmailLike(normalized) ||
    isPhoneLike(normalized) ||
    isPriceLike(normalized) ||
    isDateLike(normalized) ||
    isIdLike(normalized) ||
    isFilePathLike(normalized)
  )
}

function isUrlLike(value: string): boolean {
  return /^(https?:\/\/|www\.)\S+$/i.test(value)
}

function isEmailLike(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function isPhoneLike(value: string): boolean {
  const digits = value.replace(/\D/g, '')
  return digits.length >= 7 && /^[+()\d\s.-]+$/.test(value)
}

function isPriceLike(value: string): boolean {
  return /^(?:[$€₽]|UZS|USD|EUR|RUB)\s?\d[\d\s.,]*$|^\d[\d\s.,]*\s?(?:UZS|USD|EUR|RUB)$/i.test(
    value
  )
}

function isDateLike(value: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}(?:[T\s]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})?)?$/.test(
      value
    ) || /^\d{1,2}[./-]\d{1,2}[./-]\d{2,4}$/.test(value)
  )
}

function isIdLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  )
}

function isFilePathLike(value: string): boolean {
  return (
    /^(?:\/|\.\.?\/|[A-Za-z]:\\)\S+/.test(value) ||
    /^[\w.-]+\.(?:pdf|docx?|xlsx?|pptx?|png|jpe?g|webp|gif|svg|mp4|mov|mp3|wav|zip)$/i.test(value)
  )
}

function hashStableValue(value: unknown): string {
  return `fnv1a32:${fnv1a32(stableStringify(value))}`
}

function fnv1a32(value: string): string {
  let hash = 0x811c9dc5

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }

  return (hash >>> 0).toString(16).padStart(8, '0')
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`
  }

  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(',')}}`
  }

  return JSON.stringify(value)
}

function readPath(root: unknown, path: RichTextPath): { exists: boolean; value: unknown } {
  let cursor = root

  for (const part of path) {
    if (typeof part === 'number') {
      if (!Array.isArray(cursor) || part < 0 || part >= cursor.length) {
        return { exists: false, value: undefined }
      }
      cursor = cursor[part]
      continue
    }

    if (!isRecord(cursor) || !(part in cursor)) {
      return { exists: false, value: undefined }
    }
    cursor = cursor[part]
  }

  return { exists: true, value: cursor }
}

function writePath(root: unknown, path: RichTextPath, value: string): void {
  const parentPath = path.slice(0, -1)
  const key = path[path.length - 1]
  const parent = readPath(root, parentPath).value

  if (typeof key === 'number' && Array.isArray(parent)) {
    parent[key] = value
  } else if (typeof key === 'string' && isRecord(parent)) {
    parent[key] = value
  }
}

function deepCloneBlockNoteDocument(value: unknown): BlockNoteDocument | null {
  if (!isBlockNoteDocument(value)) {
    return null
  }

  return deepCloneDocument(value)
}

function deepCloneDocument(document: BlockNoteDocument): BlockNoteDocument {
  return JSON.parse(JSON.stringify(document)) as BlockNoteDocument
}

function invalidResult(code: ValidationIssue['code'], message: string): ValidationResult {
  return {
    valid: false,
    errors: [{ code, message }],
  }
}

function encodePath(path: RichTextPath): string {
  return path.map(part => JSON.stringify(part)).join('/')
}

function isBlockNoteBlock(value: unknown): value is BlockNoteBlock {
  return isRecord(value) && typeof value.type === 'string'
}

function isTableContent(value: unknown): value is {
  type: 'tableContent'
  columnWidths: number[]
  headerRows: number
  rows: unknown[]
} {
  return (
    isRecord(value) &&
    value.type === 'tableContent' &&
    Array.isArray(value.rows) &&
    Array.isArray(value.columnWidths) &&
    typeof value.headerRows === 'number'
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
