import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateCommentDto, UpdateCommentDto } from './dto';
import { BoardTaskComment, ActivityType } from '@prisma/client';
import { BoardsRepository } from '../boards.repository';

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boardsRepository: BoardsRepository,
  ) {}

  async create(
    taskId: string,
    dto: CreateCommentDto,
    memberId: string | null,
    orgId: string,
  ): Promise<BoardTaskComment> {
    // Получаем задачу для проверки доступа
    const task = await this.prisma.boardTask.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new NotFoundException(`Задача с ID ${taskId} не найдена`);
    }

    await this.checkMemberAccess(task.boardId, memberId, orgId);

    const comment = await this.prisma.$transaction(async (tx) => {
      const newComment = await tx.boardTaskComment.create({
        data: {
          taskId,
          memberId,
          content: dto.content,
        },
        include: {
          member: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      });

      // Логируем
      await tx.boardTaskActivity.create({
        data: {
          taskId,
          memberId,
          type: ActivityType.COMMENTED,
          details: { commentId: newComment.id },
        },
      });

      return newComment;
    });

    return comment;
  }

  async findByTaskId(
    taskId: string,
    memberId: string | null,
    page = 1,
    limit = 20,
    orgId: string,
  ) {
    const task = await this.prisma.boardTask.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new NotFoundException(`Задача с ID ${taskId} не найдена`);
    }

    await this.checkMemberAccess(task.boardId, memberId, orgId);

    const skip = (page - 1) * limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.boardTaskComment.findMany({
        where: { taskId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          member: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      }),
      this.prisma.boardTaskComment.count({ where: { taskId } }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async update(
    taskId: string,
    id: string,
    dto: UpdateCommentDto,
    memberId: string | null,
    orgId: string,
  ): Promise<BoardTaskComment> {
    const comment = await this.prisma.boardTaskComment.findUnique({
      where: { id },
      include: { task: true },
    });

    if (!comment) {
      throw new NotFoundException(`Комментарий с ID ${id} не найден`);
    }

    await this.checkMemberAccess(comment.task.boardId, memberId, orgId);

    // Organization может редактировать любые, Member только свои
    if (memberId && comment.memberId !== memberId) {
      throw new ForbiddenException(
        'Вы можете редактировать только свои комментарии',
      );
    }

    return this.prisma.boardTaskComment.update({
      where: { id },
      data: { content: dto.content },
      include: {
        member: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  }

  async delete(
    taskId: string,
    id: string,
    memberId: string | null,
    orgId: string,
  ): Promise<void> {
    const comment = await this.prisma.boardTaskComment.findUnique({
      where: { id },
      include: { task: true },
    });

    if (!comment) {
      throw new NotFoundException(`Комментарий с ID ${id} не найден`);
    }

    await this.checkMemberAccess(comment.task.boardId, memberId, orgId);

    // Organization имеет полный доступ
    if (!memberId) {
      await this.prisma.boardTaskComment.delete({ where: { id } });
      return;
    }

    // Автор или админ доски может удалять
    const isOwnerOrAdmin = await this.boardsRepository.isOwnerOrAdmin(
      comment.task.boardId,
      memberId,
    );

    if (comment.memberId !== memberId && !isOwnerOrAdmin) {
      throw new ForbiddenException('Недостаточно прав для удаления');
    }

    await this.prisma.boardTaskComment.delete({ where: { id } });
  }

  /**
   * Проверяет доступ к доске
   * Organization (memberId = null) имеет полный доступ
   */
  private async checkMemberAccess(
    boardId: string,
    memberId: string | null,
    orgId: string,
  ): Promise<void> {
    const boardOrgId = await this.boardsRepository.getOrganizationId(boardId);
    if (!boardOrgId) {
      throw new NotFoundException('Доска не найдена');
    }
    if (boardOrgId !== orgId) {
      throw new ForbiddenException('У вас нет доступа к этой доске');
    }

    // Organization имеет полный доступ
    if (!memberId) return;

    const isMember = await this.boardsRepository.isMember(boardId, memberId);
    if (!isMember) {
      throw new ForbiddenException('У вас нет доступа к этой доске');
    }
  }
}
