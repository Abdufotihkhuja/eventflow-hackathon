import { TranslationsService, createSourceHash } from './translations.service';
import type { TranslationProvider } from './providers/translation-provider.interface';

describe('TranslationsService', () => {
  function createService(provider: TranslationProvider) {
    return new TranslationsService(provider);
  }

  it('translates every item/target pair with a stable normalized source hash', async () => {
    const translateText = jest.fn(async ({ text, targetLocale }) => ({
      translatedText: `${text}:${targetLocale}`,
      provider: 'tahrirchi' as const,
      model: 'sayqalchi',
    }));
    const provider: TranslationProvider = {
      translateText,
    };
    const service = createService(provider);

    const response = await service.translateBatch({
      sourceLocale: 'ru',
      targetLocales: ['uz', 'en'],
      items: [
        {
          fieldKey: 'title',
          text: '  Конференция   2026  ',
          contentType: 'plain_text',
        },
      ],
    });

    const expectedHash = createSourceHash('Конференция 2026');

    expect(translateText).toHaveBeenCalledTimes(2);
    expect(translateText).toHaveBeenCalledWith({
      text: 'Конференция 2026',
      sourceLocale: 'ru',
      targetLocale: 'uz',
    });
    expect(response.summary).toEqual({ translated: 2, skipped: 0, failed: 0 });
    expect(response.results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fieldKey: 'title',
          targetLocale: 'uz',
          status: 'auto_translated',
          translatedText: 'Конференция 2026:uz',
          provider: 'tahrirchi',
          model: 'sayqalchi',
          sourceHash: expectedHash,
          error: null,
        }),
        expect.objectContaining({
          targetLocale: 'en',
          sourceHash: expectedHash,
        }),
      ]),
    );
  });

  it('skips whitespace-only text without calling the provider', async () => {
    const translateText = jest.fn();
    const provider: TranslationProvider = {
      translateText,
    };
    const service = createService(provider);

    const response = await service.translateBatch({
      sourceLocale: 'uz',
      targetLocales: ['ru'],
      items: [
        {
          fieldKey: 'description',
          text: '   \n\t  ',
          contentType: 'plain_text',
        },
      ],
    });

    expect(translateText).not.toHaveBeenCalled();
    expect(response.summary).toEqual({ translated: 0, skipped: 1, failed: 0 });
    expect(response.results[0]).toEqual({
      fieldKey: 'description',
      targetLocale: 'ru',
      status: 'skipped',
      translatedText: null,
      provider: null,
      model: null,
      sourceLocale: 'uz',
      sourceHash: createSourceHash(''),
      translatedAt: null,
      error: null,
    });
  });

  it('returns translation_error for only the failed target locale', async () => {
    const provider: TranslationProvider = {
      translateText: jest.fn(async ({ targetLocale }) => {
        if (targetLocale === 'en') {
          throw new Error('provider unavailable');
        }

        return {
          translatedText: 'Тадбир',
          provider: 'tahrirchi',
          model: 'sayqalchi',
        };
      }),
    };
    const service = createService(provider);

    const response = await service.translateBatch({
      sourceLocale: 'ru',
      targetLocales: ['uz', 'en'],
      items: [
        {
          fieldKey: 'title',
          text: 'Событие',
          contentType: 'plain_text',
        },
      ],
    });

    expect(response.summary).toEqual({ translated: 1, skipped: 0, failed: 1 });
    expect(response.results).toEqual([
      expect.objectContaining({
        targetLocale: 'uz',
        status: 'auto_translated',
        translatedText: 'Тадбир',
        error: null,
      }),
      expect.objectContaining({
        targetLocale: 'en',
        status: 'translation_error',
        translatedText: null,
        provider: 'tahrirchi',
        error: 'provider unavailable',
      }),
    ]);
  });
});
