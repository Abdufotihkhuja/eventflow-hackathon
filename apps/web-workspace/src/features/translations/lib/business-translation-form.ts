import type {
  AppLocale,
  TranslateBatchResponse,
  TranslationApplyMode,
  TranslationMeta,
  TranslationStatus,
  TranslationValues,
} from '../model/types'
import {
  createEmptyTranslationMeta,
  createEmptyTranslationValues,
  getSupportedBusinessLocales,
  getTargetLocales,
  markEmptyTranslation,
  markManualEdit,
  markOutdatedTargetsWhenSourceChanged,
} from './translation-state.ts'

type BatchItem = {
  fieldKey: string
  text: string
  contentType: 'plain_text'
}

const AUTO_WRITABLE_STATUSES: TranslationStatus[] = [
  'auto_translated',
  'outdated',
  'translation_error',
]

export function createBusinessTranslationValues(
  fieldKeys: readonly string[],
  rawTranslations: unknown,
  fallbackScalars: Record<string, string | null | undefined>
): TranslationValues {
  const values = createEmptyTranslationValues(fieldKeys, getSupportedBusinessLocales())
  const translations = isRecord(rawTranslations) ? rawTranslations : null

  for (const fieldKey of fieldKeys) {
    const localeValues = isRecord(translations?.[fieldKey]) ? translations[fieldKey] : null
    let hasTranslation = false

    for (const locale of getSupportedBusinessLocales()) {
      const value = localeValues?.[locale]
      if (typeof value === 'string' && value.trim().length > 0) {
        values[fieldKey][locale] = value
        hasTranslation = true
      }
    }

    if (!hasTranslation) {
      values[fieldKey].ru = fallbackScalars[fieldKey] ?? ''
    }
  }

  return values
}

export function createBusinessTranslationMeta(
  fieldKeys: readonly string[],
  rawMeta: unknown,
  values: TranslationValues
): TranslationMeta {
  const meta = createEmptyTranslationMeta(fieldKeys, getSupportedBusinessLocales())
  const source = isRecord(rawMeta) ? rawMeta : null

  for (const fieldKey of fieldKeys) {
    const localeMeta = isRecord(source?.[fieldKey]) ? source[fieldKey] : null
    for (const locale of getSupportedBusinessLocales()) {
      const incoming = isRecord(localeMeta?.[locale]) ? localeMeta[locale] : null
      if (incoming && isKnownStatus(incoming.status)) {
        meta[fieldKey][locale] = {
          status: incoming.status,
          sourceLocale: isAppLocale(incoming.sourceLocale) ? incoming.sourceLocale : undefined,
          sourceHash: typeof incoming.sourceHash === 'string' ? incoming.sourceHash : undefined,
          provider: incoming.provider === 'tahrirchi' ? 'tahrirchi' : undefined,
          model: typeof incoming.model === 'string' ? incoming.model : undefined,
          translatedAt: typeof incoming.translatedAt === 'string' ? incoming.translatedAt : undefined,
          error: typeof incoming.error === 'string' ? incoming.error : undefined,
        }
        continue
      }

      meta[fieldKey][locale] =
        values[fieldKey]?.[locale]?.trim() ? { status: 'manual' } : { status: 'empty' }
    }
  }

  return meta
}

export function setBusinessTranslationValue(
  values: TranslationValues,
  meta: TranslationMeta,
  fieldKey: string,
  locale: AppLocale,
  value: string
): { values: TranslationValues; meta: TranslationMeta } {
  const nextValues = {
    ...values,
    [fieldKey]: {
      ...values[fieldKey],
      [locale]: value,
    } as Record<AppLocale, string>,
  }

  const outdatedMeta = markOutdatedTargetsWhenSourceChanged(values, meta, fieldKey, locale, value)
  const nextMeta =
    value.trim().length > 0
      ? markManualEdit(outdatedMeta, fieldKey, locale)
      : markEmptyTranslation(outdatedMeta, fieldKey, locale)

  return { values: nextValues, meta: nextMeta }
}

export function getFallbackBusinessTranslation(
  values: TranslationValues,
  fieldKey: string,
  fallback = ''
): string {
  for (const locale of getSupportedBusinessLocales()) {
    const value = values[fieldKey]?.[locale]
    if (value?.trim()) return value.trim()
  }
  return fallback.trim()
}

export function resolveBusinessSourceLocale(
  values: TranslationValues,
  fieldKeys: readonly string[],
  activeLocale: AppLocale
): AppLocale | null {
  if (localeHasSource(values, fieldKeys, activeLocale)) {
    return activeLocale
  }

  return getSupportedBusinessLocales().find(locale => localeHasSource(values, fieldKeys, locale)) ?? null
}

export function getBatchTranslationItems(
  values: TranslationValues,
  meta: TranslationMeta,
  fieldKeys: readonly string[],
  sourceLocale: AppLocale,
  mode: TranslationApplyMode
): BatchItem[] {
  return fieldKeys
    .filter(fieldKey => {
      const sourceText = values[fieldKey]?.[sourceLocale]?.trim()
      if (!sourceText) return false

      return getTargetLocales(sourceLocale).some(targetLocale =>
        canWriteTarget(values, meta, fieldKey, targetLocale, mode)
      )
    })
    .map(fieldKey => ({
      fieldKey,
      text: values[fieldKey][sourceLocale].trim(),
      contentType: 'plain_text',
    }))
}

export function summarizeAppliedBatch(
  values: TranslationValues,
  meta: TranslationMeta,
  response: TranslateBatchResponse,
  mode: TranslationApplyMode
): { translated: number; skipped: number; failed: number } {
  return response.results.reduce(
    (summary, result) => {
      if (result.status === 'translation_error') {
        summary.failed += 1
        return summary
      }

      if (
        result.status !== 'auto_translated' ||
        !canWriteTarget(values, meta, result.fieldKey, result.targetLocale, mode)
      ) {
        summary.skipped += 1
        return summary
      }

      summary.translated += 1
      return summary
    },
    { translated: 0, skipped: 0, failed: 0 }
  )
}

export function getBatchTranslationFailureMessage(
  response: TranslateBatchResponse
): string | null {
  const error = response.results.find(
    result => result.status === 'translation_error' && result.error?.trim()
  )?.error

  return error?.trim() || null
}

function canWriteTarget(
  values: TranslationValues,
  meta: TranslationMeta,
  fieldKey: string,
  targetLocale: AppLocale,
  mode: TranslationApplyMode
): boolean {
  const value = values[fieldKey]?.[targetLocale] ?? ''
  const status = getKnownStatus(meta[fieldKey]?.[targetLocale]?.status, value)

  if (mode === 'fill_empty') {
    return value.trim().length === 0
  }

  if (mode === 'update_auto') {
    return AUTO_WRITABLE_STATUSES.includes(status)
  }

  return true
}

function localeHasSource(
  values: TranslationValues,
  fieldKeys: readonly string[],
  locale: AppLocale
): boolean {
  return fieldKeys.some(fieldKey => values[fieldKey]?.[locale]?.trim())
}

function getKnownStatus(status: TranslationStatus | undefined, value: string): TranslationStatus {
  if (status) return status
  return value.trim().length > 0 ? 'manual' : 'empty'
}

function isKnownStatus(value: unknown): value is TranslationStatus {
  return (
    value === 'empty' ||
    value === 'manual' ||
    value === 'auto_translated' ||
    value === 'edited_after_translation' ||
    value === 'outdated' ||
    value === 'translation_error'
  )
}

function isAppLocale(value: unknown): value is AppLocale {
  return value === 'ru' || value === 'uz' || value === 'en'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
