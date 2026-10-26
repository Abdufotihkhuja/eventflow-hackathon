import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { BlogCategory, Prisma } from '@prisma/client';
import {
  BlogCategoriesRepository,
  BlogCategoryWithPostCount,
} from './blog-categories.repository';
import {
  CreateBlogCategoryDto,
  UpdateBlogCategoryDto,
  BlogCategoryQueryDto,
  ReorderBlogCategoriesDto,
} from './dto';
import { generateSlug } from '../../common/utils/slug.util';
import { pickFallbackTranslation } from '../translations/dto/business-translation.dto';
import { resolveLocalizedBusinessField } from '../translations/localized-business-field.util';

@Injectable()
export class BlogCategoriesService {
  constructor(
    private readonly blogCategoriesRepository: BlogCategoriesRepository,
  ) {}

  /**
   * Создать новую категорию блога
   * @throws ConflictException если категория с таким именем или slug уже существует
   */
  async create(dto: CreateBlogCategoryDto): Promise<BlogCategory> {
    const name = pickFallbackTranslation(dto.translations, 'name', dto.name);
    const description = pickFallbackTranslation(
      dto.translations,
      'description',
      dto.description,
    );

    const existingByName = await this.blogCategoriesRepository.findByName(name);
    if (existingByName) {
      throw new ConflictException(
        `Категория блога с названием "${name}" уже существует`,
      );
    }

    const slug = dto.slug || generateSlug(name);

    const existingBySlug = await this.blogCategoriesRepository.findBySlug(slug);
    if (existingBySlug) {
      throw new ConflictException(
        `Категория блога со slug "${slug}" уже существует`,
      );
    }

    return this.blogCategoriesRepository.create({
      name,
      slug,
      description: description || undefined,
      translations: (dto.translations ?? {}) as Prisma.InputJsonValue,
      translationMeta: (dto.translationMeta ?? {}) as Prisma.InputJsonValue,
      sortOrder: dto.sortOrder ?? 0,
      isActive: dto.isActive ?? true,
    });
  }

  /**
   * Получить категорию блога по ID
   * @throws NotFoundException если категория не найдена
   */
  async findById(id: string): Promise<BlogCategory> {
    const category = await this.blogCategoriesRepository.findById(id);
    if (!category) {
      throw new NotFoundException(`Категория блога с ID ${id} не найдена`);
    }
    return category;
  }

  /**
   * Проверить доступность slug (для формы создания/редактирования)
   */
  async checkSlugAvailability(
    slug: string,
    excludeId?: string,
  ): Promise<{ available: boolean }> {
    const existing = await this.blogCategoriesRepository.findBySlug(slug);
    if (!existing) return { available: true };
    if (excludeId && existing.id === excludeId) return { available: true };
    return { available: false };
  }

  /**
   * Изменить порядок категорий блога
   * @throws BadRequestException если список не совпадает с полным набором категорий
   */
  async reorder(dto: ReorderBlogCategoriesDto): Promise<void> {
    const allIds = await this.blogCategoriesRepository.findAllIds();

    const sameSet =
      dto.categoryIds.length === allIds.length &&
      dto.categoryIds.every((id) => allIds.includes(id));

    if (!sameSet) {
      throw new BadRequestException(
        'Некорректный список категорий: передайте все ID категорий в нужном порядке',
      );
    }

    await this.blogCategoriesRepository.reorder(dto.categoryIds);
  }

  /**
   * Получить список категорий блога с фильтрацией (для админки)
   */
  async findMany(query: BlogCategoryQueryDto): Promise<{
    data: BlogCategoryWithPostCount[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page = 1, limit = 20 } = query;
    const result = await this.blogCategoriesRepository.findMany(query);
    return {
      ...result,
      page,
      limit,
    };
  }

  /**
   * Получить все активные категории блога (для публичного API)
   */
  async findAllActive(): Promise<BlogCategoryWithPostCount[]> {
    return this.blogCategoriesRepository.findAllActive();
  }

