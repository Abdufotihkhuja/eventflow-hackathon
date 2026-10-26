import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateColumnDto, UpdateColumnDto, ReorderColumnsDto } from './dto';
import { BoardColumn } from '@prisma/client';
import { BoardsRepository } from '../boards.repository';

@Injectable()
export class ColumnsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boardsRepository: BoardsRepository,
  ) {}

  /**
   * Создаёт новую колонку в доске
   */
  async create(
    boardId: string,
    dto: CreateColumnDto,
    memberId: string | null,
    orgId: string,
  ): Promise<BoardColumn> {
    await this.checkEditAccess(boardId, memberId, orgId);

    // Получаем максимальную позицию
    const lastColumn = await this.prisma.boardColumn.findFirst({
      where: { boardId },
      orderBy: { position: 'desc' },
    });

    const position = lastColumn ? lastColumn.position + 1 : 0;

    return this.prisma.boardColumn.create({
      data: {
        boardId,
        name: dto.name,
        color: dto.color,
        wipLimit: dto.wipLimit,
        isDefault: dto.isDefault ?? false,
        position,
      },
    });
  }

  /**
   * Получает колонку по ID
   */
  async findById(id: string): Promise<BoardColumn> {
    const column = await this.prisma.boardColumn.findUnique({
      where: { id },
    });

    if (!column) {
      throw new NotFoundException(`Колонка с ID ${id} не найдена`);
    }

    return column;
  }

  /**
   * Получает все колонки доски
   */
  async findByBoardId(boardId: string): Promise<BoardColumn[]> {
    return this.prisma.boardColumn.findMany({
      where: { boardId },
      orderBy: { position: 'asc' },
      include: {
        _count: { select: { tasks: true } },
      },
    });
  }

  /**
   * Обновляет колонку
   */
  async update(
    boardId: string,
    id: string,
    dto: UpdateColumnDto,
    memberId: string | null,
    orgId: string,
  ): Promise<BoardColumn> {
    await this.checkEditAccess(boardId, memberId, orgId);
    await this.findById(id);

    return this.prisma.boardColumn.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.color !== undefined && { color: dto.color }),
        ...(dto.wipLimit !== undefined && { wipLimit: dto.wipLimit }),
        ...(dto.isDefault !== undefined && { isDefault: dto.isDefault }),
      },
    });
  }

  /**
   * Удаляет колонку (задачи перемещаются в первую колонку)
   */
  async delete(
    boardId: string,
    id: string,
    memberId: string | null,
    orgId: string,
  ): Promise<void> {
    await this.checkEditAccess(boardId, memberId, orgId);
    const column = await this.findById(id);

    // Проверяем, что это не единственная колонка
    const columnsCount = await this.prisma.boardColumn.count({
      where: { boardId },
    });

    if (columnsCount <= 1) {
      throw new BadRequestException('Нельзя удалить единственную колонку');
    }

    // Находим первую колонку для перемещения задач
    const firstColumn = await this.prisma.boardColumn.findFirst({
      where: { boardId, id: { not: id } },
      orderBy: { position: 'asc' },
    });

    await this.prisma.$transaction(async (tx) => {
      // Перемещаем задачи в первую колонку
      if (firstColumn) {
        await tx.boardTask.updateMany({
          where: { columnId: id },
          data: { columnId: firstColumn.id },
        });
      }

      // Удаляем колонку
      await tx.boardColumn.delete({ where: { id } });

      // Обновляем позиции оставшихся колонок
      await tx.boardColumn.updateMany({
        where: { boardId, position: { gt: column.position } },
        data: { position: { decrement: 1 } },
      });
    });
  }

  /**
   * Изменяет порядок колонок
   */
  async reorder(
    boardId: string,
    dto: ReorderColumnsDto,
    memberId: string | null,
    orgId: string,
  ): Promise<BoardColumn[]> {
    await this.checkEditAccess(boardId, memberId, orgId);

    // Проверяем что все колонки принадлежат доске
    const columns = await this.prisma.boardColumn.findMany({
      where: { boardId },
    });

    const columnIds = columns.map((c) => c.id);
    const allBelong = dto.columnIds.every((id) => columnIds.includes(id));

    if (!allBelong || dto.columnIds.length !== columnIds.length) {
      throw new BadRequestException('Некорректный список колонок');
    }

    // Обновляем позиции в транзакции
    await this.prisma.$transaction(
      dto.columnIds.map((id, index) =>
        this.prisma.boardColumn.update({
          where: { id },
          data: { position: index },
        }),
      ),
    );

    return this.findByBoardId(boardId);
  }

  /**
   * Проверяет право на редактирование
   * Organization (memberId = null) имеет полный доступ
   */
  private async checkEditAccess(
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

    const hasAccess = await this.boardsRepository.isOwnerOrAdmin(
      boardId,
      memberId,
    );
    if (!hasAccess) {
      throw new ForbiddenException('Недостаточно прав для редактирования');
    }
  }
}
