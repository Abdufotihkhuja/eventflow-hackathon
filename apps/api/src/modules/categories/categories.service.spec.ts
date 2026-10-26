import { EventCategory } from '@prisma/client';
import { CategoriesService } from './categories.service';
import { CategoriesRepository } from './categories.repository';

describe('CategoriesService multilingual mapping', () => {
  function createService() {
    const mocks = {
      findByName: jest.fn(),
      findBySlug: jest.fn(),
      create: jest.fn((data) => Promise.resolve({ id: 'category-id', ...data })),
      findById: jest.fn(),
      update: jest.fn((id, data) => Promise.resolve({ id, ...data })),
    };

    return {
      mocks,
      service: new CategoriesService(mocks as unknown as CategoriesRepository),
    };
  }

  it('creates scalar fields from ru/uz/en translations and persists metadata', async () => {
    const { mocks, service } = createService();
    mocks.findByName.mockResolvedValue(null);
    mocks.findBySlug.mockResolvedValue(null);

    await service.create({
      name: 'Fallback name',
      icon: '/uploads/icon.svg',
      translations: {
        name: { uz: 'Biznes', en: 'Business' },
        description: { en: 'Business events' },
      },
      translationMeta: {
        name: {
          uz: { status: 'manual' },
          en: { status: 'auto_translated', sourceLocale: 'uz' },
        },
      },
    });

    expect(mocks.findByName).toHaveBeenCalledWith('Biznes');
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Biznes',
        slug: 'biznes',
        description: 'Business events',
        translations: {
          name: { uz: 'Biznes', en: 'Business' },
          description: { en: 'Business events' },
        },
        translationMeta: {
          name: {
            uz: { status: 'manual' },
            en: { status: 'auto_translated', sourceLocale: 'uz' },
          },
        },
      }),
    );
  });

  it('updates scalar fields from translations with existing scalar fallback', async () => {
    const { mocks, service } = createService();
    mocks.findById.mockResolvedValue({
      id: 'category-id',
      name: 'Existing',
      slug: 'existing',
      icon: null,
      description: 'Existing description',
      translations: {},
      translationMeta: {},
      sortOrder: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as EventCategory);
    mocks.findByName.mockResolvedValue(null);

    await service.update('category-id', {
      translations: {
        name: { en: 'Updated' },
        description: {},
      },
      translationMeta: {
        name: { en: { status: 'manual' } },
      },
    });

    expect(mocks.update).toHaveBeenCalledWith(
      'category-id',
      expect.objectContaining({
        name: 'Updated',
        description: 'Existing description',
        translations: {
          name: { en: 'Updated' },
          description: {},
        },
        translationMeta: {
          name: { en: { status: 'manual' } },
        },
      }),
    );
  });
});
