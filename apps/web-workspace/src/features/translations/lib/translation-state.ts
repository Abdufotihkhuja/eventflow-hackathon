import type {
  AppLocale,
  TranslateBatchResponse,
  TranslationApplyMode,
  TranslationMeta,
  TranslationStatus,
  TranslationValues,
} from '../model/types'

const SUPPORTED_BUSINESS_LOCALES: AppLocale[] = ['ru', 'uz', 'en']

export function getSupportedBusinessLocales(): AppLocale[] {
  return [...SUPPORTED_BUSINESS_LOCALES]
}

export function getTargetLocales(sourceLocale: AppLocale): AppLocale[] {
  return SUPPORTED_BUSINESS_LOCALES.filter(locale => locale !== sourceLocale)
}

export function createEmptyTranslationValues(
  fieldKeys: readonly string[],
  locales: readonly AppLocale[]
): TranslationValues {
  return Object.fromEntries(
    fieldKeys.map(fieldKey => [
      fieldKey,
      Object.fromEntries(locales.map(locale => [locale, ''])) as Record<AppLocale, string>,
    ])
  )
}

export function createEmptyTranslationMeta(
  fieldKeys: readonly string[],
  locales: readonly AppLocale[]
): TranslationMeta {
  return Object.fromEntries(
    fieldKeys.map(fieldKey => [
      fieldKey,
      Object.fromEntries(
        locales.map(locale => [
          locale,
          {
            status: 'empty' satisfies TranslationStatus,
          },
        ])
      ) as TranslationMeta[string],
    ])
  )
}

export function markManualEdit(
  meta: TranslationMeta,
  fieldKey: string,
  locale: AppLocale
): TranslationMeta {
  const previous = meta[fieldKey]?.[locale]
  const status: TranslationStatus =
    previous?.status === 'auto_translated' ||
    previous?.status === 'outdated' ||
    previous?.status === 'translation_error' ||
    previous?.status === 'edited_after_translation'
      ? 'edited_after_translation'
      : 'manual'

  return {
    ...meta,
    [fieldKey]: {
      ...meta[fieldKey],
      [locale]: {
        ...previous,
        status,
        error: undefined,
      },
    } as TranslationMeta[string],
  }
}

export function markEmptyTranslation(
  meta: TranslationMeta,
  fieldKey: string,
  locale: AppLocale
): TranslationMeta {
  return setMeta(meta, fieldKey, locale, { status: 'empty' })
}

export function applyBatchTranslationResults(
  values: TranslationValues,
  meta: TranslationMeta,
  response: TranslateBatchResponse,
  options: { mode: TranslationApplyMode }
): { values: TranslationValues; meta: TranslationMeta } {
  let nextValues = cloneValues(values)
  let nextMeta = cloneMeta(meta)

  for (const result of response.results) {
    const currentValue = nextValues[result.fieldKey]?.[result.targetLocale] ?? ''
    const currentMeta = nextMeta[result.fieldKey]?.[result.targetLocale]
    const currentStatus = getKnownStatus(
      currentMeta?.status,
      currentValue
    )

    if (
      options.mode === 'fill_empty'
        ? !isEmptyValue(currentValue)
        : shouldSkipOverwrite(currentStatus, options.mode)
    ) {
      if (!isEmptyValue(currentValue) && (!currentMeta || currentMeta.status === 'empty')) {
        nextMeta = setMeta(nextMeta, result.fieldKey, result.targetLocale, { status: 'manual' })
      }
      continue
    }

    if (result.status === 'auto_translated' && result.translatedText !== null) {
      nextValues = setValue(nextValues, result.fieldKey, result.targetLocale, result.translatedText)
      nextMeta = setMeta(nextMeta, result.fieldKey, result.targetLocale, {
        status: 'auto_translated',
        sourceLocale: result.sourceLocale,
        sourceHash: result.sourceHash,
        provider: result.provider ?? undefined,
        model: result.model ?? undefined,
        translatedAt: result.translatedAt ?? undefined,
        error: undefined,
      })
      continue
    }

    if (result.status === 'translation_error') {
      nextMeta = setMeta(nextMeta, result.fieldKey, result.targetLocale, {
        status: 'translation_error',
        sourceLocale: result.sourceLocale,
        sourceHash: result.sourceHash,
        provider: result.provider ?? undefined,
        model: result.model ?? undefined,
        translatedAt: result.translatedAt ?? undefined,
        error: result.error ?? 'Translation failed',
      })
    }
  }

  return { values: nextValues, meta: nextMeta }
}

export function markOutdatedTargetsWhenSourceChanged(
  values: TranslationValues,
  meta: TranslationMeta,
  fieldKey: string,
  sourceLocale: AppLocale,
  newSourceText: string
): TranslationMeta {
  const previousSourceText = values[fieldKey]?.[sourceLocale] ?? ''
  if (normalizeValue(previousSourceText) === normalizeValue(newSourceText)) {
    return meta
  }

  let nextMeta = cloneMeta(meta)
  for (const targetLocale of getTargetLocales(sourceLocale)) {
    const current = nextMeta[fieldKey]?.[targetLocale]
    if (current?.status === 'auto_translated') {
      nextMeta = setMeta(nextMeta, fieldKey, targetLocale, {
        ...current,
        status: 'outdated',
        error: undefined,
      })
    }
  }

  return nextMeta
}

export function shouldSkipOverwrite(
  status: TranslationStatus,
  mode: TranslationApplyMode
): boolean {
  if (mode === 'overwrite_selected') {
    return false
  }

  if (mode === 'fill_empty') {
    return status !== 'empty'
  }

  return !['auto_translated', 'outdated', 'translation_error'].includes(status)
}

function getKnownStatus(status: TranslationStatus | undefined, value: string): TranslationStatus {
  if (status) {
    return status
  }

  return isEmptyValue(value) ? 'empty' : 'manual'
}

function isEmptyValue(value: string): boolean {
  return value.trim().length === 0
}

function normalizeValue(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

function cloneValues(values: TranslationValues): TranslationValues {
  return Object.fromEntries(
    Object.entries(values).map(([fieldKey, localeValues]) => [fieldKey, { ...localeValues }])
  )
}

function cloneMeta(meta: TranslationMeta): TranslationMeta {
  return Object.fromEntries(
    Object.entries(meta).map(([fieldKey, localeMeta]) => [
      fieldKey,
      Object.fromEntries(
        Object.entries(localeMeta).map(([locale, localeValue]) => [locale, { ...localeValue }])
      ) as TranslationMeta[string],
    ])
  )
}

function setValue(
  values: TranslationValues,
  fieldKey: string,
  locale: AppLocale,
  value: string
): TranslationValues {
  return {
    ...values,
    [fieldKey]: {
      ...values[fieldKey],
      [locale]: value,
    } as Record<AppLocale, string>,
  }
}

function setMeta(
  meta: TranslationMeta,
  fieldKey: string,
  locale: AppLocale,
  value: TranslationMeta[string][AppLocale]
): TranslationMeta {
  return {
    ...meta,
    [fieldKey]: {
      ...meta[fieldKey],
      [locale]: value,
    } as TranslationMeta[string],
  }
}
