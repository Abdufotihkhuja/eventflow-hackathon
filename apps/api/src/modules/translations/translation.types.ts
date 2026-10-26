export const APP_LOCALES = ['ru', 'uz', 'en'] as const;

export type AppLocale = (typeof APP_LOCALES)[number];

export const TRANSLATION_CONTENT_TYPES = ['plain_text'] as const;

export type TranslationContentType = (typeof TRANSLATION_CONTENT_TYPES)[number];

export type TranslationResultStatus =
  | 'auto_translated'
  | 'translation_error'
  | 'skipped';

export interface TranslationBatchItem {
  fieldKey: string;
  text: string;
  contentType: TranslationContentType;
}

export interface TranslationResult {
  fieldKey: string;
  targetLocale: AppLocale;
  status: TranslationResultStatus;
  translatedText: string | null;
  provider: 'tahrirchi' | null;
  model: string | null;
  sourceLocale: AppLocale;
  sourceHash: string;
  translatedAt: string | null;
  error: string | null;
}

export interface TranslationBatchResponse {
  results: TranslationResult[];
  summary: {
    translated: number;
    skipped: number;
    failed: number;
  };
}
