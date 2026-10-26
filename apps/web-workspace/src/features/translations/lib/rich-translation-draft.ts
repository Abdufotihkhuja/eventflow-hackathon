import {
  applyRichTextSegments,
  computeRichTextStructureHash,
  computeRichTextVisibleTextHash,
  extractRichTextSegments,
  validateRichTextStructurePreserved,
  isBlockNoteDocument,
  type BlockNoteDocument,
  type RichTextSegment,
  type ValidationResult,
} from '../../../shared/lib/rich-text-translation.ts'

import type {
  AppLocale,
  TranslateBatchRequest,
  TranslateBatchResponse,
  TranslationApplyMode,
  TranslationProvider,
} from '../model/types'
import { getTargetLocales } from './translation-state.ts'

export type RichTranslationStatus =
  | 'empty'
  | 'manual'
  | 'auto_translated'
  | 'edited_after_translation'
  | 'outdated'
  | 'translation_error'

export type RichTranslationFieldKey = 'description' | 'content'

export type RichTranslationFieldDraft = Partial<Record<AppLocale, BlockNoteDocument>>

export type RichTranslationLocaleMeta = {
  status: RichTranslationStatus
  sourceLocale?: AppLocale
  sourceHash?: string
  structureHash?: string
  provider?: TranslationProvider
  model?: string
  translatedAt?: string
  error?: string
}

export type RichTranslationsDraft = {
  description: RichTranslationFieldDraft
  content?: RichTranslationFieldDraft
}

export type RichTranslationMetaDraft = {
  description: Partial<Record<AppLocale, RichTranslationLocaleMeta>>
  content?: Partial<Record<AppLocale, RichTranslationLocaleMeta>>
}

export type RichTranslationsPayload = Partial<
  Record<RichTranslationFieldKey, Partial<Record<AppLocale, unknown>>>
>

export type RichTranslationMetaPayload = Partial<
  Record<RichTranslationFieldKey, Partial<Record<AppLocale, unknown>>>
>

export type RichTranslationBatchItem = {
  fieldKey: string
  text: string
  contentType: 'plain_text'
}

export type RichTranslationApplyResult =
  | {
      ok: true
      document: BlockNoteDocument
      meta: RichTranslationLocaleMeta
    }
  | {
      ok: false
      error: string
      provider?: TranslationProvider
      model?: string
      translatedAt?: string
    }

type ApplySafelyOptions = {
  sourceLocale: AppLocale
  targetLocale: AppLocale
  sourceHash?: string
  structureHash?: string
  validateStructure?: typeof validateRichTextStructurePreserved
}

const AUTO_WRITABLE_STATUSES: RichTranslationStatus[] = [
  'auto_translated',
  'outdated',
  'translation_error',
]

export function getVisibleSegmentCount(doc: unknown): number {
  return extractRichTextSegments(doc).length
}

export function isRichDocEmpty(doc: unknown): boolean {
  return getVisibleSegmentCount(doc) === 0
}

export function createRichTranslationsDraft(
  fieldKey: RichTranslationFieldKey,
  persisted: unknown,
  fallbackDoc?: unknown
): RichTranslationsDraft {
  const draft = emptyRichTranslationsDraft(fieldKey)
  const fieldTranslations = getRecordValue(persisted, fieldKey)

  for (const locale of ['ru', 'uz', 'en'] as const) {
    const document = getRecordValue(fieldTranslations, locale)
    if (isBlockNoteDocument(document)) {
      setRichDraftDocument(draft, fieldKey, locale, document)
    }
  }

  if (!draft[fieldKey]?.ru && isBlockNoteDocument(fallbackDoc)) {
    setRichDraftDocument(draft, fieldKey, 'ru', fallbackDoc)
  }

  return draft
}

export function createRichTranslationMetaDraft(
  fieldKey: RichTranslationFieldKey,
  persisted: unknown,
  draft: RichTranslationsDraft
): RichTranslationMetaDraft {
  const meta = emptyRichTranslationMetaDraft(fieldKey)
  const fieldMeta = getRecordValue(persisted, fieldKey)

  for (const locale of ['ru', 'uz', 'en'] as const) {
    const localeMeta = getRecordValue(fieldMeta, locale)
    if (isRichTranslationLocaleMeta(localeMeta)) {
      setRichMetaDocument(meta, fieldKey, locale, localeMeta)
    }
  }

  const ruDoc = draft[fieldKey]?.ru
  if (!meta[fieldKey]?.ru && ruDoc && !isRichDocEmpty(ruDoc)) {
    setRichMetaDocument(meta, fieldKey, 'ru', { status: 'manual' })
  }

  return meta
}

