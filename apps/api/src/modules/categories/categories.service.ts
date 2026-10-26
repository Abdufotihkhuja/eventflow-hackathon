import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { EventCategory, Prisma } from '@prisma/client';
import {
  CategoriesRepository,
  CategoryWithEventCount,
} from './categories.repository';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CategoryQueryDto,
  ReorderCategoriesDto,
} from './dto';
import { generateSlug } from '../../common/utils/slug.util';
import { pickFallbackTranslation } from '../translations/dto/business-translation.dto';
import { resolveLocalizedBusinessField } from '../translations/localized-business-field.util';

@Injectable()
export class CategoriesService {
  constructor(private readonly categoriesRepository: CategoriesRepository) {}

  /**
   * Создать новую категорию
   * @throws ConflictException если категория с таким именем или slug уже существует
   */
  async create(dto: CreateCategoryDto): Promise<EventCategory> {
    const name = pickFallbackTranslation(dto.translations, 'name', dto.name);
    const description = pickFallbackTranslation(
      dto.translations,
      'description',
      dto.description,
    );

    // Проверяем уникальность имени
    const existingByName = await this.categoriesRepository.findByName(name);
    if (existingByName) {
      throw new ConflictException(
        `Категория с названием "${name}" уже существует`,
      );
    }

    // Генерируем slug если не указан
    const slug = dto.slug || generateSlug(name);

    // Проверяем уникальность slug
    const existingBySlug = await this.categoriesRepository.findBySlug(slug);
    if (existingBySlug) {
      throw new ConflictException(`Категория со slug "${slug}" уже существует`);
    }

    return this.categoriesRepository.create({
      name,
      slug,
      icon: dto.icon,
      description: description || undefined,
      translations: (dto.translations ?? {}) as Prisma.InputJsonValue,
      translationMeta: (dto.translationMeta ?? {}) as Prisma.InputJsonValue,
      sortOrder: dto.sortOrder ?? 0,
      isActive: dto.isActive ?? true,
    });
  }

  /**
   * Получить категорию по ID
   * @throws NotFoundException если категория не найдена
   */
  async findById(id: string): Promise<EventCategory> {
    const category = await this.categoriesRepository.findById(id);
    if (!category) {
      throw new NotFoundException(`Категория с ID ${id} не найдена`);
    }
    return category;
  }

  /**
   * Проверить доступность slug (для формы создания/редактирования)
   * @param slug — проверяемый slug
   * @param excludeId — при редактировании: ID категории, чей текущий slug не считать занятым
   */
  async checkSlugAvailability(
    slug: string,
    excludeId?: string,
  ): Promise<{ available: boolean }> {
    const existing = await this.categoriesRepository.findBySlug(slug);
    if (!existing) return { available: true };
    if (excludeId && existing.id === excludeId) return { available: true };
    return { available: false };
  }

  /**
   * Изменить порядок категорий
   * @param dto — массив ID всех категорий в нужном порядке (полный набор, без дубликатов)
   * @throws BadRequestException если список не совпадает с полным набором категорий
   */
  async reorder(dto: ReorderCategoriesDto): Promise<void> {
    const allIds = await this.categoriesRepository.findAllIds();

    const sameSet =
      dto.categoryIds.length === allIds.length &&
      dto.categoryIds.every((id) => allIds.includes(id));

    if (!sameSet) {
      throw new BadRequestException(
        'Некорректный список категорий: передайте все ID категорий в нужном порядке',
      );
    }

    await this.categoriesRepository.reorder(dto.categoryIds);
  }

  /**
   * Получить список категорий с фильтрацией (для админки)
   */
  async findMany(query: CategoryQueryDto): Promise<{
    data: CategoryWithEventCount[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page = 1, limit = 20 } = query;
    const result = await this.categoriesRepository.findMany(query);
    return {
      ...result,
      page,
      limit,
    };
  }

  /**
   * Получить все активные категории (для публичного API)
   */
  async findAllActive(): Promise<CategoryWithEventCount[]> {
    return this.categoriesRepository.findAllActive();
  }

  async findAllActivePublic(locale?: string) {
    const categories = await this.categoriesRepository.findAllActive();
    return categories.map((category) =>
      this.localizePublicCategory(category, locale),
    );
  }

  async findPublicById(id: string, locale?: string) {
    const category = await this.findById(id);
    return this.localizePublicCategory(category, locale);
  }

  /**
   * Обновить категорию
   * @throws NotFoundException если категория не найдена
   * @throws ConflictException если новое имя или slug уже используется
   */
  async update(id: string, dto: UpdateCategoryDto): Promise<EventCategory> {
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

    // Проверяем уникальность имени
    if (name && name !== category.name) {
      const existingByName = await this.categoriesRepository.findByName(name);
      if (existingByName) {
        throw new ConflictException(
          `Категория с названием "${name}" уже существует`,
        );
      }
    }

    // Проверяем уникальность slug
    if (dto.slug && dto.slug !== category.slug) {
      const existingBySlug = await this.categoriesRepository.findBySlug(
        dto.slug,
      );
      if (existingBySlug) {
        throw new ConflictException(
          `Категория со slug "${dto.slug}" уже существует`,
        );
      }
    }

    return this.categoriesRepository.update(id, {
      ...(name !== undefined && { name }),
      ...(dto.slug !== undefined && { slug: dto.slug }),
      ...(dto.icon !== undefined && { icon: dto.icon }),
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
   * Удалить категорию
   * @throws NotFoundException если категория не найдена
   */
  async delete(id: string): Promise<void> {
    await this.findById(id);
    await this.categoriesRepository.delete(id);
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
