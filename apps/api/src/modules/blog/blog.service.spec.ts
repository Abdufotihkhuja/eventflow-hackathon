import { BlogPostStatus, UserType } from '@prisma/client';
import { BlogRepository } from './blog.repository';
import { BlogService } from './blog.service';

const content = [
  {
    id: 'block-1',
    type: 'paragraph',
    props: {},
    content: [{ type: 'text', text: 'Article body text', styles: {} }],
    children: [],
  },
];

describe('BlogService multilingual mapping', () => {
  function createService() {
    const blogRepository = {
      create: jest.fn((data) => Promise.resolve({ id: 'post-id', ...data })),
      findById: jest.fn(),
      findBySlug: jest.fn(),
      update: jest.fn((id, data) => Promise.resolve({ id, ...data })),
      updateTags: jest.fn(),
      slugExists: jest.fn(),
      incrementViews: jest.fn(),
    };
    const savedBlogPostsRepository = {
      isSaved: jest.fn(),
      findSavedPostIdsByUserId: jest.fn(),
    };
    const blogCategoriesService = {
      assertExists: jest.fn(() => Promise.resolve()),
    };

    return {
      blogRepository,
      savedBlogPostsRepository,
      blogCategoriesService,
      service: new BlogService(
        blogRepository as unknown as BlogRepository,
        savedBlogPostsRepository as never,
        blogCategoriesService as never,
      ),
    };
  }

  const user = {
    sub: '11111111-1111-4111-8111-111111111111',
    type: UserType.ORGANIZATION,
  } as never;

  it('creates scalar fields from ru/uz/en translations and persists metadata', async () => {
    const { blogRepository, service } = createService();
    blogRepository.slugExists.mockResolvedValue(false);
    blogRepository.findById.mockResolvedValue({ id: 'post-id' });

    await service.create(
      {
        title: 'Fallback title',
        content,
        translations: {
          title: { ru: 'Статья', uz: 'Maqola', en: 'Article' },
          shortDescription: { uz: 'Qisqa tavsif' },
        },
        translationMeta: {
          title: {
            ru: { status: 'manual' },
            en: { status: 'auto_translated', sourceLocale: 'ru' },
          },
        },
        richTranslations: {
          content: {
            en: [
              {
                id: 'content-en',
                type: 'paragraph',
                content: [{ type: 'text', text: 'Article body', styles: {} }],
              },
            ],
          },
        },
        richTranslationMeta: {
          content: {
            en: { status: 'auto_translated', sourceLocale: 'ru' },
          },
        },
      },
      user,
    );

    expect(blogRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Статья',
        slug: 'stat-ya',
        shortDescription: 'Qisqa tavsif',
        translations: {
          title: { ru: 'Статья', uz: 'Maqola', en: 'Article' },
          shortDescription: { uz: 'Qisqa tavsif' },
        },
        translationMeta: {
          title: {
            ru: { status: 'manual' },
            en: { status: 'auto_translated', sourceLocale: 'ru' },
          },
        },
        richTranslations: {
          content: {
            en: [
              {
                id: 'content-en',
                type: 'paragraph',
                content: [{ type: 'text', text: 'Article body', styles: {} }],
                children: [],
              },
            ],
          },
        },
        richTranslationMeta: {
          content: {
            en: { status: 'auto_translated', sourceLocale: 'ru' },
          },
        },
      }),
    );
  });

  it('updates scalar fields from translations with existing scalar fallback', async () => {
    const { blogRepository, service } = createService();
    blogRepository.findById.mockResolvedValue({
      id: 'post-id',
      organizationId: '11111111-1111-4111-8111-111111111111',
      title: 'Existing',
      slug: 'existing',
      content,
      shortDescription: 'Existing short',
      status: BlogPostStatus.DRAFT,
    });
    blogRepository.slugExists.mockResolvedValue(false);

    await service.update(
      'post-id',
      {
        translations: {
          title: { en: 'Updated' },
          shortDescription: {},
        },
        translationMeta: {
          title: { en: { status: 'edited_after_translation' } },
        },
        richTranslations: {
          content: {
            uz: [
              {
                id: 'content-uz',
                type: 'paragraph',
                content: [{ type: 'text', text: 'Maqola matni', styles: {} }],
                children: [],
              },
            ],
          },
        },
        richTranslationMeta: {
          content: { uz: { status: 'manual' } },
        },
      },
      user,
    );

    expect(blogRepository.update).toHaveBeenCalledWith(
      'post-id',
      expect.objectContaining({
        title: 'Updated',
        slug: 'updated',
        shortDescription: 'Existing short',
        translations: {
          title: { en: 'Updated' },
          shortDescription: {},
        },
        translationMeta: {
          title: { en: { status: 'edited_after_translation' } },
        },
        richTranslations: {
          content: {
            uz: [
              {
                id: 'content-uz',
                type: 'paragraph',
                content: [{ type: 'text', text: 'Maqola matni', styles: {} }],
                children: [],
              },
            ],
          },
        },
        richTranslationMeta: {
          content: { uz: { status: 'manual' } },
        },
      }),
    );
  });

  it('localizes public rich content and strips rich metadata', async () => {
    const { blogRepository, service } = createService();
    const originalContent = [
      {
        id: 'original',
        type: 'paragraph',
        props: {},
        content: [{ type: 'text', text: 'Original content', styles: {} }],
        children: [],
      },
    ];
    const ruContent = [
      {
        id: 'ru',
        type: 'paragraph',
        props: {},
        content: [{ type: 'text', text: 'Русский контент', styles: {} }],
        children: [],
      },
    ];
    const enContent = [
      {
        id: 'en',
        type: 'paragraph',
        props: {},
        content: [{ type: 'text', text: 'English content', styles: {} }],
        children: [],
      },
    ];

    blogRepository.findBySlug.mockResolvedValue({
      id: 'post-id',
      organizationId: '11111111-1111-4111-8111-111111111111',
      title: 'Post',
      slug: 'post',
      content: originalContent,
      shortDescription: 'Short',
      translations: {},
      translationMeta: {},
      richTranslations: {
        content: {
          ru: ruContent,
          en: enContent,
        },
      },
      richTranslationMeta: {
        content: {
          en: { status: 'auto_translated', provider: 'tahrirchi' },
        },
      },
      status: BlogPostStatus.PUBLISHED,
      deletedAt: null,
    });

    const result = await service.findPublicBySlug('post', undefined, 'en');

    expect(result.content).toBe(enContent);
    expect(result).not.toHaveProperty('richTranslations');
    expect(result).not.toHaveProperty('richTranslationMeta');
    expect(result).not.toHaveProperty('translationMeta');
  });

  it('keeps old public blog records rendering from content', async () => {
    const { blogRepository, service } = createService();
    const originalContent = [
      {
        id: 'original',
        type: 'paragraph',
        props: {},
        content: [{ type: 'text', text: 'Original content', styles: {} }],
        children: [],
      },
    ];

    blogRepository.findBySlug.mockResolvedValue({
      id: 'post-id',
      organizationId: '11111111-1111-4111-8111-111111111111',
      title: 'Post',
      slug: 'post',
      content: originalContent,
      shortDescription: 'Short',
      translations: {},
      translationMeta: {},
      richTranslations: undefined,
      richTranslationMeta: undefined,
      status: BlogPostStatus.PUBLISHED,
      deletedAt: null,
    });

    const result = await service.findPublicBySlug('post', undefined, 'uz');

    expect(result.content).toBe(originalContent);
  });
});
