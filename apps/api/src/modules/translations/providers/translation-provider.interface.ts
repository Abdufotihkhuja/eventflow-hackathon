import type { AppLocale } from '../translation.types';

export const TRANSLATION_PROVIDER = Symbol('TRANSLATION_PROVIDER');

export interface TranslateTextInput {
  text: string;
  sourceLocale: AppLocale;
  targetLocale: AppLocale;
}

export interface TranslateTextResult {
  translatedText: string;
  provider: 'tahrirchi';
  model: string;
}

export interface TranslationProvider {
  translateText(input: TranslateTextInput): Promise<TranslateTextResult>;
}
