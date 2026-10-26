import {
  getPublicBusinessLocaleFallbackOrder,
  normalizePublicBusinessLocale,
  resolveLocalizedBusinessField,
} from './localized-business-field.util';

describe('localized business field resolver', () => {
  it('uses requested locale before fixed public fallback order', () => {
    const translations = {
      title: {
        ru: 'Конференция',
        uz: 'Konferensiya',
        en: 'Conference',
      },
    };

    expect(
      resolveLocalizedBusinessField(translations, 'title', 'uz', 'Scalar'),
    ).toBe('Konferensiya');
    expect(
      resolveLocalizedBusinessField(translations, 'title', 'en', 'Scalar'),
    ).toBe('Conference');
  });

  it('falls back through ru, uz, en before the scalar field', () => {
    const translations = {
      title: {
        ru: 'Конференция',
        uz: '',
        en: 'Conference',
      },
    };

    expect(
      resolveLocalizedBusinessField(translations, 'title', 'uz', 'Scalar'),
    ).toBe('Конференция');
  });

  it('uses scalar field when translations are missing or empty', () => {
    expect(
      resolveLocalizedBusinessField(
        { title: { ru: '   ' } },
        'title',
        'ru',
        ' Scalar ',
      ),
    ).toBe('Scalar');
    expect(resolveLocalizedBusinessField(null, 'title', 'ru', 'Scalar')).toBe(
      'Scalar',
    );
  });

  it('returns an empty string when no usable value exists', () => {
    expect(resolveLocalizedBusinessField({}, 'title', 'uz', null)).toBe('');
  });

  it('normalizes route locale values without adding languages', () => {
    expect(normalizePublicBusinessLocale('uz-UZ')).toBe('uz');
    expect(normalizePublicBusinessLocale('EN_us')).toBe('en');
    expect(normalizePublicBusinessLocale('de')).toBeUndefined();
    expect(getPublicBusinessLocaleFallbackOrder('en')).toEqual([
      'en',
      'ru',
      'uz',
    ]);
  });
});
