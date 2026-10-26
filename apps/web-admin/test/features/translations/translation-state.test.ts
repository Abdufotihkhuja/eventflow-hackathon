import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  applyBatchTranslationResults,
  createEmptyTranslationMeta,
  createEmptyTranslationValues,
  markEmptyTranslation,
  markManualEdit,
  markOutdatedTargetsWhenSourceChanged,
} from '../../../src/features/translations/lib/translation-state.ts'
import {
  createBusinessTranslationMeta,
  createBusinessTranslationValues,
  getBatchTranslationItems,
  getFallbackBusinessTranslation,
  resolveBusinessSourceLocale,
  setBusinessTranslationValue,
  summarizeAppliedBatch,
} from '../../../src/features/translations/lib/business-translation-form.ts'
import type {
  TranslateBatchResponse,
  TranslationMeta,
  TranslationValues,
} from '../../../src/features/translations/model/types.ts'

function response(translatedText = 'Tarjima'): TranslateBatchResponse {
  return {
    results: [
      {
        fieldKey: 'title',
        targetLocale: 'uz',
        status: 'auto_translated',
        translatedText,
        provider: 'tahrirchi',
        model: 'sayqalchi',
        sourceLocale: 'ru',
        sourceHash: 'sha256:test',
        translatedAt: '2026-04-27T00:00:00.000Z',
        error: null,
      },
    ],
    summary: { translated: 1, skipped: 0, failed: 0 },
  }
}