  async findAllActivePublic(locale?: string) {
    const categories = await this.blogCategoriesRepository.findAllActive();
    return categories.map((category) =>
      this.localizePublicCategory(category, locale),
    );
  }

  async findPublicByIdOrSlug(idOrSlug: string, locale?: string) {
    const category = await this.findByIdOrSlug(idOrSlug);
    return this.localizePublicCategory(category, locale);
  }

  /**
   * Обновить категорию блога
   * @throws NotFoundException если категория не найдена
   * @throws ConflictException если новое имя или slug уже используется
   */
  async update(
    id: string,
    dto: UpdateBlogCategoryDto,
  ): Promise<BlogCategory> {
    const category = await this.findById(id);
    const name =
      dto.name !== undefined || dto.translations !== undefined
        ? pickFallbackTranslation(
            dto.translations,
            'name',
            dto.name ?? category.name,
          )
        : undefined;
    const description =
      dto.description !== undefined || dto.translations !== undefined
        ? pickFallbackTranslation(
            dto.translations,
            'description',
            dto.description ?? category.description,
          )
        : undefined;

    if (name && name !== category.name) {
      const existingByName = await this.blogCategoriesRepository.findByName(
        name,
      );
      if (existingByName) {
        throw new ConflictException(
          `Категория блога с названием "${name}" уже существует`,
        );
      }
    }

    if (dto.slug && dto.slug !== category.slug) {
      const existingBySlug = await this.blogCategoriesRepository.findBySlug(
        dto.slug,
      );
      if (existingBySlug) {
        throw new ConflictException(
          `Категория блога со slug "${dto.slug}" уже существует`,
        );
      }
    }

    return this.blogCategoriesRepository.update(id, {
      ...(name !== undefined && { name }),
      ...(dto.slug !== undefined && { slug: dto.slug }),
      ...(description !== undefined && { description }),
      ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      ...(dto.translations !== undefined && {
        translations: dto.translations as Prisma.InputJsonValue,
      }),
      ...(dto.translationMeta !== undefined && {
        translationMeta: dto.translationMeta as Prisma.InputJsonValue,
      }),
    });
  }

  /**
   * Удалить категорию блога
   * @throws NotFoundException если категория не найдена
   */
  async delete(id: string): Promise<void> {
    await this.findById(id);
    await this.blogCategoriesRepository.delete(id);
  }

  /**
   * Проверяет, что категория существует. Используется blog модулем при привязке
   * categoryId к статье.
   * @throws BadRequestException если категория с таким ID не найдена
   */
  async assertExists(id: string): Promise<void> {
    const exists = await this.blogCategoriesRepository.existsById(id);
    if (!exists) {
      throw new BadRequestException(`Категория блога с ID ${id} не найдена`);
    }
  }

  private async findByIdOrSlug(idOrSlug: string): Promise<BlogCategory> {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        idOrSlug,
      );
    const category = isUuid
      ? await this.blogCategoriesRepository.findById(idOrSlug)
      : await this.blogCategoriesRepository.findBySlug(idOrSlug);
    if (!category) {
      throw new NotFoundException(
        `Категория блога "${idOrSlug}" не найдена`,
      );
    }
    return category;
  }

  private localizePublicCategory<T extends object>(
    category: T,
    locale?: string,
  ): T {
    const { translations, name, description, ...rest } = category as Record<
      string,
      unknown
    >;
    delete (rest as Record<string, unknown>).translationMeta;

    return {
      ...rest,
      name: resolveLocalizedBusinessField(
        translations,
        'name',
        locale,
        typeof name === 'string' ? name : '',
      ),
      description:
        resolveLocalizedBusinessField(
          translations,
          'description',
          locale,
          typeof description === 'string' ? description : null,
        ) || null,
    } as unknown as T;
  }
}