export function getFirstNonEmptyRichLocale(
  draft: RichTranslationsDraft,
  preferredLocale: AppLocale,
  fieldKey: RichTranslationFieldKey = 'description'
): AppLocale | null {
  const fieldDraft = draft[fieldKey] ?? {}
  const preferredDoc = fieldDraft[preferredLocale]
  if (preferredDoc && !isRichDocEmpty(preferredDoc)) {
    return preferredLocale
  }

  return (
    (['ru', 'uz', 'en'] as const).find(locale => {
      const doc = fieldDraft[locale]
      return doc ? !isRichDocEmpty(doc) : false
    }) ?? null
  )
}

export function shouldSkipRichOverwrite(
  status: RichTranslationStatus | undefined,
  mode: TranslationApplyMode,
  targetDoc: unknown
): boolean {
  const targetIsEmpty = isRichDocEmpty(targetDoc)
  const knownStatus = status ?? (targetIsEmpty ? 'empty' : 'manual')

  if (mode === 'overwrite_selected') {
    return false
  }

  if (mode === 'fill_empty') {
    return !targetIsEmpty
  }

  return !AUTO_WRITABLE_STATUSES.includes(knownStatus)
}

export function markRichManualEdit(
  meta: RichTranslationMetaDraft,
  fieldKey: RichTranslationFieldKey,
  locale: AppLocale
): RichTranslationMetaDraft {
  const previous = meta[fieldKey]?.[locale]
  const status: RichTranslationStatus =
    previous?.status === 'auto_translated' ||
    previous?.status === 'outdated' ||
    previous?.status === 'translation_error' ||
    previous?.status === 'edited_after_translation'
      ? 'edited_after_translation'
      : 'manual'

  return setRichMeta(meta, fieldKey, locale, {
    ...previous,
    status,
    error: undefined,
  })
}

export function markRichEmpty(
  meta: RichTranslationMetaDraft,
  fieldKey: RichTranslationFieldKey,
  locale: AppLocale
): RichTranslationMetaDraft {
  return setRichMeta(meta, fieldKey, locale, { status: 'empty' })
}

export function markRichTargetsOutdatedWhenSourceChanged(
  meta: RichTranslationMetaDraft,
  fieldKey: RichTranslationFieldKey,
  sourceLocale: AppLocale,
  sourceDoc: unknown
): RichTranslationMetaDraft {
  const sourceHash = computeRichTextVisibleTextHash(sourceDoc)
  let nextMeta = cloneRichMeta(meta)

  for (const targetLocale of getTargetLocales(sourceLocale)) {
    const current = nextMeta[fieldKey]?.[targetLocale]
    if (
      current?.status === 'auto_translated' &&
      current.sourceLocale === sourceLocale &&
      current.sourceHash !== sourceHash
    ) {
      nextMeta = setRichMeta(nextMeta, fieldKey, targetLocale, {
        ...current,
        status: 'outdated',
        error: undefined,
      })
    }
  }

  return nextMeta
}

/**
 * Newline that joins all block segments into a single payload. Translating one
 * combined request per locale (instead of one request per block) keeps us well
 * under the provider's rate limit (avoids HTTP 429 "partial" results). The
 * backend preserves these newlines (see normalizeSourceText), and the response
 * is split back per block with a strict count check.
 */
const RICH_SEGMENT_DELIMITER = '\n'

export function buildRichTranslationBatchItems(
  fieldKey: string,
  segments: readonly RichTextSegment[]
): RichTranslationBatchItem[] {
  if (segments.length === 0) {
    return []
  }

  const joinedText = segments
    .map(segment => segment.text.replace(/\s+/g, ' ').trim())
    .join(RICH_SEGMENT_DELIMITER)

  return [
    {
      fieldKey,
      text: joinedText,
      contentType: 'plain_text',
    },
  ]
}

