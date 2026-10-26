import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BlogRepository, IPaginatedBlogPosts } from './blog.repository';
import {
  CreateBlogPostDto,
  UpdateBlogPostDto,
  OrganizationBlogPostsQueryDto,
  PublicBlogPostsQueryDto,
  BlogPostSortBy,
} from './dto';
import { BlogPost, BlogPostStatus, Prisma, UserType } from '@prisma/client';
import { ICurrentUser } from '../../common/interfaces';
import { BlockNoteUtil } from '../../common/utils/blocknote.util';
import { generateSlug } from '../../common/utils/slug.util';
import { BLOG_ERROR_MESSAGES, READING_SPEED_WPM } from './blog.constants';
import { SavedBlogPostsRepository } from './saved/saved-blog-posts.repository';
import { BlogCategoriesService } from '../blog-categories/blog-categories.service';
import { pickFallbackTranslation } from '../translations/dto/business-translation.dto';
import { normalizeRichTranslations } from '../translations/dto/rich-translation.dto';
import {
  availableLocalesFromTranslations,
  resolveLocalizedBusinessField,
} from '../translations/localized-business-field.util';
import { resolveLocalizedRichText } from '../translations/localized-rich-text.util';

/**
 * Compact public shape for a blog post's byline author. Combines firstName +
 * lastName into a single `name`, drops auth/PII fields (email, phone, etc.),
 * and returns `null` when the post has no explicit author — letting the
 * public web app fall back to `BlogPosting.author = Organization`.
 */
interface PublicAuthorShape {
  id: string;
  name: string;
  avatarUrl: string | null;
  bio: string | null;
}

function shapePublicAuthor(value: unknown): PublicAuthorShape | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const id = typeof record.id === 'string' ? record.id : null;
  if (!id) return null;
  const first = typeof record.firstName === 'string' ? record.firstName : '';
  const last = typeof record.lastName === 'string' ? record.lastName : '';
  const name = `${first} ${last}`.trim();
  if (!name) return null;
  return {
    id,
    name,
    avatarUrl: typeof record.avatarUrl === 'string' ? record.avatarUrl : null,
    bio: typeof record.bio === 'string' ? record.bio : null,
  };
}

@Injectable()
export class BlogService {
  constructor(
    private readonly blogRepository: BlogRepository,
    private readonly savedBlogPostsRepository: SavedBlogPostsRepository,
    private readonly blogCategoriesService: BlogCategoriesService,
  ) {}

  /**
   * Создаёт новую статью блога (черновик по умолчанию)
   * @throws ForbiddenException если пользователь не организатор
   * @throws BadRequestException если структура BlockNote документа невалидна
   */
  async create(dto: CreateBlogPostDto, user: ICurrentUser): Promise<BlogPost> {
    const organizationId = this.getOrganizationId(user);
    const title = pickFallbackTranslation(dto.translations, 'title', dto.title);
    const shortDescription = pickFallbackTranslation(
      dto.translations,
      'shortDescription',
      dto.shortDescription,
    );

    // Валидация контента
    this.validateContent(dto.content);

    // Валидация категории (если указана)
    if (dto.categoryId) {
      await this.blogCategoriesService.assertExists(dto.categoryId);
    }

    // Slug: переданный в DTO (проверка уникальности) или генерация из заголовка
    const slug = dto.slug
      ? await this.ensureUniqueSlug(dto.slug)
      : await this.generateUniqueSlug(title);

    // Расчёт времени чтения
    const readingTime = this.calculateReadingTime(dto.content);

    // Создаём статью (всегда как черновик)
    const post = await this.blogRepository.create({
      title,
      slug,
      content: dto.content,
      shortDescription: shortDescription || undefined,
      translations: (dto.translations ?? {}) as Prisma.InputJsonValue,
      translationMeta: (dto.translationMeta ?? {}) as Prisma.InputJsonValue,
      richTranslations: (normalizeRichTranslations(dto.richTranslations) ??
        {}) as Prisma.InputJsonValue,
      richTranslationMeta: (dto.richTranslationMeta ?? {}) as Prisma.InputJsonValue,
      coverImage: dto.coverImage,
      commentsEnabled: dto.commentsEnabled ?? true,
      readingTime,
      status: BlogPostStatus.DRAFT,
      organization: { connect: { id: organizationId } },
      ...(dto.categoryId && {
        category: { connect: { id: dto.categoryId } },
      }),
      // Optional Person byline — when set, public site emits Person JSON-LD.
      // We accept any user id; cross-org policy can be tightened later.
      ...(dto.authorId && {
        author: { connect: { id: dto.authorId } },
      }),
    });

    // Добавляем теги если указаны
    if (dto.tagIds && dto.tagIds.length > 0) {
      await this.blogRepository.updateTags(post.id, dto.tagIds);
    }

    return this.blogRepository.findById(post.id) as Promise<BlogPost>;
  }

