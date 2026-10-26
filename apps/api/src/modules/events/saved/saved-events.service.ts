import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import {
  SavedEventsRepository,
  IPaginatedSavedEvents,
} from './saved-events.repository';
import { SavedEventsQueryDto } from './dto';
import { SavedEvent, UserType } from '@prisma/client';
import { ICurrentUser } from '../../../common/interfaces';
import { EventsService } from '../events.service';
import { localizeEventBusinessFields } from '../../translations/localized-event-fields.util';

@Injectable()
export class SavedEventsService {
  constructor(
    private readonly savedEventsRepository: SavedEventsRepository,
    private readonly eventsService: EventsService,
  ) {}

  /**
   * Сохраняет мероприятие в избранное
   * @throws ConflictException если мероприятие уже сохранено
   * @throws ForbiddenException если пользователь не USER типа
   */
  async save(eventId: string, user: ICurrentUser): Promise<SavedEvent> {
    // Проверяем доступность только для USER типа
    if (user.type !== UserType.USER) {
      throw new ForbiddenException(
        'Только пользователи могут сохранять мероприятия',
      );
    }

    // Проверяем, что мероприятие существует и опубликовано
    await this.eventsService.findPublicById(eventId);

    // Проверяем, что мероприятие ещё не сохранено
    const exists = await this.savedEventsRepository.exists(user.sub, eventId);
    if (exists) {
      throw new ConflictException('Мероприятие уже в избранном');
    }

    return this.savedEventsRepository.save(user.sub, eventId);
  }

  /**
   * Удаляет мероприятие из избранного
   * @throws NotFoundException если мероприятие не в избранном
   */
  async unsave(eventId: string, user: ICurrentUser): Promise<void> {
    // Проверяем доступность только для USER типа
    if (user.type !== UserType.USER) {
      throw new ForbiddenException(
        'Только пользователи могут управлять избранным',
      );
    }

    const exists = await this.savedEventsRepository.exists(user.sub, eventId);
    if (!exists) {
      throw new NotFoundException('Мероприятие не найдено в избранном');
    }

    await this.savedEventsRepository.unsave(user.sub, eventId);
  }

  /**
   * Получает список сохранённых мероприятий пользователя
   */
  async findByUserId(
    user: ICurrentUser,
    query: SavedEventsQueryDto,
  ): Promise<IPaginatedSavedEvents> {
    // Проверяем доступность только для USER типа
    if (user.type !== UserType.USER) {
      throw new ForbiddenException(
        'Только пользователи могут просматривать избранное',
      );
    }

    const { page = 1, limit = 10, locale } = query;
    const result = await this.savedEventsRepository.findByUserId(
      user.sub,
      page,
      limit,
    );

    // Локализуем поля события в каждой записи saved-event.
    const localizedData = result.data.map((item: any) => {
      if (!item?.event) return item;
      const event = item.event;
      const localized = localizeEventBusinessFields(event, locale);
      return {
        ...item,
        event: {
          ...event,
          title: localized.title,
          shortDescription: localized.shortDescription,
          venue: localized.venue,
          city: localized.city,
          organization: event.organization
            ? {
                ...event.organization,
                companyName:
                  localized.organizationName ||
                  event.organization.companyName ||
                  event.organization.name,
              }
            : event.organization,
        },
      };
    });

    return {
      ...result,
      data: localizedData,
    };
  }

  /**
   * Проверяет, сохранено ли мероприятие пользователем
   */
  async isSaved(eventId: string, user: ICurrentUser): Promise<boolean> {
    if (user.type !== UserType.USER) {
      return false;
    }
    return this.savedEventsRepository.exists(user.sub, eventId);
  }
}