export function mapBatchResultsToTranslatedSegments(
  response: TranslateBatchResponse,
  fieldKey: string,
  sourceSegments: readonly RichTextSegment[],
  targetLocale: AppLocale
): { ok: true; segments: RichTextSegment[] } | { ok: false; error: string } {
  const result = response.results.find(
    item => item.targetLocale === targetLocale && item.fieldKey === fieldKey
  )

  if (!result) {
    return {
      ok: false,
      error: `Missing translation for ${fieldKey}`,
    }
  }

  if (result.status !== 'auto_translated' || result.translatedText === null) {
    return {
      ok: false,
      error: result.error ?? `Translation failed for ${fieldKey}`,
    }
  }

  // The combined payload is one block per line; split it back, requiring the
  // exact same block count so we never re-map text into the wrong block.
  const parts = result.translatedText.split('\n')

  if (parts.length !== sourceSegments.length) {
    return {
      ok: false,
      error: `Translation structure mismatch: expected ${sourceSegments.length} blocks, got ${parts.length}`,
    }
  }

  const translatedSegments: RichTextSegment[] = sourceSegments.map((segment, index) => ({
    ...segment,
    text: parts[index].trim(),
  }))

  return { ok: true, segments: translatedSegments }
}

/**
 * Fallback used when the combined (newline-joined) translation can't be split
 * back 1:1 — some providers reflow line breaks for certain languages, so the
 * line count won't match the block count. Here we translate each block as its
 * own item (guaranteed 1:1 mapping). It costs more provider calls, but only
 * runs for the locale that actually reflowed.
 */
export async function translateRichSegmentsPerBlock(
  translate: (request: TranslateBatchRequest) => Promise<TranslateBatchResponse>,
  fieldKey: string,
  sourceLocale: AppLocale,
  targetLocale: AppLocale,
  sourceSegments: readonly RichTextSegment[]
): Promise<{ ok: true; segments: RichTextSegment[] } | { ok: false; error: string }> {
  if (sourceSegments.length === 0) {
    return { ok: true, segments: [] }
  }

  const items: RichTranslationBatchItem[] = sourceSegments.map(segment => ({
    fieldKey: `${fieldKey}:${segment.id}`,
    text: segment.text.replace(/\s+/g, ' ').trim(),
    contentType: 'plain_text',
  }))

  const response = await translate({ sourceLocale, targetLocales: [targetLocale], items })

  const resultByFieldKey = new Map(
    response.results
      .filter(result => result.targetLocale === targetLocale)
      .map(result => [result.fieldKey, result])
  )

  const translatedSegments: RichTextSegment[] = []
  for (const segment of sourceSegments) {
    const batchFieldKey = `${fieldKey}:${segment.id}`
    const result = resultByFieldKey.get(batchFieldKey)

    if (!result) {
      return { ok: false, error: `Missing translation for ${batchFieldKey}` }
    }
    if (result.status !== 'auto_translated' || result.translatedText === null) {
      return { ok: false, error: result.error ?? `Translation failed for ${batchFieldKey}` }
    }

    translatedSegments.push({ ...segment, text: result.translatedText })
  }

  return { ok: true, segments: translatedSegments }
}

export function applyRichTranslationResultSafely(
  sourceDoc: unknown,
  translatedSegments: readonly RichTextSegment[],
  response: TranslateBatchResponse,
  options: ApplySafelyOptions
): RichTranslationApplyResult {
  const sourceHash = options.sourceHash ?? computeRichTextVisibleTextHash(sourceDoc)
  const structureHash = options.structureHash ?? computeRichTextStructureHash(sourceDoc)
  const applyResult = applyRichTextSegments(sourceDoc, [...translatedSegments])

  if (!applyResult.validation.valid) {
    return {
      ok: false,
      error: formatValidationError(applyResult.validation),
    }
  }

  const structureValidation = (options.validateStructure ?? validateRichTextStructurePreserved)(
    sourceDoc,
    applyResult.document
  )

  if (!structureValidation.valid) {
    return {
      ok: false,
      error: formatValidationError(structureValidation),
    }
  }

  const sample = response.results.find(
    result =>
      result.targetLocale === options.targetLocale && result.status === 'auto_translated'
  )

  return {
    ok: true,
    document: applyResult.document,
    meta: {
      status: 'auto_translated',
      sourceLocale: options.sourceLocale,
      sourceHash,
      structureHash,
      provider: sample?.provider ?? undefined,
      model: sample?.model ?? undefined,
      translatedAt: sample?.translatedAt ?? undefined,
      error: undefined,
    },
  }
}