  /**
   * Получает статью по ID
   * @throws NotFoundException если статья не найдена
   */
  async findById(id: string): Promise<BlogPost> {
    const post = await this.blogRepository.findById(id);
    if (!post) {
      throw new NotFoundException(BLOG_ERROR_MESSAGES.POST_NOT_FOUND);
    }
    return post;
  }

  /**
   * Получает статью и проверяет доступ организатора
   */
  async findByIdWithAccess(id: string, user: ICurrentUser): Promise<BlogPost> {
    const post = await this.findById(id);
    this.checkPostAccess(post, user);
    return post;
  }

  /**
   * Получает публичную статью по slug.
   * При переданном user (USER) в ответ добавляется saved (только из saved-blog-posts).
   * Возвращает 410 Gone если статья удалена супер-админом.
   */
  async findPublicBySlug(
    slug: string,
    user?: ICurrentUser,
    locale?: string,
  ): Promise<BlogPost & { saved?: boolean }> {
    const post = await this.blogRepository.findBySlug(slug);
    if (!post) {
      throw new NotFoundException(BLOG_ERROR_MESSAGES.POST_NOT_FOUND);
    }
    if (post.deletedAt) {
      throw new HttpException(
        {
          statusCode: HttpStatus.GONE,
          deleted: true,
          deletionReason: post.deletionReason ?? undefined,
          deletedAt: post.deletedAt.toISOString(),
        },
        HttpStatus.GONE,
      );
    }
    if (post.status !== BlogPostStatus.PUBLISHED) {
      throw new NotFoundException(BLOG_ERROR_MESSAGES.POST_NOT_FOUND);
    }

    await this.blogRepository.incrementViews(post.id);

    const saved =
      user?.type === UserType.USER
        ? await this.savedBlogPostsRepository.isSaved(post.id, user.sub)
        : undefined;

    return {
      ...this.localizePublicPost(post, locale),
      ...(saved !== undefined && { saved }),
    };
  }

  /**
   * Получает публичную статью по ID.
   * При переданном user (USER) в ответ добавляется saved (только из saved-blog-posts).
   * Возвращает 410 Gone если статья удалена супер-админом.
   */
  async findPublicById(
    id: string,
    user?: ICurrentUser,
    locale?: string,
  ): Promise<BlogPost & { saved?: boolean }> {
    const post = await this.findById(id);
    if (post.deletedAt) {
      throw new HttpException(
        {
          statusCode: HttpStatus.GONE,
          deleted: true,
          deletionReason: post.deletionReason ?? undefined,
          deletedAt: post.deletedAt.toISOString(),
        },
        HttpStatus.GONE,
      );
    }
    if (post.status !== BlogPostStatus.PUBLISHED) {
      throw new NotFoundException(BLOG_ERROR_MESSAGES.POST_NOT_FOUND);
    }

    await this.blogRepository.incrementViews(post.id);

    const saved =
      user?.type === UserType.USER
        ? await this.savedBlogPostsRepository.isSaved(post.id, user.sub)
        : undefined;

    return {
      ...this.localizePublicPost(post, locale),
      ...(saved !== undefined && { saved }),
    };
  }

  /**
   * Проверяет доступность slug (уникальность). Для формы создания/редактирования.
   */
  async checkSlugAvailability(
    slug: string,
    excludeId?: string,
  ): Promise<{ available: boolean }> {
    const exists = await this.blogRepository.slugExists(slug, excludeId);
    return { available: !exists };
  }

  /**
   * Генерирует уникальный slug из заголовка (та же логика, что при создании).
   * Для подстановки в форму до сохранения.
   */
  async suggestSlug(
    title: string,
    excludeId?: string,
  ): Promise<{ slug: string }> {
    const slug = await this.generateUniqueSlug(title, excludeId);
    return { slug };
  }

  /**
   * Получает список статей организации (все статусы)
   */
  async findByOrganization(
    query: OrganizationBlogPostsQueryDto,
    user: ICurrentUser,
  ): Promise<IPaginatedBlogPosts> {
    const organizationId = this.getOrganizationId(user);
    return this.blogRepository.findByOrganization(organizationId, query);
  }

