import { resolveLocalizedRichText } from './localized-rich-text.util';

const originalDocument = [
  {
    id: 'original',
    type: 'paragraph',
    props: {},
    content: [{ type: 'text', text: 'Original description', styles: {} }],
    children: [],
  },
];

const ruDocument = [
  {
    id: 'ru',
    type: 'paragraph',
    props: {},
    content: [{ type: 'text', text: 'Русское описание', styles: {} }],
    children: [],
  },
];

const uzDocument = [
  {
    id: 'uz',
    type: 'paragraph',
    props: {},
    content: [{ type: 'text', text: 'Ozbekcha tavsif', styles: {} }],
    children: [],
  },
];

const enDocument = [
  {
    id: 'en',
    type: 'paragraph',
    props: {},
    content: [{ type: 'text', text: 'English description', styles: {} }],
    children: [],
  },
];

const emptyDocument = [
  {
    id: 'empty',
    type: 'paragraph',
    props: {},
    content: [{ type: 'text', text: '   ', styles: {} }],
    children: [],
  },
];

describe('localized rich text resolver', () => {
  it('returns the requested locale when it is valid and non-empty', () => {
    expect(
      resolveLocalizedRichText({
        richTranslations: { description: { uz: uzDocument, ru: ruDocument } },
        fieldKey: 'description',
        requestedLocale: 'uz',
        fallbackDocument: originalDocument,
      }),
    ).toBe(uzDocument);
  });

  it('falls back from requested locale to ru', () => {
    expect(
      resolveLocalizedRichText({
        richTranslations: { description: { ru: ruDocument } },
        fieldKey: 'description',
        requestedLocale: 'uz',
        fallbackDocument: originalDocument,
      }),
    ).toBe(ruDocument);
  });

  it('falls back to uz after ru is unavailable', () => {
    expect(
      resolveLocalizedRichText({
        richTranslations: { content: { uz: uzDocument } },
        fieldKey: 'content',
        requestedLocale: 'en',
        fallbackDocument: originalDocument,
      }),
    ).toBe(uzDocument);
  });

  it('falls back to en after ru and uz are unavailable', () => {
    expect(
      resolveLocalizedRichText({
        richTranslations: { content: { en: enDocument } },
        fieldKey: 'content',
        requestedLocale: 'uz',
        fallbackDocument: originalDocument,
      }),
    ).toBe(enDocument);
  });

  it('falls back to the original rich document', () => {
    expect(
      resolveLocalizedRichText({
        richTranslations: { description: {} },
        fieldKey: 'description',
        requestedLocale: 'ru',
        fallbackDocument: originalDocument,
      }),
    ).toBe(originalDocument);
  });

  it('skips invalid translated documents', () => {
    expect(
      resolveLocalizedRichText({
        richTranslations: {
          description: {
            uz: [{ id: 'invalid-without-type' }],
            ru: ruDocument,
          },
        },
        fieldKey: 'description',
        requestedLocale: 'uz',
        fallbackDocument: originalDocument,
      }),
    ).toBe(ruDocument);
  });

  it('skips empty translated documents', () => {
    expect(
      resolveLocalizedRichText({
        richTranslations: {
          description: {
            uz: emptyDocument,
            en: enDocument,
          },
        },
        fieldKey: 'description',
        requestedLocale: 'uz',
        fallbackDocument: originalDocument,
      }),
    ).toBe(enDocument);
  });

  it('returns undefined for old empty records without rich translations', () => {
    expect(
      resolveLocalizedRichText({
        richTranslations: undefined,
        fieldKey: 'description',
        requestedLocale: 'ru',
        fallbackDocument: null,
      }),
    ).toBeUndefined();
  });
});
