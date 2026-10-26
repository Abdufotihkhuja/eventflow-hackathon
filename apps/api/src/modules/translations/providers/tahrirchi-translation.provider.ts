import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { setTimeout as sleep } from 'node:timers/promises';
import { mapAppLocaleToTahrirchi } from '../translation-locale-map';
import type {
  TranslateTextInput,
  TranslateTextResult,
  TranslationProvider,
} from './translation-provider.interface';

interface TahrirchiResponse {
  translated_text?: unknown;
}

/** Max attempts (initial + retries) for transient provider failures. */
const MAX_ATTEMPTS = 3;
/** Base backoff between retries; grows exponentially, capped by MAX_BACKOFF_MS. */
const BASE_BACKOFF_MS = 800;
const MAX_BACKOFF_MS = 8_000;

@Injectable()
export class TahrirchiTranslationProvider implements TranslationProvider {
  private readonly logger = new Logger(TahrirchiTranslationProvider.name);

  constructor(private readonly configService: ConfigService) {}

  async translateText(
    input: TranslateTextInput,
  ): Promise<TranslateTextResult> {
    const token = this.configService.get<string>('TAHRIRCHI_TOKEN')?.trim();
    if (!token) {
      throw new ServiceUnavailableException('Translation provider is not configured');
    }

    const url =
      this.configService.get<string>('TAHRIRCHI_URL')?.trim() ||
      'https://websocket.tahrirchi.uz/translate-v2';
    const model =
      this.configService.get<string>('TAHRIRCHI_MODEL')?.trim() ||
      'sayqalchi';
    const timeoutMs = this.getTimeoutMs();

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      let response: Response;

      try {
        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: token,
          },
          body: JSON.stringify({
            text: input.text,
            source_lang: mapAppLocaleToTahrirchi(input.sourceLocale),
            target_lang: mapAppLocaleToTahrirchi(input.targetLocale),
            model,
          }),
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (error) {
        // Network / timeout — not retried (would risk exceeding the client timeout).
        this.logger.warn(
          JSON.stringify({
            type: 'translation_provider_error',
            provider: 'tahrirchi',
            sourceLocale: input.sourceLocale,
            targetLocale: input.targetLocale,
            message: error instanceof Error ? error.message : String(error),
          }),
        );
        throw error;
      }

      if (response.ok) {
        const payload = (await response.json()) as TahrirchiResponse;
        if (typeof payload.translated_text !== 'string') {
          throw new Error('Tahrirchi response is missing translated_text');
        }

        return {
          translatedText: payload.translated_text,
          provider: 'tahrirchi',
          model,
        };
      }

      // Rate limit (429) and transient server errors (5xx) are retried with backoff.
      const isRetryable = response.status === 429 || response.status >= 500;
      if (isRetryable && attempt < MAX_ATTEMPTS) {
        const delayMs = this.getRetryDelayMs(response, attempt);
        this.logger.warn(
          JSON.stringify({
            type: 'translation_provider_retry',
            provider: 'tahrirchi',
            status: response.status,
            attempt,
            delayMs,
            targetLocale: input.targetLocale,
          }),
        );
        await sleep(delayMs);
        continue;
      }

      this.logger.warn(
        JSON.stringify({
          type: 'translation_provider_error',
          provider: 'tahrirchi',
          status: response.status,
          sourceLocale: input.sourceLocale,
          targetLocale: input.targetLocale,
        }),
      );
      throw new Error(`Tahrirchi responded with HTTP ${response.status}`);
    }

    // Exhausted all attempts on a retryable status.
    throw new Error('Tahrirchi translation failed after retries');
  }

  /** Honour the provider's Retry-After header when present, else exponential backoff. */
  private getRetryDelayMs(response: Response, attempt: number): number {
    const retryAfter = response.headers.get('retry-after');
    if (retryAfter) {
      const seconds = Number(retryAfter);
      if (Number.isFinite(seconds) && seconds >= 0) {
        return Math.min(seconds * 1_000, MAX_BACKOFF_MS);
      }
    }
    const backoff = BASE_BACKOFF_MS * 2 ** (attempt - 1);
    const jitter = Math.floor(Math.random() * 250);
    return Math.min(backoff + jitter, MAX_BACKOFF_MS);
  }

  private getTimeoutMs(): number {
    const rawValue = this.configService.get<string>('TAHRIRCHI_TIMEOUT_MS');
    const parsed = Number(rawValue);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 45_000;
  }
}
