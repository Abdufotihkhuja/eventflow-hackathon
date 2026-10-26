import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { CommentsRepository, IPaginatedComments } from './comments.repository';
import { CreateCommentDto, UpdateCommentDto, CommentQueryDto } from './dto';
import { EventComment, UserType } from '@prisma/client';
import { ICurrentUser } from '../../../common/interfaces';
import { EventsService } from '../events.service';

@Injectable()
export class CommentsService {
  constructor(
    private readonly commentsRepository: CommentsRepository,
    private readonly eventsService: EventsService,
  ) {}

  /**
   * Создаёт комментарий к мероприятию
   * @throws BadRequestException если комментарии отключены для мероприятия
   */
  async create(
    eventId: string,
    dto: CreateCommentDto,
    user: ICurrentUser,
  ): Promise<EventComment> {
    // Проверяем, что мероприятие существует и опубликовано
    const event = await this.eventsService.findPublicById(eventId);

    // Проверяем, что комментарии разрешены
    if (!(event as unknown as { commentsEnabled: boolean }).commentsEnabled) {
      throw new BadRequestException(
        'Комментарии отключены для этого мероприятия',
      );
    }

    if (!user?.sub) {
      throw new ForbiddenException('Необходима авторизация');
    }

    // Если это ответ на комментарий - проверяем существование родителя
    if (dto.parentId) {
      const parentComment = await this.commentsRepository.findById(
        dto.parentId,
      );
      if (!parentComment) {
        throw new NotFoundException('Родительский комментарий не найден');
      }
      if (parentComment.eventId !== eventId) {
        throw new BadRequestException(
          'Родительский комментарий принадлежит другому мероприятию',
        );
      }
    }

    // ORGANIZATION и MEMBER комментируют от имени организации — но только в рамках
    // собственного события. USER комментирует как обычно.
    if (user.type === UserType.ORGANIZATION || user.type === UserType.MEMBER) {
      const organizationId =
        user.type === UserType.ORGANIZATION ? user.sub : user.organizationId;
      if (!organizationId) {
        throw new ForbiddenException(
          'Организация не определена для текущего пользователя',
        );
      }
      const eventOrgId = (event as unknown as { organizationId: string })
        .organizationId;
      if (eventOrgId !== organizationId) {
        throw new ForbiddenException(
          'Можно отвечать только на комментарии своих мероприятий',
        );
      }
      return this.commentsRepository.create({
        content: dto.content,
        eventId,
        authorOrganizationId: organizationId,
        parentId: dto.parentId ?? undefined,
      });
    }

    if (user.type !== UserType.USER) {
      throw new ForbiddenException(
        'Этот тип учётной записи не может оставлять комментарии',
      );
    }

    return this.commentsRepository.create({
      content: dto.content,
      eventId,
      userId: user.sub,
      parentId: dto.parentId ?? undefined,
    });
  }

  /**
   * Получает список комментариев к мероприятию
   */
  async findByEventId(
    eventId: string,
    query: CommentQueryDto,
    userId?: string,
  ): Promise<IPaginatedComments> {
    // Проверяем, что мероприятие существует
    await this.eventsService.findPublicById(eventId);

    const page = Math.max(1, Number(query?.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query?.limit) || 20));
    return this.commentsRepository.findByEventId(eventId, page, limit, userId);
  }

  /**
   * Обновляет комментарий
   * @throws ForbiddenException если пользователь не автор комментария
   */
  async update(
    id: string,
    dto: UpdateCommentDto,
    user: ICurrentUser,
  ): Promise<EventComment> {
    const comment = await this.findByIdOrFail(id);
    this.checkCommentOwnership(comment, user);

    return this.commentsRepository.update(id, { content: dto.content });
  }

  /**
   * Удаляет комментарий
   * @throws ForbiddenException если пользователь не автор комментария
   */
  async delete(id: string, user: ICurrentUser): Promise<void> {
    const comment = await this.findByIdOrFail(id);
    this.checkCommentOwnership(comment, user);

    await this.commentsRepository.delete(id);
  }

  /**
   * Переключает лайк/дизлайк на комментарии
   */
  async toggleLike(
    id: string,
    isLike: boolean,
    user: ICurrentUser,
  ): Promise<{ likes: number; dislikes: number }> {
    // Проверяем доступность только для USER типа
    if (user.type !== UserType.USER) {
      throw new ForbiddenException('Только пользователи могут ставить лайки');
    }

    await this.findByIdOrFail(id);

    await this.commentsRepository.toggleLike(id, user.sub, isLike);

    return this.commentsRepository.getLikesCounts(id);
  }

  // === Private methods ===

  private async findByIdOrFail(id: string): Promise<EventComment> {
    const comment = await this.commentsRepository.findById(id);
    if (!comment) {
      throw new NotFoundException('Комментарий не найден');
    }
    return comment;
  }

  private checkCommentOwnership(
    comment: EventComment,
    user: ICurrentUser,
  ): void {
    // USER может трогать свои комментарии. ORGANIZATION/MEMBER — комментарии,
    // оставленные от имени своей организации.
    if (user.type === UserType.USER) {
      if (comment.userId === user.sub) return;
    } else if (
      user.type === UserType.ORGANIZATION ||
      user.type === UserType.MEMBER
    ) {
      const organizationId =
        user.type === UserType.ORGANIZATION ? user.sub : user.organizationId;
      if (
        organizationId &&
        (comment as EventComment & { authorOrganizationId: string | null })
          .authorOrganizationId === organizationId
      ) {
        return;
      }
    }
    throw new ForbiddenException(
      'Вы можете редактировать только свои комментарии',
    );
  }
}
