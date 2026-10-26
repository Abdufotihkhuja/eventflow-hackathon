import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreateTaskDto,
  UpdateTaskDto,
  MoveTaskDto,
  TaskQueryDto,
  AddAssigneesDto,
} from './dto';
import { BoardTask, Prisma, ActivityType } from '@prisma/client';
import { BoardsRepository } from '../boards.repository';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly boardsRepository: BoardsRepository,
  ) {}

  /**
   * Создаёт новую задачу
   * @param memberId - null для Organization (полный доступ)
   */
  async create(
    boardId: string,
    dto: CreateTaskDto,
    memberId: string | null,
    orgId: string,
  ): Promise<BoardTask> {
    await this.checkMemberAccess(boardId, memberId, orgId);

    // Получаем максимальную позицию в колонке
    const lastTask = await this.prisma.boardTask.findFirst({
      where: { columnId: dto.columnId },
      orderBy: { position: 'desc' },
    });

    const position = lastTask ? lastTask.position + 1 : 0;

    const task = await this.prisma.$transaction(async (tx) => {
      const newTask = await tx.boardTask.create({
        data: {
          boardId,
          columnId: dto.columnId,
          title: dto.title,
          description: dto.description,
          type: dto.type ?? 'TASK',
          priority: dto.priority ?? 'MEDIUM',
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
          startDate: dto.startDate ? new Date(dto.startDate) : null,
          estimatedHours: dto.estimatedHours,
          coverColor: dto.coverColor,
          position,
          createdById: memberId,
        },
      });

      // Добавляем теги
      if (dto.tagIds?.length) {
        await tx.boardTaskTag.createMany({
          data: dto.tagIds.map((tagId) => ({
            taskId: newTask.id,
            tagId,
          })),
        });
      }

      // Добавляем исполнителей
      if (dto.assigneeIds?.length) {
        await tx.boardTaskAssignee.createMany({
          data: dto.assigneeIds.map((assigneeId) => ({
            taskId: newTask.id,
            memberId: assigneeId,
            assignedById: memberId,
          })),
        });
      }

      // Логируем создание
      await tx.boardTaskActivity.create({
        data: {
          taskId: newTask.id,
          memberId,
          type: ActivityType.CREATED,
          details: { title: newTask.title },
        },
      });

      return newTask;
    });

    this.logger.log(`Task created: ${task.id} in board ${boardId}`);
    return this.findById(boardId, task.id, memberId, orgId);
  }

  /**
   * Получает задачу по ID с полными данными
   */
  async findById(
    boardId: string,
    id: string,
    memberId: string | null,
    orgId: string,
  ) {
    await this.checkMemberAccess(boardId, memberId, orgId);

    const task = await this.prisma.boardTask.findUnique({
      where: { id },
      include: {
        column: { select: { id: true, name: true } },
        assignees: {
          include: {
            member: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        tags: { include: { tag: true } },
        comments: {
          include: {
            member: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        attachments: {
          orderBy: { createdAt: 'desc' },
        },
        checklists: {
          include: {
            items: { orderBy: { position: 'asc' } },
          },
          orderBy: { position: 'asc' },
        },
        _count: {
          select: { comments: true, attachments: true },
        },
      },
    });

    if (!task) {
      throw new NotFoundException(`Задача с ID ${id} не найдена`);
    }

    return task;
  }

  /**
   * Получает задачи доски с фильтрами
   */
  async findMany(
    boardId: string,
    query: TaskQueryDto,
    memberId: string | null,
    orgId: string,
  ) {
    await this.checkMemberAccess(boardId, memberId, orgId);

    const where: Prisma.BoardTaskWhereInput = {
      boardId,
      ...(query.columnId && { columnId: query.columnId }),
      ...(query.type && { type: query.type }),
      ...(query.priority && { priority: query.priority }),
      ...(query.isCompleted !== undefined && {
        isCompleted: query.isCompleted,
      }),
      ...(query.assigneeId && {
        assignees: { some: { memberId: query.assigneeId } },
      }),
      ...(query.isOverdue && {
        dueDate: { lt: new Date() },
        isCompleted: false,
      }),
      ...(query.search && {
        OR: [
          { title: { contains: query.search, mode: 'insensitive' } },
          { description: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };

    return this.prisma.boardTask.findMany({
      where,
      orderBy: { position: 'asc' },
      include: {
        assignees: {
          include: {
            member: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
        tags: { include: { tag: true } },
        _count: {
          select: { comments: true, attachments: true, checklists: true },
        },
      },
    });
  }

  /**
   * Обновляет задачу
   */
  async update(
    boardId: string,
    id: string,
    dto: UpdateTaskDto,
    memberId: string | null,
    orgId: string,
  ): Promise<BoardTask> {
    await this.checkMemberAccess(boardId, memberId, orgId);
    await this.findById(boardId, id, memberId, orgId);

    const updateData: Prisma.BoardTaskUpdateInput = {
      ...(dto.title && { title: dto.title }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.type && { type: dto.type }),
      ...(dto.priority && { priority: dto.priority }),
      ...(dto.dueDate !== undefined && {
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      }),
      ...(dto.startDate !== undefined && {
        startDate: dto.startDate ? new Date(dto.startDate) : null,
      }),
      ...(dto.estimatedHours !== undefined && {
        estimatedHours: dto.estimatedHours,
      }),
      ...(dto.loggedHours !== undefined && { loggedHours: dto.loggedHours }),
      ...(dto.coverColor !== undefined && { coverColor: dto.coverColor }),
    };

    // Обработка isCompleted
    if (dto.isCompleted !== undefined) {
      updateData.isCompleted = dto.isCompleted;
      updateData.completedAt = dto.isCompleted ? new Date() : null;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.boardTask.update({
        where: { id },
        data: updateData,
      });

      // Обновляем теги если переданы
      if (dto.tagIds !== undefined) {
        await tx.boardTaskTag.deleteMany({ where: { taskId: id } });
        if (dto.tagIds.length) {
          await tx.boardTaskTag.createMany({
            data: dto.tagIds.map((tagId) => ({ taskId: id, tagId })),
          });
        }
      }

      // Логируем изменения
      await tx.boardTaskActivity.create({
        data: {
          taskId: id,
          memberId,
          type: ActivityType.UPDATED,
          details: JSON.parse(JSON.stringify({ changes: dto })),
        },
      });
    });

    return this.findById(boardId, id, memberId, orgId);
  }

  /**
   * Перемещает задачу между колонками / меняет позицию
   */
  async move(
    boardId: string,
    id: string,
    dto: MoveTaskDto,
    memberId: string | null,
    orgId: string,
  ): Promise<BoardTask> {
    await this.checkMemberAccess(boardId, memberId, orgId);
    const task = await this.findById(boardId, id, memberId, orgId);

    const oldColumnId = task.columnId;
    const newColumnId = dto.columnId;
    const newPosition = dto.position ?? 0;

    await this.prisma.$transaction(async (tx) => {
      // Если перемещаем в другую колонку
      if (oldColumnId !== newColumnId) {
        // Обновляем позиции в старой колонке
        await tx.boardTask.updateMany({
          where: {
            columnId: oldColumnId,
            position: { gt: task.position },
          },
          data: { position: { decrement: 1 } },
        });

        // Освобождаем место в новой колонке
        await tx.boardTask.updateMany({
          where: {
            columnId: newColumnId,
            position: { gte: newPosition },
          },
          data: { position: { increment: 1 } },
        });

        // Проверяем, является ли новая колонка "Готово"
        const targetColumn = await tx.boardColumn.findUnique({
          where: { id: newColumnId },
        });

        await tx.boardTask.update({
          where: { id },
          data: {
            columnId: newColumnId,
            position: newPosition,
            ...(targetColumn?.isDefault && {
              isCompleted: true,
              completedAt: new Date(),
            }),
          },
        });
      } else {
        // Перемещение внутри одной колонки
        const oldPosition = task.position;

        if (newPosition < oldPosition) {
          await tx.boardTask.updateMany({
            where: {
              columnId: oldColumnId,
              position: { gte: newPosition, lt: oldPosition },
            },
            data: { position: { increment: 1 } },
          });
        } else if (newPosition > oldPosition) {
          await tx.boardTask.updateMany({
            where: {
              columnId: oldColumnId,
              position: { gt: oldPosition, lte: newPosition },
            },
            data: { position: { decrement: 1 } },
          });
        }

        await tx.boardTask.update({
          where: { id },
          data: { position: newPosition },
        });
      }

      // Логируем перемещение
      await tx.boardTaskActivity.create({
        data: {
          taskId: id,
          memberId,
          type: ActivityType.MOVED,
          details: { fromColumnId: oldColumnId, toColumnId: newColumnId },
        },
      });
    });

    return this.findById(boardId, id, memberId, orgId);
  }

  /**
   * Назначает исполнителей на задачу
   */
  async addAssignees(
    boardId: string,
    taskId: string,
    dto: AddAssigneesDto,
    memberId: string | null,
    orgId: string,
  ) {
    await this.checkMemberAccess(boardId, memberId, orgId);
    await this.findById(boardId, taskId, memberId, orgId);

    await this.prisma.$transaction(async (tx) => {
      // Добавляем новых исполнителей (игнорируем дубликаты)
      for (const assigneeId of dto.memberIds) {
        await tx.boardTaskAssignee.upsert({
          where: {
            taskId_memberId: { taskId, memberId: assigneeId },
          },
          update: {},
          create: {
            taskId,
            memberId: assigneeId,
            assignedById: memberId,
          },
        });

        // Логируем назначение
        await tx.boardTaskActivity.create({
          data: {
            taskId,
            memberId,
            type: ActivityType.ASSIGNED,
            details: { assigneeId },
          },
        });
      }
    });

    return this.findById(boardId, taskId, memberId, orgId);
  }

  /**
   * Удаляет исполнителя с задачи
   */
  async removeAssignee(
    boardId: string,
    taskId: string,
    assigneeId: string,
    memberId: string | null,
    orgId: string,
  ) {
    await this.checkMemberAccess(boardId, memberId, orgId);

    await this.prisma.$transaction(async (tx) => {
      await tx.boardTaskAssignee.delete({
        where: {
          taskId_memberId: { taskId, memberId: assigneeId },
        },
      });

      await tx.boardTaskActivity.create({
        data: {
          taskId,
          memberId,
          type: ActivityType.UNASSIGNED,
          details: { assigneeId },
        },
      });
    });

    return this.findById(boardId, taskId, memberId, orgId);
  }

  /**
   * Удаляет задачу
   */
  async delete(
    boardId: string,
    id: string,
    memberId: string | null,
    orgId: string,
  ): Promise<void> {
    await this.checkMemberAccess(boardId, memberId, orgId);
    const task = await this.findById(boardId, id, memberId, orgId);

    await this.prisma.$transaction(async (tx) => {
      await tx.boardTask.delete({ where: { id } });

      // Обновляем позиции
      await tx.boardTask.updateMany({
        where: {
          columnId: task.columnId,
          position: { gt: task.position },
        },
        data: { position: { decrement: 1 } },
      });
    });

    this.logger.log(`Task deleted: ${id}`);
  }

  /**
   * Проверяет доступ к доске.
   * СНАЧАЛА сверяем принадлежность доски организации вызывающего (мультитенантная
   * изоляция): без этой проверки ORGANIZATION-аккаунт (memberId = null) получал
   * полный доступ к доскам ЛЮБОЙ организации по boardId (межтенантный IDOR).
   * Затем для MEMBER дополнительно требуем членство в доске.
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

    // Organization-владелец своей доски — полный доступ.
    if (!memberId) return;

    const isMember = await this.boardsRepository.isMember(boardId, memberId);
    if (!isMember) {
      throw new ForbiddenException('У вас нет доступа к этой доске');
    }
  }
}
