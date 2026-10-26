export type AppLocale = 'ru' | 'uz' | 'en'

export type TranslationStatus =
  | 'empty'
  | 'manual'
  | 'auto_translated'
  | 'edited_after_translation'
  | 'outdated'
  | 'translation_error'

export type TranslationProvider = 'tahrirchi'

export type TranslationMeta = Record<
  string,
  Record<
    AppLocale,
    {
      status: TranslationStatus
      sourceLocale?: AppLocale
      sourceHash?: string
      provider?: TranslationProvider
      model?: string
      translatedAt?: string
      error?: string
    }
  >
>

export type TranslationValues = Record<string, Record<AppLocale, string>>

export type TranslationApplyMode = 'fill_empty' | 'update_auto' | 'overwrite_selected'

export type TranslateBatchRequest = {
  sourceLocale: AppLocale
  targetLocales: AppLocale[]
  items: Array<{
    fieldKey: string
    text: string
    contentType: 'plain_text'
  }>
}

export type TranslateBatchResponse = {
  results: Array<{
    fieldKey: string
    targetLocale: AppLocale
    status: 'auto_translated' | 'translation_error' | 'skipped'
    translatedText: string | null
    provider: TranslationProvider | null
    model: string | null
    sourceLocale: AppLocale
    sourceHash: string
    translatedAt: string | null
    error: string | null
  }>
  summary: {
    translated: number
    skipped: number
    failed: number
  }
}
