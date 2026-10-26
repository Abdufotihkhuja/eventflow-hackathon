import { EventCollection } from '@prisma/client';
import { CollectionsService } from './collections.service';
import { CollectionsRepository } from './collections.repository';

describe('CollectionsService multilingual mapping', () => {
  function createService() {
    const mocks = {
      findBySlug: jest.fn(),
      create: jest.fn((data) => Promise.resolve({ id: 'collection-id', ...data })),
      addEvents: jest.fn(),
      findById: jest.fn(),
      update: jest.fn((id, data) => Promise.resolve({ id, ...data })),
    };

    return {
      mocks,
      service: new CollectionsService(mocks as unknown as CollectionsRepository),
    };
  }

  it('creates scalar fields from ru/uz/en translations and persists metadata', async () => {
    const { mocks, service } = createService();
    mocks.findBySlug.mockResolvedValue(null);

    await service.create({
      title: 'Fallback title',
      coverImage: '/uploads/cover.png',
      translations: {
        title: { ru: 'Зима', uz: 'Qish', en: 'Winter' },
        description: { uz: 'Qishki tadbirlar' },
      },
      translationMeta: {
        title: {
          ru: { status: 'manual' },
          en: { status: 'auto_translated', sourceLocale: 'ru' },
        },
      },
    });

    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Зима',
        slug: 'zima',
        description: 'Qishki tadbirlar',
        translations: {
          title: { ru: 'Зима', uz: 'Qish', en: 'Winter' },
          description: { uz: 'Qishki tadbirlar' },
        },
        translationMeta: {
          title: {
            ru: { status: 'manual' },
            en: { status: 'auto_translated', sourceLocale: 'ru' },
          },
        },
      }),
    );
  });

  it('updates scalar fields from translations without overwriting manual metadata', async () => {
    const { mocks, service } = createService();
    mocks.findById.mockResolvedValue({
      id: 'collection-id',
      title: 'Existing',
      slug: 'existing',
      coverImage: null,
      gradientStart: null,
      gradientEnd: null,
      description: 'Existing description',
      translations: {},
      translationMeta: {},
      sortOrder: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as EventCollection);

    await service.update('collection-id', {
      translations: {
        title: { en: 'Updated' },
        description: { ru: 'Описание' },
      },
      translationMeta: {
        title: { en: { status: 'edited_after_translation' } },
      },
    });

    expect(mocks.update).toHaveBeenCalledWith(
      'collection-id',
      expect.objectContaining({
        title: 'Updated',
        description: 'Описание',
        translations: {
          title: { en: 'Updated' },
          description: { ru: 'Описание' },
        },
        translationMeta: {
          title: { en: { status: 'edited_after_translation' } },
        },
      }),
    );
  });
});
