import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { TranslateBatchDto } from './translate-batch.dto';

describe('TranslateBatchDto', () => {
  const validPayload = {
    sourceLocale: 'ru',
    targetLocales: ['uz', 'en'],
    items: [
      {
        fieldKey: 'title',
        text: 'Конференция',
        contentType: 'plain_text',
      },
    ],
  };

  async function validatePayload(payload: unknown) {
    return validate(plainToInstance(TranslateBatchDto, payload));
  }

  it('accepts a valid plain-text translation batch', async () => {
    await expect(validatePayload(validPayload)).resolves.toHaveLength(0);
  });

  it('rejects unsupported source locales', async () => {
    const errors = await validatePayload({
      ...validPayload,
      sourceLocale: 'de',
    });

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('sourceLocale');
  });

  it('rejects source locale in targetLocales', async () => {
    const errors = await validatePayload({
      ...validPayload,
      targetLocales: ['ru'],
    });

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('targetLocales');
  });

  it('rejects an empty targetLocales array', async () => {
    const errors = await validatePayload({
      ...validPayload,
      targetLocales: [],
    });

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('targetLocales');
  });

  it('rejects unsupported content types', async () => {
    const errors = await validatePayload({
      ...validPayload,
      items: [{ ...validPayload.items[0], contentType: 'rich_text' }],
    });

    expect(errors[0].children?.[0].children?.[0].property).toBe(
      'contentType',
    );
  });

  it('rejects more than 50 items', async () => {
    const errors = await validatePayload({
      ...validPayload,
      items: Array.from({ length: 51 }, () => validPayload.items[0]),
    });

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('items');
  });

  it('rejects item text longer than the maxLength cap', async () => {
    // The DTO allows up to 50 000 chars per item (one item bundles all
    // rich-text blocks via newline-joining); anything beyond that fails.
    const errors = await validatePayload({
      ...validPayload,
      items: [{ ...validPayload.items[0], text: 'a'.repeat(50001) }],
    });

    expect(errors[0].children?.[0].children?.[0].property).toBe('text');
  });
});