  /**
   * Получает публичный список статей (только опубликованные).
   * При переданном user (USER) в каждую статью добавляется saved (только из saved-blog-posts).
   */
  async findPublished(
    query: PublicBlogPostsQueryDto,
    user?: ICurrentUser,
  ): Promise<IPaginatedBlogPosts> {
    const result = await this.blogRepository.findPublished(query);
    const localizedResult = {
      ...result,
      data: result.data.map((post) =>
        this.localizePublicPost(post, query.locale),
      ),
    };

    if (user?.type !== UserType.USER) {
      return localizedResult as IPaginatedBlogPosts;
    }

    const savedPostIds =
      await this.savedBlogPostsRepository.findSavedPostIdsByUserId(user.sub);
    const savedSet = new Set(savedPostIds);

    return {
      ...localizedResult,
      data: localizedResult.data.map((post) => ({
        ...post,
        saved: savedSet.has(post.id),
      })) as BlogPost[],
    } as IPaginatedBlogPosts;
  }

  /**
   * Обновляет статью
   * - Нельзя редактировать статьи на модерации
   * - При редактировании опубликованной/отклонённой статьи — возвращается в черновик
   * @throws ForbiddenException если нет доступа
   * @throws BadRequestException если статья на модерации
   */
  async update(
    id: string,
    dto: UpdateBlogPostDto,
    user: ICurrentUser,
  ): Promise<BlogPost> {
    const post = await this.findByIdWithAccess(id, user);

    // Нельзя редактировать статьи на модерации
    if (post.status === BlogPostStatus.PENDING_REVIEW) {
      throw new BadRequestException(BLOG_ERROR_MESSAGES.CANNOT_EDIT_PENDING);
    }

    // Валидация контента если меняется
    if (dto.content) {
      this.validateContent(dto.content);
    }

    // Валидация категории (если указана непустой)
    if (dto.categoryId) {
      await this.blogCategoriesService.assertExists(dto.categoryId);
    }

    // Подготовка данных для обновления
    const updateData: Prisma.BlogPostUpdateInput = {};
    const title =
      dto.title !== undefined || dto.translations !== undefined
        ? pickFallbackTranslation(
            dto.translations,
            'title',
            dto.title ?? post.title,
          )
        : undefined;
    const shortDescription =
      dto.shortDescription !== undefined || dto.translations !== undefined
        ? pickFallbackTranslation(
            dto.translations,
            'shortDescription',
            dto.shortDescription ?? post.shortDescription,
          )
        : undefined;

    if (title !== undefined) {
      updateData.title = title;
      // Генерируем новый slug при изменении заголовка
      updateData.slug = await this.generateUniqueSlug(title, id);
    }
    if (dto.content !== undefined) {
      updateData.content = dto.content;
      updateData.readingTime = this.calculateReadingTime(dto.content);
    }
    if (shortDescription !== undefined) {
      updateData.shortDescription = shortDescription || null;
    }
    if (dto.translations !== undefined) {
      updateData.translations = dto.translations as Prisma.InputJsonValue;
    }
    if (dto.translationMeta !== undefined) {
      updateData.translationMeta = dto.translationMeta as Prisma.InputJsonValue;
    }
    if (dto.richTranslations !== undefined) {
      updateData.richTranslations = normalizeRichTranslations(
        dto.richTranslations,
      ) as Prisma.InputJsonValue;
    }
    if (dto.richTranslationMeta !== undefined) {
      updateData.richTranslationMeta =
        dto.richTranslationMeta as Prisma.InputJsonValue;
    }
    if (dto.coverImage !== undefined) {
      updateData.coverImage = dto.coverImage;
    }
    if (dto.commentsEnabled !== undefined) {
      updateData.commentsEnabled = dto.commentsEnabled;
    }
    if (dto.categoryId !== undefined) {
      updateData.category = dto.categoryId
        ? { connect: { id: dto.categoryId } }
        : { disconnect: true };
    }
    if (dto.authorId !== undefined) {
      updateData.author = dto.authorId
        ? { connect: { id: dto.authorId } }
        : { disconnect: true };
    }

    // При редактировании опубликованной статьи — возвращаем в черновик для повторной модерации
    if (post.status === BlogPostStatus.PUBLISHED) {
      updateData.status = BlogPostStatus.DRAFT;
      updateData.publishedAt = null;
    }

    // При редактировании отклонённой статьи — возвращаем в черновик и очищаем причину отклонения
    if (post.status === BlogPostStatus.REJECTED) {
      updateData.status = BlogPostStatus.DRAFT;
      updateData.rejectionMessage = null;
    }

    const updated = await this.blogRepository.update(id, updateData);

    // Обновляем теги если указаны
    if (dto.tagIds !== undefined) {
      await this.blogRepository.updateTags(id, dto.tagIds);
      return this.findById(id);
    }

    return updated;
  }

