import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { TagsRepository, ITagWithEvents } from './tags.repository';
import { CreateTagDto, AssignTagsDto, TagsQueryDto } from './dto';
import { EventTag, TagCategory, UserType } from '@prisma/client';
import { ICurrentUser } from '../../../common/interfaces';
import { generateSlug } from '../../../common/utils/slug.util';

@Injectable()
export class TagsService {
  constructor(private readonly tagsRepository: TagsRepository) {}

  /**
   * Создаёт кастомный тег для организации
   * @throws ForbiddenException если пользователь не организатор
   * @throws ConflictException если тег с таким slug уже существует
   */
  async createCustomTag(
    dto: CreateTagDto,
    user: ICurrentUser,
  ): Promise<EventTag> {
    const organizationId = this.getOrganizationId(user);
    const slug = generateSlug(dto.name);

    // Проверяем, что тег с таким slug не существует у организации
    const existing = await this.tagsRepository.findBySlugAndOrg(
      slug,
      organizationId,
    );

    if (existing) {
      throw new ConflictException('Тег с таким названием уже существует');
    }

    return this.tagsRepository.create({
      name: dto.name,
      slug,
      category: TagCategory.CUSTOM,
      isSystem: false,
      organization: { connect: { id: organizationId } },
    });
  }

  /**
   * Получает все доступные теги (системные + теги организации)
   */
  async getAvailableTags(
    query: TagsQueryDto,
    user?: ICurrentUser,
  ): Promise<ITagWithEvents[]> {
    const organizationId = user ? this.getOrganizationIdSafe(user) : undefined;
    return this.tagsRepository.findAvailableTags(
      organizationId,
      query.category,
    );
  }

  /**
   * Получает теги организации
   * @throws ForbiddenException если пользователь не организатор
   */
  async getOrganizationTags(user: ICurrentUser): Promise<EventTag[]> {
    const organizationId = this.getOrganizationId(user);
    return this.tagsRepository.findByOrganization(organizationId);
  }

  /**
   * Получает теги мероприятия (публичный метод)
   */
  async getEventTags(eventId: string): Promise<EventTag[]> {
    return this.tagsRepository.findByEventId(eventId);
  }

  /**
   * Назначает теги мероприятию
   * @throws BadRequestException если тегов больше 3 или теги не существуют
   * @throws ForbiddenException если нет доступа к тегам
   */
  async assignTagsToEvent(
    eventId: string,
    dto: AssignTagsDto,
    user: ICurrentUser,
  ): Promise<EventTag[]> {
    const organizationId = this.getOrganizationId(user);

    // Проверяем, что все теги существуют
    const tagsExist = await this.tagsRepository.checkTagsExist(dto.tagIds);
    if (!tagsExist) {
      throw new BadRequestException('Один или несколько тегов не существуют');
    }

    // Проверяем доступность тегов для организации
    const tagsAccessible = await this.tagsRepository.checkTagsAccessible(
      dto.tagIds,
      organizationId,
    );

    if (!tagsAccessible) {
      throw new ForbiddenException('Нет доступа к одному или нескольким тегам');
    }

    // Назначаем теги
    await this.tagsRepository.assignToEvent(eventId, dto.tagIds);

    // Возвращаем назначенные теги
    return this.tagsRepository.findByEventId(eventId);
  }

  /**
   * Удаляет кастомный тег организации
   * @throws NotFoundException если тег не найден
   * @throws ForbiddenException если тег системный или не принадлежит организации
   */
  async deleteCustomTag(id: string, user: ICurrentUser): Promise<void> {
    const organizationId = this.getOrganizationId(user);
    const tag = await this.tagsRepository.findById(id);

    if (!tag) {
      throw new NotFoundException('Тег не найден');
    }

    if (tag.isSystem) {
      throw new ForbiddenException('Нельзя удалить системный тег');
    }

    if (tag.organizationId !== organizationId) {
      throw new ForbiddenException('Нет доступа к этому тегу');
    }

    await this.tagsRepository.delete(id);
  }

  /**
   * Получает тег по ID
   * @throws NotFoundException если тег не найден
   */
  async findById(id: string): Promise<EventTag> {
    const tag = await this.tagsRepository.findById(id);
    if (!tag) {
      throw new NotFoundException('Тег не найден');
    }
    return tag;
  }

  // === Private methods ===

  private getOrganizationId(user: ICurrentUser): string {
    if (user.type === UserType.ORGANIZATION) {
      return user.sub;
    }
    if (user.type === UserType.MEMBER && user.organizationId) {
      return user.organizationId;
    }
    throw new ForbiddenException('Только организаторы могут управлять тегами');
  }

  private getOrganizationIdSafe(user: ICurrentUser): string | undefined {
    if (user.type === UserType.ORGANIZATION) {
      return user.sub;
    }
    if (user.type === UserType.MEMBER && user.organizationId) {
      return user.organizationId;
    }
    return undefined;
  }
}
