import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BlogPost, BlogPostStatus, Prisma } from '@prisma/client';
import {
  OrganizationBlogPostsQueryDto,
  PublicBlogPostsQueryDto,
  BlogPostSortBy,
} from './dto';

export interface IPaginatedBlogPosts {
  data: BlogPost[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** Поля категории блога, возвращаемые в составе статьи */
const BLOG_CATEGORY_SELECT = {
  id: true,
  slug: true,
  name: true,
  translations: true,
} as const;

/**
 * Public fields for a blog post's byline author. Composed into a Person
 * JSON-LD node on the public site for E-E-A-T. Email/phone/etc. are
 * deliberately excluded — only what should appear in search snippets.
 */
const BLOG_AUTHOR_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
  bio: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class BlogRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Создаёт новую статью
   */
  async create(data: Prisma.BlogPostCreateInput): Promise<BlogPost> {
    return this.prisma.blogPost.create({
      data,
      include: {
        organization: {
          select: { id: true, name: true, translations: true, logoUrl: true },
        },
        tags: {
          include: { tag: true },
        },
        category: { select: BLOG_CATEGORY_SELECT },
        author: { select: BLOG_AUTHOR_SELECT },
      },
    });
  }

  /**
   * Находит статью по ID
   */
  async findById(id: string): Promise<BlogPost | null> {
    return this.prisma.blogPost.findUnique({
      where: { id },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            translations: true,
            logoUrl: true,
            email: true,
          },
        },
        tags: {
          include: { tag: true },
        },
        category: { select: BLOG_CATEGORY_SELECT },
        author: { select: BLOG_AUTHOR_SELECT },
      },
    });
  }

  /**
   * Находит статью по slug
   */
  async findBySlug(slug: string): Promise<BlogPost | null> {
    return this.prisma.blogPost.findUnique({
      where: { slug },
      include: {
        organization: {
          select: { id: true, name: true, translations: true, logoUrl: true },
        },
        tags: {
          include: { tag: true },
        },
        category: { select: BLOG_CATEGORY_SELECT },
        author: { select: BLOG_AUTHOR_SELECT },
      },
    });
  }

  /**
   * Проверяет существование slug
   */
  async slugExists(slug: string, excludeId?: string): Promise<boolean> {
    const post = await this.prisma.blogPost.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!post) return false;
    if (excludeId && post.id === excludeId) return false;
    return true;
  }

  /**
   * Получает статьи организации
   */
  async findByOrganization(
    organizationId: string,
    query: OrganizationBlogPostsQueryDto,
  ): Promise<IPaginatedBlogPosts> {
    const {
      page = 1,
      limit = 10,
      search,
      tagId,
      status,
      sortBy,
      sortOrder,
    } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.BlogPostWhereInput = {
      organizationId,
      ...(status && { status }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { shortDescription: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(tagId && {
        tags: { some: { tagId } },
      }),
    };

    const orderBy = this.getOrderBy(sortBy, sortOrder);

    const [data, total] = await this.prisma.$transaction([
      this.prisma.blogPost.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          organization: {
            select: { id: true, name: true, translations: true, logoUrl: true },
          },
          tags: {
            include: { tag: true },
          },
          category: { select: BLOG_CATEGORY_SELECT },
          author: { select: BLOG_AUTHOR_SELECT },
        },
      }),
      this.prisma.blogPost.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Получает опубликованные статьи (публичный API)
   * Поддерживает расширенные фильтры: дата публикации, время чтения, несколько тегов
   */
  async findPublished(
    query: PublicBlogPostsQueryDto,
  ): Promise<IPaginatedBlogPosts> {
    const {
      page = 1,
      limit = 10,
      search,
      tagId,
      tagIds,
      organizationId,
      categoryId,
      sortBy,
      sortOrder,
      publishedAfter,
      publishedBefore,
      minReadingTime,
      maxReadingTime,
    } = query;
    const skip = (page - 1) * limit;

    // Собираем все ID тегов для фильтрации
    const allTagIds: string[] = [];
    if (tagId) allTagIds.push(tagId);
    if (tagIds?.length) allTagIds.push(...tagIds);

    const where: Prisma.BlogPostWhereInput = {
      deletedAt: null,
      status: BlogPostStatus.PUBLISHED,
      ...(organizationId && { organizationId }),
      ...(categoryId && { categoryId }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { shortDescription: { contains: search, mode: 'insensitive' } },
        ],
      }),
      // Фильтр по тегам (статьи с любым из указанных тегов)
      ...(allTagIds.length > 0 && {
        tags: { some: { tagId: { in: allTagIds } } },
      }),
      // Фильтр по дате публикации
      ...(publishedAfter || publishedBefore
        ? {
            publishedAt: {
              ...(publishedAfter && { gte: new Date(publishedAfter) }),
              ...(publishedBefore && { lte: new Date(publishedBefore) }),
            },
          }
        : {}),
      // Фильтр по времени чтения
      ...(minReadingTime || maxReadingTime
        ? {
            readingTime: {
              ...(minReadingTime && { gte: minReadingTime }),
              ...(maxReadingTime && { lte: maxReadingTime }),
            },
          }
        : {}),
    };

    const orderBy = this.getOrderBy(sortBy, sortOrder);

    const [data, total] = await this.prisma.$transaction([
      this.prisma.blogPost.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          organization: {
            select: { id: true, name: true, translations: true, logoUrl: true },
          },
          tags: {
            include: { tag: true },
          },
          category: { select: BLOG_CATEGORY_SELECT },
          author: { select: BLOG_AUTHOR_SELECT },
        },
      }),
      this.prisma.blogPost.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Получает статьи на модерации
   */
  async findPendingReview(
    page: number = 1,
    limit: number = 10,
  ): Promise<IPaginatedBlogPosts> {
    const skip = (page - 1) * limit;

    const where: Prisma.BlogPostWhereInput = {
      status: BlogPostStatus.PENDING_REVIEW,
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.blogPost.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'asc' },
        include: {
          organization: {
            select: { id: true, name: true, logoUrl: true, email: true },
          },
          tags: {
            include: { tag: true },
          },
          category: { select: BLOG_CATEGORY_SELECT },
          author: { select: BLOG_AUTHOR_SELECT },
        },
      }),
      this.prisma.blogPost.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Получает все статьи с фильтрами (для super admin)
   */
  async findAllForAdmin(query: {
    page?: number;
    limit?: number;
    search?: string;
    status?: BlogPostStatus;
    organizationId?: string;
    sortBy?: BlogPostSortBy;
    sortOrder?: 'asc' | 'desc';
  }): Promise<IPaginatedBlogPosts> {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      organizationId,
      sortBy,
      sortOrder = 'desc',
    } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.BlogPostWhereInput = {
      deletedAt: null,
      ...(status && { status }),
      ...(organizationId && { organizationId }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { shortDescription: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const orderBy = this.getOrderBy(sortBy, sortOrder);

    const [data, total] = await this.prisma.$transaction([
      this.prisma.blogPost.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          organization: {
            select: { id: true, name: true, logoUrl: true, email: true },
          },
          tags: {
            include: { tag: true },
          },
          category: { select: BLOG_CATEGORY_SELECT },
          author: { select: BLOG_AUTHOR_SELECT },
        },
      }),
      this.prisma.blogPost.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Обновляет статью
   */
  async update(
    id: string,
    data: Prisma.BlogPostUpdateInput,
  ): Promise<BlogPost> {
    return this.prisma.blogPost.update({
      where: { id },
      data,
      include: {
        organization: {
          select: { id: true, name: true, logoUrl: true },
        },
        tags: {
          include: { tag: true },
        },
        category: { select: BLOG_CATEGORY_SELECT },
        author: { select: BLOG_AUTHOR_SELECT },
      },
    });
  }

  /**
   * Обновляет статус статьи
   */
  async updateStatus(
    id: string,
    status: BlogPostStatus,
    additionalData?: Partial<{
      rejectionMessage: string | null;
      reviewedAt: Date | null;
      publishedAt: Date | null;
    }>,
  ): Promise<BlogPost> {
    return this.prisma.blogPost.update({
      where: { id },
      data: {
        status,
        ...additionalData,
      },
      include: {
        organization: {
          select: { id: true, name: true, logoUrl: true },
        },
        tags: {
          include: { tag: true },
        },
        category: { select: BLOG_CATEGORY_SELECT },
        author: { select: BLOG_AUTHOR_SELECT },
      },
    });
  }

  /**
   * Удаляет статью
   */
  async delete(id: string): Promise<void> {
    await this.prisma.blogPost.delete({ where: { id } });
  }

  /**
   * Обновляет теги статьи
   */
  async updateTags(postId: string, tagIds: string[]): Promise<void> {
    await this.prisma.$transaction([
      // Удаляем старые теги
      this.prisma.blogPostTagAssignment.deleteMany({
        where: { postId },
      }),
      // Добавляем новые
      this.prisma.blogPostTagAssignment.createMany({
        data: tagIds.map((tagId) => ({ postId, tagId })),
      }),
    ]);
  }

  /**
   * Инкрементирует счётчик просмотров
   */
  async incrementViews(id: string): Promise<void> {
    await this.prisma.blogPost.update({
      where: { id },
      data: { viewsCount: { increment: 1 } },
    });
  }

  /**
   * Инкрементирует/декрементирует счётчик лайков
   */
  async updateLikesCount(id: string, increment: boolean): Promise<void> {
    await this.prisma.blogPost.update({
      where: { id },
      data: {
        likesCount: increment ? { increment: 1 } : { decrement: 1 },
      },
    });
  }

  /**
   * Инкрементирует/декрементирует счётчик комментариев
   */
  async updateCommentsCount(id: string, increment: boolean): Promise<void> {
    await this.prisma.blogPost.update({
      where: { id },
      data: {
        commentsCount: increment ? { increment: 1 } : { decrement: 1 },
      },
    });
  }

  private getOrderBy(
    sortBy?: BlogPostSortBy,
    sortOrder: 'asc' | 'desc' = 'desc',
  ): Prisma.BlogPostOrderByWithRelationInput {
    switch (sortBy) {
      case BlogPostSortBy.LIKES:
        return { likesCount: sortOrder };
      case BlogPostSortBy.VIEWS:
        return { viewsCount: sortOrder };
      case BlogPostSortBy.PUBLISHED_AT:
        return { publishedAt: sortOrder };
      case BlogPostSortBy.READING_TIME:
        return { readingTime: sortOrder };
      case BlogPostSortBy.CREATED_AT:
      default:
        return { createdAt: sortOrder };
    }
  }
}