describe('admin translation-state helpers', () => {
  it('fill_empty fills whitespace-only values and preserves non-empty values', () => {
    const values = createEmptyTranslationValues(['title'], ['ru', 'uz'])
    values.title.ru = 'Конференция'
    values.title.uz = '  '
    const meta = createEmptyTranslationMeta(['title'], ['ru', 'uz'])

    const applied = applyBatchTranslationResults(values, meta, response(), { mode: 'fill_empty' })

    assert.equal(applied.values.title.uz, 'Tarjima')
    assert.equal(applied.meta.title.uz.status, 'auto_translated')

    const nonEmptyValues = createEmptyTranslationValues(['title'], ['ru', 'uz'])
    nonEmptyValues.title.uz = 'Qolda'
    const preserved = applyBatchTranslationResults(nonEmptyValues, meta, response(), {
      mode: 'fill_empty',
    })

    assert.equal(preserved.values.title.uz, 'Qolda')
    assert.equal(preserved.meta.title.uz.status, 'manual')
  })

  it('update_auto updates auto/outdated/error and preserves manual values', () => {
    const values = { title: { ru: 'Конференция', uz: 'Eski' } } satisfies TranslationValues
    const meta = {
      title: {
        ru: { status: 'manual' },
        uz: { status: 'auto_translated' },
      },
    } satisfies TranslationMeta

    const applied = applyBatchTranslationResults(values, meta, response('Yangi'), {
      mode: 'update_auto',
    })

    assert.equal(applied.values.title.uz, 'Yangi')

    const manualMeta = {
      title: {
        ru: { status: 'manual' },
        uz: { status: 'manual' },
      },
    } satisfies TranslationMeta
    const preserved = applyBatchTranslationResults(values, manualMeta, response('Yangi'), {
      mode: 'update_auto',
    })

    assert.equal(preserved.values.title.uz, 'Eski')
  })

  it('overwrite_selected overwrites manual and edited_after_translation values', () => {
    const values = { title: { ru: 'Конференция', uz: 'Qo' } } satisfies TranslationValues
    const meta = {
      title: {
        ru: { status: 'manual' },
        uz: { status: 'edited_after_translation' },
      },
    } satisfies TranslationMeta

    const applied = applyBatchTranslationResults(values, meta, response('Yangilangan'), {
      mode: 'overwrite_selected',
    })

    assert.equal(applied.values.title.uz, 'Yangilangan')
    assert.equal(applied.meta.title.uz.status, 'auto_translated')
  })

  it('markManualEdit distinguishes manual from edited_after_translation', () => {
    const emptyMeta = createEmptyTranslationMeta(['title'], ['ru', 'uz'])
    assert.equal(markManualEdit(emptyMeta, 'title', 'uz').title.uz.status, 'manual')

    const translatedMeta = {
      title: {
        ru: { status: 'manual' },
        uz: { status: 'auto_translated' },
      },
    } satisfies TranslationMeta
    assert.equal(
      markManualEdit(translatedMeta, 'title', 'uz').title.uz.status,
      'edited_after_translation'
    )
  })

  it('marks cleared translations as empty', () => {
    const meta = {
      title: {
        ru: { status: 'manual' },
        uz: { status: 'edited_after_translation' },
      },
    } satisfies TranslationMeta

    assert.equal(markEmptyTranslation(meta, 'title', 'uz').title.uz.status, 'empty')
  })

  it('marks auto-translated targets outdated when source text changes', () => {
    const values = { title: { ru: 'Старый', uz: 'Eski', en: 'Old' } } satisfies TranslationValues
    const meta = {
      title: {
        ru: { status: 'manual' },
        uz: { status: 'auto_translated' },
        en: { status: 'manual' },
      },
    } satisfies TranslationMeta

    const nextMeta = markOutdatedTargetsWhenSourceChanged(
      values,
      meta,
      'title',
      'ru',
      'Новый'
    )

    assert.equal(nextMeta.title.uz.status, 'outdated')
    assert.equal(nextMeta.title.en.status, 'manual')
  })

  it('treats unknown non-empty values as manual', () => {
    const values = { title: { ru: 'Конференция', uz: 'Qo' } } satisfies TranslationValues
    const meta = { title: { ru: { status: 'manual' } } } as TranslationMeta

    const applied = applyBatchTranslationResults(values, meta, response('Yangi'), {
      mode: 'fill_empty',
    })

    assert.equal(applied.values.title.uz, 'Qo')
    assert.equal(applied.meta.title.uz.status, 'manual')
  })

  it('initializes business values from scalar ru fallback when translations are empty', () => {
    const values = createBusinessTranslationValues(['title'], {}, { title: 'Скаляр' })
    const meta = createBusinessTranslationMeta(['title'], undefined, values)

    assert.equal(values.title.ru, 'Скаляр')
    assert.equal(values.title.uz, '')
    assert.equal(meta.title.ru.status, 'manual')
  })

  it('resolves active source locale before ru/uz/en fallback', () => {
    const values = createBusinessTranslationValues(['title'], undefined, {})
    values.title.uz = 'Manba'
    values.title.en = 'Source'

    assert.equal(resolveBusinessSourceLocale(values, ['title'], 'en'), 'en')
    assert.equal(resolveBusinessSourceLocale(values, ['title'], 'ru'), 'uz')
  })

  it('builds update_auto requests only for auto/outdated/error targets', () => {
    const values = {
      title: { ru: 'Конференция', uz: 'Eski', en: 'Manual' },
    } satisfies TranslationValues
    const meta = {
      title: {
        ru: { status: 'manual' },
        uz: { status: 'outdated' },
        en: { status: 'manual' },
      },
    } satisfies TranslationMeta

    const items = getBatchTranslationItems(values, meta, ['title'], 'ru', 'update_auto')

    assert.equal(items.length, 1)
    assert.equal(getFallbackBusinessTranslation(values, 'title'), 'Конференция')
  })

  it('marks edited translated business values and summarizes skipped manual targets', () => {
    const values = {
      title: { ru: 'Конференция', uz: 'Eski', en: 'Manual' },
    } satisfies TranslationValues
    const meta = {
      title: {
        ru: { status: 'manual' },
        uz: { status: 'auto_translated' },
        en: { status: 'manual' },
      },
    } satisfies TranslationMeta

    const edited = setBusinessTranslationValue(values, meta, 'title', 'uz', 'Qoʻlda')
    assert.equal(edited.meta.title.uz.status, 'edited_after_translation')

    const batch = {
      results: [
        ...response('Yangi').results,
        {
          ...response('New').results[0],
          targetLocale: 'en' as const,
          translatedText: 'New',
        },
      ],
      summary: { translated: 2, skipped: 0, failed: 0 },
    } satisfies TranslateBatchResponse
    const summary = summarizeAppliedBatch(values, meta, batch, 'update_auto')

    assert.deepEqual(summary, { translated: 1, skipped: 1, failed: 0 })
  })
})
