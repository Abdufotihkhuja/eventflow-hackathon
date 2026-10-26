import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { BoardsRepository } from '../boards.repository';

@Injectable()
export class ActivitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boardsRepository: BoardsRepository,
  ) {}

  async findByTaskId(
    taskId: string,
    memberId: string | null,
    page = 1,
    limit = 50,
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
      this.prisma.boardTaskActivity.findMany({
        where: { taskId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          member: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      }),
      this.prisma.boardTaskActivity.count({ where: { taskId } }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findByBoardId(
    boardId: string,
    memberId: string | null,
    page = 1,
    limit = 50,
    orgId: string,
  ) {
    await this.checkMemberAccess(boardId, memberId, orgId);

    const skip = (page - 1) * limit;

    // Получаем все задачи доски
    const taskIds = await this.prisma.boardTask.findMany({
      where: { boardId },
      select: { id: true },
    });

    const ids = taskIds.map((t) => t.id);

    const [data, total] = await this.prisma.$transaction([
      this.prisma.boardTaskActivity.findMany({
        where: { taskId: { in: ids } },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          member: {
            select: { id: true, firstName: true, lastName: true },
          },
          task: {
            select: { id: true, title: true },
          },
        },
      }),
      this.prisma.boardTaskActivity.count({
        where: { taskId: { in: ids } },
      }),
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
