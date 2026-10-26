import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreateChecklistDto,
  CreateChecklistItemDto,
  UpdateChecklistItemDto,
} from './dto';
import {
  BoardTaskChecklist,
  BoardChecklistItem,
  ActivityType,
} from '@prisma/client';
import { BoardsRepository } from '../boards.repository';

@Injectable()
export class ChecklistsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boardsRepository: BoardsRepository,
  ) {}

  async createChecklist(
    taskId: string,
    dto: CreateChecklistDto,
    memberId: string | null,
    orgId: string,
  ): Promise<BoardTaskChecklist> {
    const task = await this.getTask(taskId);
    await this.checkMemberAccess(task.boardId, memberId, orgId);

    const lastChecklist = await this.prisma.boardTaskChecklist.findFirst({
      where: { taskId },
      orderBy: { position: 'desc' },
    });

    const checklist = await this.prisma.$transaction(async (tx) => {
      const newChecklist = await tx.boardTaskChecklist.create({
        data: {
          taskId,
          title: dto.title,
          position: lastChecklist ? lastChecklist.position + 1 : 0,
        },
        include: { items: true },
      });

      await tx.boardTaskActivity.create({
        data: {
          taskId,
          memberId,
          type: ActivityType.CHECKLIST_ADDED,
          details: { checklistId: newChecklist.id, title: dto.title },
        },
      });

      return newChecklist;
    });

    return checklist;
  }

  async updateChecklist(
    taskId: string,
    checklistId: string,
    dto: CreateChecklistDto,
    memberId: string | null,
    orgId: string,
  ): Promise<BoardTaskChecklist> {
    const task = await this.getTask(taskId);
    await this.checkMemberAccess(task.boardId, memberId, orgId);

    return this.prisma.boardTaskChecklist.update({
      where: { id: checklistId },
      data: { title: dto.title },
      include: { items: { orderBy: { position: 'asc' } } },
    });
  }

  async deleteChecklist(
    taskId: string,
    checklistId: string,
    memberId: string | null,
    orgId: string,
  ): Promise<void> {
    const task = await this.getTask(taskId);
    await this.checkMemberAccess(task.boardId, memberId, orgId);

    await this.prisma.boardTaskChecklist.delete({
      where: { id: checklistId },
    });
  }

  async addItem(
    checklistId: string,
    dto: CreateChecklistItemDto,
    memberId: string | null,
    orgId: string,
  ): Promise<BoardChecklistItem> {
    const checklist = await this.prisma.boardTaskChecklist.findUnique({
      where: { id: checklistId },
      include: { task: true },
    });

    if (!checklist) {
      throw new NotFoundException('Чеклист не найден');
    }

    await this.checkMemberAccess(checklist.task.boardId, memberId, orgId);

    const lastItem = await this.prisma.boardChecklistItem.findFirst({
      where: { checklistId },
      orderBy: { position: 'desc' },
    });

    return this.prisma.boardChecklistItem.create({
      data: {
        checklistId,
        title: dto.title,
        position: lastItem ? lastItem.position + 1 : 0,
      },
    });
  }

  async updateItem(
    checklistId: string,
    itemId: string,
    dto: UpdateChecklistItemDto,
    memberId: string | null,
    orgId: string,
  ): Promise<BoardChecklistItem> {
    const checklist = await this.prisma.boardTaskChecklist.findUnique({
      where: { id: checklistId },
      include: { task: true },
    });

    if (!checklist) {
      throw new NotFoundException('Чеклист не найден');
    }

    await this.checkMemberAccess(checklist.task.boardId, memberId, orgId);

    const updateData: {
      title?: string;
      isCompleted?: boolean;
      completedAt?: Date | null;
      completedById?: string | null;
    } = {};

    if (dto.title !== undefined) {
      updateData.title = dto.title;
    }

    if (dto.isCompleted !== undefined) {
      updateData.isCompleted = dto.isCompleted;
      updateData.completedAt = dto.isCompleted ? new Date() : null;
      updateData.completedById = dto.isCompleted ? memberId : null;
    }

    const item = await this.prisma.$transaction(async (tx) => {
      const updatedItem = await tx.boardChecklistItem.update({
        where: { id: itemId },
        data: updateData,
      });

      if (dto.isCompleted !== undefined) {
        await tx.boardTaskActivity.create({
          data: {
            taskId: checklist.taskId,
            memberId,
            type: ActivityType.CHECKLIST_UPDATED,
            details: {
              itemId,
              isCompleted: dto.isCompleted,
            },
          },
        });
      }

      return updatedItem;
    });

    return item;
  }

  async deleteItem(
    checklistId: string,
    itemId: string,
    memberId: string | null,
    orgId: string,
  ): Promise<void> {
    const checklist = await this.prisma.boardTaskChecklist.findUnique({
      where: { id: checklistId },
      include: { task: true },
    });

    if (!checklist) {
      throw new NotFoundException('Чеклист не найден');
    }

    await this.checkMemberAccess(checklist.task.boardId, memberId, orgId);

    await this.prisma.boardChecklistItem.delete({
      where: { id: itemId },
    });
  }

  private async getTask(taskId: string) {
    const task = await this.prisma.boardTask.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new NotFoundException(`Задача с ID ${taskId} не найдена`);
    }

    return task;
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
