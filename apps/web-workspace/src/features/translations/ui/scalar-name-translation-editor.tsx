import { useCallback, useMemo } from 'react'

import { toast } from 'sonner'

import { Label } from '@shared/ui'

import {
  createBusinessTranslationMeta,
  createBusinessTranslationValues,
  getBatchTranslationItems,
  resolveBusinessSourceLocale,
  setBusinessTranslationValue,
  summarizeAppliedBatch,
} from '../lib/business-translation-form'
import { applyBatchTranslationResults } from '../lib/translation-state'
import type {
  AppLocale,
  TranslationApplyMode,
  TranslationMeta,
  TranslationValues,
} from '../model/types'
import { useTranslateBatch } from '../api/use-translate-batch'
import {
  MultilingualTabsField,
  TranslateFieldsToolbar,
} from './business-translation-fields'

const BUSINESS_LOCALES: readonly AppLocale[] = ['ru', 'uz', 'en']

export type ScalarNameTranslationsState = {
  values: TranslationValues
  meta: TranslationMeta
  activeLocale: AppLocale
}

export function buildScalarNameTranslations(
  fieldKey: string,
  initial?: { scalar?: string | null; translations?: unknown },
): ScalarNameTranslationsState {
  const fields = [fieldKey]
  const values = createBusinessTranslationValues(fields, initial?.translations, {
    [fieldKey]: initial?.scalar ?? '',
  })
  const meta = createBusinessTranslationMeta(fields, undefined, values)
  return { values, meta, activeLocale: 'ru' }
}

export function flattenScalarNameTranslations(
  state: ScalarNameTranslationsState,
  fieldKey: string,
): {
  scalar: string
  translations: Record<string, Partial<Record<AppLocale, string>>>
} {
  const localeValues = state.values[fieldKey] ?? {}
  const filled: Partial<Record<AppLocale, string>> = {}
  for (const locale of BUSINESS_LOCALES) {
    const v = localeValues[locale]?.trim()
    if (v) filled[locale] = v
  }
  const scalar = filled.ru || filled.uz || filled.en || ''
  return {
    scalar,
    translations:
      Object.keys(filled).length > 0 ? { [fieldKey]: filled } : {},
  }
}

export function ScalarNameTranslationEditor({
  fieldKey,
  label,
  placeholder,
  state,
  onStateChange,
  disabled,
  multiline,
  rows,
  maxLength,
}: {
  fieldKey: string
  label: string
  placeholder?: string
  state: ScalarNameTranslationsState
  onStateChange: (next: ScalarNameTranslationsState) => void
  disabled?: boolean
  multiline?: boolean
  rows?: number
  maxLength?: number
}) {
  const translateBatch = useTranslateBatch()

  const sourceLocale = useMemo(
    () =>
      resolveBusinessSourceLocale(state.values, [fieldKey], state.activeLocale),
    [state.values, state.activeLocale, fieldKey],
  )

  const handleValueChange = useCallback(
    (key: string, locale: AppLocale, value: string) => {
      const next = setBusinessTranslationValue(
        state.values,
        state.meta,
        key,
        locale,
        value,
      )
      onStateChange({ values: next.values, meta: next.meta, activeLocale: state.activeLocale })
    },
    [state, onStateChange],
  )

  const handleLocaleChange = useCallback(
    (locale: AppLocale) => onStateChange({ ...state, activeLocale: locale }),
    [state, onStateChange],
  )

  const handleAutoTranslate = (mode: TranslationApplyMode) => {
    if (!sourceLocale) {
      toast.error('Заполните поле хотя бы на одном языке')
      return
    }
    const items = getBatchTranslationItems(
      state.values,
      state.meta,
      [fieldKey],
      sourceLocale,
      mode,
    )
    if (items.length === 0) {
      toast.info('Нет полей для перевода')
      return
    }
    translateBatch.mutate(
      {
        sourceLocale,
        targetLocales: BUSINESS_LOCALES.filter(l => l !== sourceLocale),
        items,
      },
      {
        onSuccess: response => {
          const applied = applyBatchTranslationResults(
            state.values,
            state.meta,
            response,
            { mode },
          )
          const summary = summarizeAppliedBatch(state.values, state.meta, response, mode)
          onStateChange({
            values: applied.values,
            meta: applied.meta,
            activeLocale: state.activeLocale,
          })
          toast.success(
            `Переведено ${summary.translated}, пропущено ${summary.skipped}, ошибок ${summary.failed}`,
          )
        },
        onError: error =>
          toast.error(error?.message ?? 'Сервис перевода недоступен'),
      },
    )
  }

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <MultilingualTabsField
        fields={[
          {
            key: fieldKey,
            label,
            placeholder,
            multiline,
            rows,
            maxLength,
          },
        ]}
        values={state.values}
        meta={state.meta}
        activeLocale={state.activeLocale}
        onLocaleChange={handleLocaleChange}
        onValueChange={handleValueChange}
        sourceLocale={sourceLocale}
      />
      <TranslateFieldsToolbar
        sourceLocale={sourceLocale}
        isPending={translateBatch.isPending}
        disabled={disabled}
        onTranslateEmpty={() => handleAutoTranslate('fill_empty')}
        onUpdateAuto={() => handleAutoTranslate('update_auto')}
        activeLocale={state.activeLocale}
      />
    </div>
  )
}