  /**
   * Удаляет статью
   * - Нельзя удалить опубликованную статью (сначала снять с публикации)
   * @throws ForbiddenException если нет доступа
   * @throws BadRequestException если статья опубликована
   */
  async delete(id: string, user: ICurrentUser): Promise<void> {
    const post = await this.findByIdWithAccess(id, user);

    // Нельзя удалить опубликованную статью
    if (post.status === BlogPostStatus.PUBLISHED) {
      throw new BadRequestException(
        BLOG_ERROR_MESSAGES.CANNOT_DELETE_PUBLISHED,
      );
    }

    await this.blogRepository.delete(id);
  }

  /**
   * Отправляет статью на модерацию
   * Можно отправить только черновик
   * @throws BadRequestException если статья не в статусе DRAFT
   */
  async submitForReview(id: string, user: ICurrentUser): Promise<BlogPost> {
    const post = await this.findByIdWithAccess(id, user);

    if (post.status !== BlogPostStatus.DRAFT) {
      throw new BadRequestException(
        BLOG_ERROR_MESSAGES.CANNOT_SUBMIT_DRAFT_ONLY,
      );
    }

    return this.blogRepository.updateStatus(id, BlogPostStatus.PENDING_REVIEW, {
      rejectionMessage: null,
    });
  }

  /**
   * Снимает статью с публикации (возвращает в черновик)
   * После этого статью нужно заново отправить на модерацию для публикации
   * @throws BadRequestException если статья не опубликована
   */
  async unpublish(id: string, user: ICurrentUser): Promise<BlogPost> {
    const post = await this.findByIdWithAccess(id, user);

    if (post.status !== BlogPostStatus.PUBLISHED) {
      throw new BadRequestException(BLOG_ERROR_MESSAGES.CANNOT_UNPUBLISH);
    }

    return this.blogRepository.updateStatus(id, BlogPostStatus.DRAFT, {
      publishedAt: null,
    });
  }

  // === Методы для супер-админа ===

  /**
   * Получает статьи на модерации (для супер-админа)
   */
  async findPendingReview(
    page: number = 1,
    limit: number = 10,
  ): Promise<IPaginatedBlogPosts> {
    return this.blogRepository.findPendingReview(page, limit);
  }

  /**
   * Одобряет статью и автоматически публикует (супер-админ)
   * После одобрения статья сразу становится опубликованной
   */
  async approve(id: string): Promise<BlogPost> {
    const post = await this.findById(id);

    if (post.status !== BlogPostStatus.PENDING_REVIEW) {
      throw new BadRequestException('Статья не на модерации');
    }

    // После одобрения сразу публикуем статью
    return this.blogRepository.updateStatus(id, BlogPostStatus.PUBLISHED, {
      reviewedAt: new Date(),
      publishedAt: new Date(),
      rejectionMessage: null,
    });
  }

  /**
   * Отклоняет статью (супер-админ)
   * Статья возвращается в статус REJECTED с указанием причины
   */
  async reject(id: string, message: string): Promise<BlogPost> {
    const post = await this.findById(id);

    if (post.status !== BlogPostStatus.PENDING_REVIEW) {
      throw new BadRequestException('Статья не на модерации');
    }

    return this.blogRepository.updateStatus(id, BlogPostStatus.REJECTED, {
      reviewedAt: new Date(),
      rejectionMessage: message,
    });
  }

