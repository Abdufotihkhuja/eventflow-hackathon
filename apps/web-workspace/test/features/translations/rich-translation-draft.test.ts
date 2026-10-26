import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  applyRichTranslationResultSafely,
  buildRichTranslationBatchItems,
  createRichTranslationMetaDraft,
  createRichTranslationsDraft,
  mapBatchResultsToTranslatedSegments,
  markRichManualEdit,
  shouldSkipRichOverwrite,
  type RichTranslationMetaDraft,
  type RichTranslationsDraft,
} from '../../../src/features/translations/lib/rich-translation-draft.ts'
import type { TranslateBatchResponse } from '../../../src/features/translations/model/types.ts'
import type { BlockNoteDocument } from '../../../src/shared/lib/rich-text-translation.ts'
import { extractRichTextSegments } from '../../../src/shared/lib/rich-text-translation.ts'

const sourceDoc = [
  {
    id: 'heading-1',
    type: 'heading',
    props: { level: 2 },
    content: [{ type: 'text', text: 'Привет', styles: {} }],
    children: [],
  },
  {
    id: 'paragraph-1',
    type: 'paragraph',
    props: {},
    content: [
      { type: 'text', text: 'Текст', styles: { bold: true } },
      {
        type: 'link',
        href: 'https://example.com/internal',
        content: [{ type: 'text', text: 'ссылка', styles: {} }],
      },
    ],
    children: [],
  },
] satisfies BlockNoteDocument

const targetDoc = [
  {
    id: 'target-1',
    type: 'paragraph',
    props: {},
    content: [{ type: 'text', text: 'Manual', styles: {} }],
    children: [],
  },
] satisfies BlockNoteDocument

function responseFor(texts: string[], fieldKey = 'content'): TranslateBatchResponse {
  const segments = extractRichTextSegments(sourceDoc)
  return {
    results: segments.map((segment, index) => ({
      fieldKey: `${fieldKey}:${segment.id}`,
      targetLocale: 'uz',
      status: 'auto_translated',
      translatedText: texts[index] ?? `translated-${index}`,
      provider: 'tahrirchi',
      model: 'sayqalchi',
      sourceLocale: 'ru',
      sourceHash: 'sha256:test',
      translatedAt: '2026-04-27T00:00:00.000Z',
      error: null,
    })),
    summary: { translated: segments.length, skipped: 0, failed: 0 },
  }
}