export function markRichTranslationError(
  meta: RichTranslationMetaDraft,
  fieldKey: RichTranslationFieldKey,
  locale: AppLocale,
  error: string,
  sourceLocale?: AppLocale,
  sourceHash?: string
): RichTranslationMetaDraft {
  const previous = meta[fieldKey]?.[locale]
  return setRichMeta(meta, fieldKey, locale, {
    ...previous,
    status: 'translation_error',
    sourceLocale,
    sourceHash,
    error,
  })
}

function cloneRichMeta(meta: RichTranslationMetaDraft): RichTranslationMetaDraft {
  return {
    ...Object.fromEntries(
      Object.entries(meta).map(([fieldKey, fieldMeta]) => [
        fieldKey,
        Object.fromEntries(
          Object.entries(fieldMeta ?? {}).map(([locale, value]) => [
            locale,
            value ? { ...value } : value,
          ])
        ),
      ])
    ),
  }
}

function setRichMeta(
  meta: RichTranslationMetaDraft,
  fieldKey: RichTranslationFieldKey,
  locale: AppLocale,
  value: RichTranslationLocaleMeta
): RichTranslationMetaDraft {
  return {
    ...meta,
    [fieldKey]: {
      ...meta[fieldKey],
      [locale]: value,
    },
  }
}

function emptyRichTranslationsDraft(fieldKey: RichTranslationFieldKey): RichTranslationsDraft {
  return fieldKey === 'content'
    ? { description: {}, content: {} }
    : { description: {} }
}

function emptyRichTranslationMetaDraft(fieldKey: RichTranslationFieldKey): RichTranslationMetaDraft {
  return fieldKey === 'content'
    ? { description: {}, content: {} }
    : { description: {} }
}

function setRichDraftDocument(
  draft: RichTranslationsDraft,
  fieldKey: RichTranslationFieldKey,
  locale: AppLocale,
  document: BlockNoteDocument
) {
  if (fieldKey === 'content') {
    draft.content = { ...(draft.content ?? {}), [locale]: document }
    return
  }
  draft.description = { ...draft.description, [locale]: document }
}

function setRichMetaDocument(
  meta: RichTranslationMetaDraft,
  fieldKey: RichTranslationFieldKey,
  locale: AppLocale,
  value: RichTranslationLocaleMeta
) {
  if (fieldKey === 'content') {
    meta.content = { ...(meta.content ?? {}), [locale]: value }
    return
  }
  meta.description = { ...meta.description, [locale]: value }
}

function getRecordValue(value: unknown, key: string): unknown {
  return isRecord(value) ? value[key] : undefined
}

function isRichTranslationLocaleMeta(value: unknown): value is RichTranslationLocaleMeta {
  if (!isRecord(value)) return false
  if (!isRichTranslationStatus(value.status)) return false

  return (
    optionalAppLocale(value.sourceLocale) &&
    optionalString(value.sourceHash) &&
    optionalString(value.structureHash) &&
    optionalProvider(value.provider) &&
    optionalString(value.model) &&
    optionalString(value.translatedAt) &&
    (value.error === undefined || value.error === null || typeof value.error === 'string')
  )
}

function isRichTranslationStatus(value: unknown): value is RichTranslationStatus {
  return (
    value === 'empty' ||
    value === 'manual' ||
    value === 'auto_translated' ||
    value === 'edited_after_translation' ||
    value === 'outdated' ||
    value === 'translation_error'
  )
}

function optionalAppLocale(value: unknown): value is AppLocale | undefined {
  return value === undefined || value === 'ru' || value === 'uz' || value === 'en'
}

function optionalProvider(value: unknown): value is TranslationProvider | undefined {
  return value === undefined || value === 'tahrirchi'
}

function optionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === 'string'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function formatValidationError(validation: ValidationResult): string {
  return validation.errors[0]?.message ?? 'Rich text structure validation failed'
}