  /**
   * Получает все статьи с фильтрами (супер-админ)
   */
  async findAllForAdmin(query: {
    page?: number;
    limit?: number;
    search?: string;
    status?: BlogPostStatus;
    organizationId?: string;
    sortBy?: BlogPostSortBy | string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<IPaginatedBlogPosts> {
    return this.blogRepository.findAllForAdmin({
      ...query,
      sortBy: query.sortBy as BlogPostSortBy,
    });
  }

  // === Private методы ===

  private getOrganizationId(user: ICurrentUser): string {
    if (user.type === UserType.ORGANIZATION) {
      return user.sub;
    }
    if (user.type === UserType.MEMBER && user.organizationId) {
      return user.organizationId;
    }
    throw new ForbiddenException(BLOG_ERROR_MESSAGES.ONLY_ORGANIZERS);
  }

  private checkPostAccess(post: BlogPost, user: ICurrentUser): void {
    const organizationId = this.getOrganizationId(user);
    if ((post as any).organizationId !== organizationId) {
      throw new ForbiddenException(BLOG_ERROR_MESSAGES.NO_ACCESS);
    }
  }

  private localizePublicPost<T extends object>(post: T, locale?: string): T {
    const {
      translations,
      title,
      shortDescription,
      content,
      richTranslations,
      organization,
      category,
      author,
      ...rest
    } = post as Record<string, unknown>;
    delete (rest as Record<string, unknown>).translationMeta;
    delete (rest as Record<string, unknown>).richTranslationMeta;

    return {
      ...rest,
      // Locales that have a real `title` translation — see public.service.ts
      // for the broader rationale (lets the web app noindex `/en/` pages
      // whose content is just a Russian fallback).
      availableLocales: availableLocalesFromTranslations(translations, 'title'),
      title: resolveLocalizedBusinessField(
        translations,
        'title',
        locale,
        typeof title === 'string' ? title : '',
      ),
      shortDescription:
        resolveLocalizedBusinessField(
          translations,
          'shortDescription',
          locale,
          typeof shortDescription === 'string' ? shortDescription : null,
        ) || null,
      content:
        resolveLocalizedRichText({
          richTranslations,
          fieldKey: 'content',
          requestedLocale: locale,
          fallbackDocument: content,
        }) ?? content,
      organization:
        organization && typeof organization === 'object'
          ? this.localizePublicOrganization(
              organization as Record<string, unknown>,
              locale,
            )
          : organization,
      category:
        category && typeof category === 'object'
          ? this.localizePublicCategory(
              category as Record<string, unknown>,
              locale,
            )
          : (category ?? null),
      // Public byline. When the post has an explicit author, surface a
      // compact Person shape (no email/phone etc.) so the public site can
      // emit `BlogPosting.author = Person` JSON-LD. When null, the public
      // adapter falls back to Organization as before.
      author: shapePublicAuthor(author),
    } as unknown as T;
  }

  /**
   * Локализует связанную категорию блога в составе статьи.
   * Возвращает { id, slug, name (локализованное), translations } для гибкости фронтенда.
   */
  private localizePublicCategory<T extends object>(
    category: T,
    locale?: string,
  ): T {
    const { translations, name, ...rest } = category as Record<string, unknown>;
    return {
      ...rest,
      name: resolveLocalizedBusinessField(
        translations,
        'name',
        locale,
        typeof name === 'string' ? name : '',
      ),
      translations: translations ?? {},
    } as unknown as T;
  }

  private localizePublicOrganization<T extends object>(
    organization: T,
    locale?: string,
  ): T {
    const { translations, name, companyName, description, ...rest } =
      organization as Record<string, unknown>;
    delete (rest as Record<string, unknown>).translationMeta;

    const localizedCompanyName = resolveLocalizedBusinessField(
      translations,
      'companyName',
      locale,
      typeof companyName === 'string' ? companyName : null,
    );

    return {
      ...rest,
      name: resolveLocalizedBusinessField(
        translations,
        'name',
        locale,
        typeof name === 'string' ? name : localizedCompanyName,
      ),
      ...(companyName !== undefined && { companyName: localizedCompanyName }),
      ...(description !== undefined && {
        description:
          resolveLocalizedBusinessField(
            translations,
            'description',
            locale,
            typeof description === 'string' ? description : null,
          ) || null,
      }),
    } as unknown as T;
  }

  private validateContent(content: unknown): void {
    if (!BlockNoteUtil.isValid(content)) {
      throw new BadRequestException(BLOG_ERROR_MESSAGES.INVALID_CONTENT);
    }
    if (BlockNoteUtil.isEmpty(content)) {
      throw new BadRequestException(BLOG_ERROR_MESSAGES.EMPTY_CONTENT);
    }
  }

  /**
   * Делает slug уникальным (добавляет -1, -2, … при коллизии).
   * Для уже нормализованного slug из DTO.
   */
  private async ensureUniqueSlug(slug: string): Promise<string> {
    let result = slug;
    let counter = 1;
    while (await this.blogRepository.slugExists(result)) {
      result = `${slug}-${counter}`;
      counter++;
    }
    return result;
  }

  private async generateUniqueSlug(
    title: string,
    excludeId?: string,
  ): Promise<string> {
    let slug = generateSlug(title);
    let counter = 1;

    while (await this.blogRepository.slugExists(slug, excludeId)) {
      slug = `${generateSlug(title)}-${counter}`;
      counter++;
    }

    return slug;
  }

  private calculateReadingTime(content: any): number {
    const plainText = BlockNoteUtil.toPlainText(content);
    const wordCount = plainText
      .split(/\s+/)
      .filter((word) => word.length > 0).length;
    return Math.max(1, Math.ceil(wordCount / READING_SPEED_WPM));
  }
}
