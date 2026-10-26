import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { EventCollection, Prisma } from '@prisma/client';
import {
  CollectionsRepository,
  CollectionWithEventCount,
  CollectionWithEvents,
} from './collections.repository';
import {
  CreateCollectionDto,
  UpdateCollectionDto,
  CollectionQueryDto,
  AddEventsToCollectionDto,
  RemoveEventsFromCollectionDto,
  ReorderCollectionEventsDto,
  AvailableEventsQueryDto,
} from './dto';
import type { MinimalEventForPicker } from './collections.repository';
import { generateSlug } from '../../common/utils/slug.util';
import { pickFallbackTranslation } from '../translations/dto/business-translation.dto';
import { resolveLocalizedBusinessField } from '../translations/localized-business-field.util';

@Injectable()
export class CollectionsService {
  constructor(private readonly collectionsRepository: CollectionsRepository) {}

  /**
   * Создать новую подборку
   * @throws ConflictException если подборка с таким slug уже существует
   */
  async create(dto: CreateCollectionDto): Promise<EventCollection> {
    const title = pickFallbackTranslation(dto.translations, 'title', dto.title);
    const description = pickFallbackTranslation(
      dto.translations,
      'description',
      dto.description,
    );

    // Генерируем slug если не указан
    const slug = dto.slug || generateSlug(title);

    // Проверяем уникальность slug
    const existingBySlug = await this.collectionsRepository.findBySlug(slug);
    if (existingBySlug) {
      throw new ConflictException(`Подборка со slug "${slug}" уже существует`);
    }

    const collection = await this.collectionsRepository.create({
      title,
      slug,
      coverImage: dto.coverImage,
      gradientStart: dto.gradientStart,
      gradientEnd: dto.gradientEnd,
      description: description || undefined,
      translations: (dto.translations ?? {}) as Prisma.InputJsonValue,
      translationMeta: (dto.translationMeta ?? {}) as Prisma.InputJsonValue,
      sortOrder: dto.sortOrder ?? 0,
      isActive: dto.isActive ?? true,
    });

    // Добавляем события если указаны
    if (dto.eventIds && dto.eventIds.length > 0) {
      await this.collectionsRepository.addEvents(collection.id, dto.eventIds);
    }

    return collection;
  }

  /**
   * Получить подборку по ID
   * @throws NotFoundException если подборка не найдена
   */
  async findById(id: string): Promise<EventCollection> {
    const collection = await this.collectionsRepository.findById(id);
    if (!collection) {
      throw new NotFoundException(`Подборка с ID ${id} не найдена`);
    }
    return collection;
  }

  /**
   * Получить подборку по ID с событиями
   */
  async findByIdWithEvents(id: string): Promise<CollectionWithEvents> {
    const collection = await this.collectionsRepository.findByIdWithEvents(id);
    if (!collection) {
      throw new NotFoundException(`Подборка с ID ${id} не найдена`);
    }
    return collection;
  }

  async findPublicByIdWithEvents(id: string, locale?: string) {
    const collection = await this.findByIdWithEvents(id);
    return this.localizePublicCollection(collection, locale);
  }

  /**
   * Получить подборку по slug с событиями
   */
  async findBySlugWithEvents(slug: string): Promise<CollectionWithEvents> {
    const collection =
      await this.collectionsRepository.findBySlugWithEvents(slug);
    if (!collection) {
      throw new NotFoundException(`Подборка со slug "${slug}" не найдена`);
    }
    return collection;
  }

  async findPublicBySlugWithEvents(slug: string, locale?: string) {
    const collection = await this.findBySlugWithEvents(slug);
    return this.localizePublicCollection(collection, locale);
  }

  /**
   * Получить список подборок с фильтрацией (для админки)
   */
  async findMany(query: CollectionQueryDto): Promise<{
    data: CollectionWithEventCount[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page = 1, limit = 20 } = query;
    const result = await this.collectionsRepository.findMany(query);
    return {
      ...result,
      page,
      limit,
    };
  }

  /**
   * Проверить доступность slug (для формы создания/редактирования)
   * @param slug — проверяемый slug
   * @param excludeId — при редактировании: ID подборки, чей текущий slug не считать занятым
   */
  async checkSlugAvailability(
    slug: string,
    excludeId?: string,
  ): Promise<{ available: boolean }> {
    const existing = await this.collectionsRepository.findBySlug(slug);
    if (!existing) return { available: true };
    if (excludeId && existing.id === excludeId) return { available: true };
    return { available: false };
  }

