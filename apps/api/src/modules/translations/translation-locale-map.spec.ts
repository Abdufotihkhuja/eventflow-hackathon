import {
  getSupportedTranslationLocales,
  mapAppLocaleToTahrirchi,
} from './translation-locale-map';

describe('translation locale mapping', () => {
  it('supports only ru, uz, and en app locales', () => {
    expect(getSupportedTranslationLocales()).toEqual(['ru', 'uz', 'en']);
  });

  it('maps app locales to Tahrirchi locale codes', () => {
    expect(mapAppLocaleToTahrirchi('ru')).toBe('rus_Cyrl');
    expect(mapAppLocaleToTahrirchi('uz')).toBe('uzn_Latn');
    expect(mapAppLocaleToTahrirchi('en')).toBe('eng_Latn');
  });
});