describe('workspace rich translation draft helpers', () => {
  it('keeps existing Event.description rich helper behavior working', () => {
    const segments = extractRichTextSegments(sourceDoc)
    const response = responseFor(['Hello', 'Text', 'link'], 'description')
    const mapped = mapBatchResultsToTranslatedSegments(response, 'description', segments, 'uz')

    assert.equal(shouldSkipRichOverwrite('empty', 'fill_empty', []), false)
    assert.equal(shouldSkipRichOverwrite(undefined, 'update_auto', targetDoc), true)
    assert.equal(mapped.ok, true)
    if (!mapped.ok) return

    const applied = applyRichTranslationResultSafely(sourceDoc, mapped.segments, response, {
      sourceLocale: 'ru',
      targetLocale: 'uz',
      sourceHash: 'visible-hash',
      structureHash: 'structure-hash',
    })

    assert.equal(applied.ok, true)
    if (!applied.ok) return
    assert.deepEqual(applied.meta, {
      status: 'auto_translated',
      sourceLocale: 'ru',
      sourceHash: 'visible-hash',
      structureHash: 'structure-hash',
      provider: 'tahrirchi',
      model: 'sayqalchi',
      translatedAt: '2026-04-27T00:00:00.000Z',
      error: undefined,
    } satisfies NonNullable<RichTranslationMetaDraft['description']['uz']>)
  })

  it('supports content field keys and sends only plain segment text', () => {
    const segments = extractRichTextSegments(sourceDoc)
    const items = buildRichTranslationBatchItems('content', segments)

    assert.equal(items.length, 3)
    assert.deepEqual(
      items.map(item => item.fieldKey),
      segments.map(segment => `content:${segment.id}`)
    )
    assert.deepEqual(
      items.map(item => item.contentType),
      ['plain_text', 'plain_text', 'plain_text']
    )
    assert.deepEqual(
      items.map(item => item.text),
      ['Привет', 'Текст', 'ссылка']
    )

    const serializedItems = JSON.stringify(items)
    assert.equal(serializedItems.includes('heading-1'), false)
    assert.equal(serializedItems.includes('paragraph-1'), false)
    assert.equal(serializedItems.includes('https://example.com/internal'), false)
    assert.equal(serializedItems.includes('"props"'), false)
    assert.equal(serializedItems.includes('"children"'), false)
  })

  it('allows fill_empty and update_auto for content without overwriting manual targets', () => {
    assert.equal(shouldSkipRichOverwrite(undefined, 'fill_empty', []), false)
    assert.equal(shouldSkipRichOverwrite('outdated', 'update_auto', targetDoc), false)
    assert.equal(shouldSkipRichOverwrite('auto_translated', 'update_auto', targetDoc), false)
    assert.equal(shouldSkipRichOverwrite('manual', 'update_auto', targetDoc), true)
    assert.equal(shouldSkipRichOverwrite('edited_after_translation', 'update_auto', targetDoc), true)
  })

  it('treats unknown non-empty content targets as manual through manual marking', () => {
    const draft = {
      description: {},
      content: { ru: sourceDoc, uz: targetDoc },
    } satisfies RichTranslationsDraft

    const nextMeta = markRichManualEdit({ description: {}, content: {} }, 'content', 'uz')

    assert.equal(draft.content.uz, targetDoc)
    assert.equal(nextMeta.content?.uz?.status, 'manual')
    assert.equal(shouldSkipRichOverwrite(nextMeta.content?.uz?.status, 'update_auto', targetDoc), true)
  })

  it('rejects a whole target locale when any content segment is missing or failed', () => {
    const segments = extractRichTextSegments(sourceDoc)
    const missingResponse = responseFor(['Salom']).results.slice(0, 1)
    const mappedMissing = mapBatchResultsToTranslatedSegments(
      { results: missingResponse, summary: { translated: 1, skipped: 0, failed: 0 } },
      'content',
      segments,
      'uz'
    )

    assert.equal(mappedMissing.ok, false)
    assert.match(mappedMissing.error, /Missing translation/)

    const failedResponse = responseFor(['Salom'])
    failedResponse.results[1] = {
      ...failedResponse.results[1],
      status: 'translation_error',
      translatedText: null,
      error: 'provider failed',
    }
    const mappedFailed = mapBatchResultsToTranslatedSegments(
      failedResponse,
      'content',
      segments,
      'uz'
    )

    assert.equal(mappedFailed.ok, false)
    assert.equal(mappedFailed.error, 'provider failed')
  })

  it('applies content translations only when BlockNote structure is preserved', () => {
    const segments = extractRichTextSegments(sourceDoc)
    const response = responseFor(['Salom', 'Matn', 'havola'])
    const mapped = mapBatchResultsToTranslatedSegments(response, 'content', segments, 'uz')

    assert.equal(mapped.ok, true)
    if (!mapped.ok) return

    const applied = applyRichTranslationResultSafely(sourceDoc, mapped.segments, response, {
      sourceLocale: 'ru',
      targetLocale: 'uz',
    })

    assert.equal(applied.ok, true)
    if (!applied.ok) return

    assert.equal(applied.document[0]?.type, 'heading')
    assert.equal(applied.document[1]?.type, 'paragraph')
    assert.equal(applied.meta.status, 'auto_translated')
    assert.equal(applied.meta.provider, 'tahrirchi')
  })

  it('rejects content translations when structure validation fails', () => {
    const segments = extractRichTextSegments(sourceDoc)
    const response = responseFor(['Salom', 'Matn', 'havola'])
    const applied = applyRichTranslationResultSafely(sourceDoc, segments, response, {
      sourceLocale: 'ru',
      targetLocale: 'uz',
      validateStructure: () => ({
        valid: false,
        errors: [{ code: 'structure_changed', message: 'changed' }],
      }),
    })

    assert.equal(applied.ok, false)
    assert.equal(applied.error, 'changed')
  })

  it('initializes content drafts from persisted rich translations and metadata', () => {
    const persisted = {
      content: {
        uz: targetDoc,
        en: sourceDoc,
      },
    }
    const persistedMeta = {
      content: {
        uz: { status: 'manual', sourceLocale: 'ru' },
        en: {
          status: 'auto_translated',
          sourceLocale: 'ru',
          structureHash: 'structure-hash',
          provider: 'tahrirchi',
        },
      },
    }

    const draft = createRichTranslationsDraft('content', persisted, sourceDoc)
    const meta = createRichTranslationMetaDraft('content', persistedMeta, draft)

    assert.equal(draft.content?.ru, sourceDoc)
    assert.equal(draft.content?.uz, targetDoc)
    assert.equal(draft.content?.en, sourceDoc)
    assert.equal(meta.content?.uz?.status, 'manual')
    assert.equal(meta.content?.en?.status, 'auto_translated')
    assert.equal(meta.content?.en?.structureHash, 'structure-hash')
  })

  it('falls back to the original rich document when persisted translations are missing', () => {
    const draft = createRichTranslationsDraft('description', undefined, sourceDoc)
    const meta = createRichTranslationMetaDraft('description', undefined, draft)

    assert.equal(draft.description.ru, sourceDoc)
    assert.equal(meta.description.ru?.status, 'manual')
  })

  it('restores manual metadata so update_auto remains protected after reload', () => {
    const draft = createRichTranslationsDraft(
      'content',
      { content: { ru: sourceDoc, uz: targetDoc } },
      undefined
    )
    const meta = createRichTranslationMetaDraft(
      'content',
      { content: { uz: { status: 'manual' } } },
      draft
    )

    assert.equal(meta.content?.uz?.status, 'manual')
    assert.equal(shouldSkipRichOverwrite(meta.content?.uz?.status, 'update_auto', targetDoc), true)
  })
})
