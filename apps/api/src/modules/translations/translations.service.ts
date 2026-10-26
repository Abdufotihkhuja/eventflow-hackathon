import { Inject, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';
import type { TranslateBatchDto } from './dto/translate-batch.dto';
import type {
  TranslationBatchResponse,
  TranslationResult,
} from './translation.types';
import {
  TRANSLATION_PROVIDER,
  type TranslationProvider,
} from './providers/translation-provider.interface';

/** Delay between consecutive provider calls to stay under its rate limit. */
const TRANSLATE_THROTTLE_MS = 350;

@Injectable()
export class TranslationsService {
  constructor(
    @Inject(TRANSLATION_PROVIDER)
    private readonly translationProvider: TranslationProvider,
  ) {}

  async translateBatch(
    dto: TranslateBatchDto,
  ): Promise<TranslationBatchResponse> {
    const results: TranslationResult[] = [];
    // Calls run sequentially; a small gap between them keeps us under the
    // translation provider's rate limit (avoids partial results from HTTP 429).
    let dispatchedCalls = 0;

    for (const item of dto.items) {
      const normalizedText = normalizeSourceText(item.text);
      const sourceHash = createSourceHash(normalizedText);

      for (const targetLocale of dto.targetLocales) {
        if (normalizedText.length === 0) {
          results.push({
            fieldKey: item.fieldKey,
            targetLocale,
            status: 'skipped',
            translatedText: null,
            provider: null,
            model: null,
            sourceLocale: dto.sourceLocale,
            sourceHash,
            translatedAt: null,
            error: null,
          });
          continue;
        }

        if (dispatchedCalls > 0) {
          await sleep(TRANSLATE_THROTTLE_MS);
        }
        dispatchedCalls += 1;

        try {
          const translated = await this.translationProvider.translateText({
            text: normalizedText,
            sourceLocale: dto.sourceLocale,
            targetLocale,
          });

          results.push({
            fieldKey: item.fieldKey,
            targetLocale,
            status: 'auto_translated',
            translatedText: translated.translatedText,
            provider: translated.provider,
            model: translated.model,
            sourceLocale: dto.sourceLocale,
            sourceHash,
            translatedAt: new Date().toISOString(),
            error: null,
          });
        } catch (error) {
          results.push({
            fieldKey: item.fieldKey,
            targetLocale,
            status: 'translation_error',
            translatedText: null,
            provider: 'tahrirchi',
            model: null,
            sourceLocale: dto.sourceLocale,
            sourceHash,
            translatedAt: null,
            error:
              error instanceof Error
                ? error.message
                : 'Translation provider failed',
          });
        }
      }
    }

    return {
      results,
      summary: {
        translated: results.filter(
          (result) => result.status === 'auto_translated',
        ).length,
        skipped: results.filter((result) => result.status === 'skipped').length,
        failed: results.filter(
          (result) => result.status === 'translation_error',
        ).length,
      },
    };
  }
}

export function normalizeSourceText(text: string): string {
  // Collapse spaces/tabs but PRESERVE newlines: rich-text fields are sent as a
  // single newline-joined payload (one block per line) and the response is split
  // back per block, so the line structure must survive normalization.
  return text
    .replace(/[^\S\n]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .trim();
}

export function createSourceHash(normalizedText: string): string {
  return `sha256:${createHash('sha256').update(normalizedText).digest('hex')}`;
}