  /**
   * Список опубликованных и прошедших событий с минимальными полями (для выбора eventIds в подборку)
   */
  async getAvailableEventsForPicker(query: AvailableEventsQueryDto): Promise<{
    data: MinimalEventForPicker[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this.collectionsRepository.findAvailableEventsForPicker(query);
  }

  /**
   * Получить все активные подборки (для публичного API)
   */
  async findAllActive(): Promise<CollectionWithEventCount[]> {
    return this.collectionsRepository.findAllActive();
  }

  async findAllActivePublic(locale?: string) {
    const collections = await this.collectionsRepository.findAllActive();
    return collections.map((collection) =>
      this.localizePublicCollection(collection, locale),
    );
  }

  /**
   * Обновить подборку
   * @throws NotFoundException если подборка не найдена
   * @throws ConflictException если новый slug уже используется
   */
  async update(id: string, dto: UpdateCollectionDto): Promise<EventCollection> {
    const collection = await this.findById(id);
    const title =
      dto.title !== undefined || dto.translations !== undefined
        ? pickFallbackTranslation(
            dto.translations,
            'title',
            dto.title ?? collection.title,
          )
        : undefined;
    const description =
      dto.description !== undefined || dto.translations !== undefined
        ? pickFallbackTranslation(
            dto.translations,
            'description',
            dto.description ?? collection.description,
          )
        : undefined;

    // Проверяем уникальность slug
    if (dto.slug && dto.slug !== collection.slug) {
      const existingBySlug = await this.collectionsRepository.findBySlug(
        dto.slug,
      );
      if (existingBySlug) {
        throw new ConflictException(
          `Подборка со slug "${dto.slug}" уже существует`,
        );
      }
    }

    return this.collectionsRepository.update(id, {
      ...(title !== undefined && { title }),
      ...(dto.slug !== undefined && { slug: dto.slug }),
      ...(dto.coverImage !== undefined && { coverImage: dto.coverImage }),
      ...(dto.gradientStart !== undefined && {
        gradientStart: dto.gradientStart,
      }),
      ...(dto.gradientEnd !== undefined && { gradientEnd: dto.gradientEnd }),
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
   * Удалить подборку
   * @throws NotFoundException если подборка не найдена
   */
  async delete(id: string): Promise<void> {
    await this.findById(id);
    await this.collectionsRepository.delete(id);
  }

  // ==================== Управление событиями в подборке ====================

  /**
   * Добавить события в подборку
   */
  async addEvents(id: string, dto: AddEventsToCollectionDto): Promise<void> {
    await this.findById(id);
    await this.collectionsRepository.addEvents(id, dto.eventIds);
  }

  /**
   * Удалить события из подборки
   */
  async removeEvents(
    id: string,
    dto: RemoveEventsFromCollectionDto,
  ): Promise<void> {
    await this.findById(id);
    await this.collectionsRepository.removeEvents(id, dto.eventIds);
  }

  /**
   * Изменить порядок событий в подборке
   */
  async reorderEvents(
    id: string,
    dto: ReorderCollectionEventsDto,
  ): Promise<void> {
    await this.findById(id);
    await this.collectionsRepository.reorderEvents(id, dto.eventIds);
  }

  /**
   * Получить события подборки
   */
  async getCollectionEvents(id: string) {
    await this.findById(id);
    return this.collectionsRepository.getCollectionEvents(id);
  }

  private localizePublicCollection<T extends object>(
    collection: T,
    locale?: string,
  ): T {
    const { translations, title, description, events, ...rest } =
      collection as Record<string, unknown>;
    delete (rest as Record<string, unknown>).translationMeta;
    const localizedTitle = resolveLocalizedBusinessField(
      translations,
      'title',
      locale,
      typeof title === 'string' ? title : '',
    );

    return {
      ...rest,
      title: localizedTitle,
      name: localizedTitle,
      description:
        resolveLocalizedBusinessField(
          translations,
          'description',
          locale,
          typeof description === 'string' ? description : null,
        ) || null,
      ...(Array.isArray(events) && {
        events: events.map((item) =>
          this.localizePublicCollectionEvent(
            item as Record<string, unknown>,
            locale,
          ),
        ),
      }),
    } as unknown as T;
  }

  private localizePublicCollectionEvent<T extends object>(
    item: T,
    locale?: string,
  ): T {
    const event = (item as Record<string, unknown>).event;
    if (!event || typeof event !== 'object') {
      return item;
    }

    return {
      ...(item as Record<string, unknown>),
      event: this.localizePublicEvent(event as Record<string, unknown>, locale),
    } as unknown as T;
  }

  private localizePublicEvent<T extends object>(event: T, locale?: string): T {
    const { translations, title, shortDescription, organization, ...rest } =
      event as Record<string, unknown>;
    delete (rest as Record<string, unknown>).translationMeta;

    return {
      ...rest,
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
      organization:
        organization && typeof organization === 'object'
          ? this.localizePublicOrganization(
              organization as Record<string, unknown>,
              locale,
            )
          : organization,
    } as unknown as T;
  }

  private localizePublicOrganization<T extends object>(
    organization: T,
    locale?: string,
  ): T {
    const { translations, name, companyName, ...rest } = organization as Record<
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
        typeof name === 'string'
          ? name
          : typeof companyName === 'string'
            ? companyName
            : '',
      ),
    } as unknown as T;
  }
}
