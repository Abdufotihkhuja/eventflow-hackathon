import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

import { CreateBlogPostDto } from '../blog/dto/create-blog-post.dto';
import { CreateEventDto } from '../events/dto/create-event.dto';

const validDocument = [
  {
    id: 'block-1',
    type: 'paragraph',
    props: {},
    content: [{ type: 'text', text: 'Описание', styles: {} }],
    children: [],
  },
];

describe('rich translation DTO validation', () => {
  it('accepts a valid Event.description document', async () => {
    const dto = plainToInstance(CreateEventDto, {
      richTranslations: {
        description: { ru: validDocument },
      },
      richTranslationMeta: {
        description: { ru: { status: 'manual' } },
      },
    });

    const errors = await validate(dto, { skipMissingProperties: true });

    expect(errors.some((error) => error.property === 'richTranslations')).toBe(
      false,
    );
    expect(
      errors.some((error) => error.property === 'richTranslationMeta'),
    ).toBe(false);
  });

  it('accepts a valid BlogPost.content document', async () => {
    const dto = plainToInstance(CreateBlogPostDto, {
      richTranslations: {
        content: { en: validDocument },
      },
      richTranslationMeta: {
        content: { en: { status: 'auto_translated', sourceLocale: 'ru' } },
      },
    });

    const errors = await validate(dto, { skipMissingProperties: true });

    expect(errors.some((error) => error.property === 'richTranslations')).toBe(
      false,
    );
    expect(
      errors.some((error) => error.property === 'richTranslationMeta'),
    ).toBe(false);
  });

  it('rejects unsupported rich translation locales', async () => {
    const dto = plainToInstance(CreateEventDto, {
      richTranslations: {
        description: { fr: validDocument },
      },
    });

    const errors = await validate(dto, { skipMissingProperties: true });

    expect(errors.some((error) => error.property === 'richTranslations')).toBe(
      true,
    );
  });

  it('rejects unexpected rich translation field keys', async () => {
    const dto = plainToInstance(CreateBlogPostDto, {
      richTranslations: {
        description: { ru: validDocument },
      },
    });

    const errors = await validate(dto, { skipMissingProperties: true });

    expect(errors.some((error) => error.property === 'richTranslations')).toBe(
      true,
    );
  });

  it('rejects invalid BlockNote document shapes', async () => {
    const dto = plainToInstance(CreateEventDto, {
      richTranslations: {
        description: {
          ru: [{ id: 'missing-type', content: [] }],
        },
      },
    });

    const errors = await validate(dto, { skipMissingProperties: true });

    expect(errors.some((error) => error.property === 'richTranslations')).toBe(
      true,
    );
  });

  it('rejects invalid rich metadata statuses and field keys', async () => {
    const dto = plainToInstance(CreateEventDto, {
      richTranslationMeta: {
        content: { ru: { status: 'manual' } },
        description: { uz: { status: 'queued' } },
      },
    });

    const errors = await validate(dto, { skipMissingProperties: true });

    expect(
      errors.some((error) => error.property === 'richTranslationMeta'),
    ).toBe(true);
  });

  it('rejects unexpected rich metadata locale object keys', async () => {
    const dto = plainToInstance(CreateBlogPostDto, {
      richTranslationMeta: {
        content: {
          ru: { status: 'manual', arbitrary: 'value' },
        },
      },
    });

    const errors = await validate(dto, { skipMissingProperties: true });

    expect(
      errors.some((error) => error.property === 'richTranslationMeta'),
    ).toBe(true);
  });
});
