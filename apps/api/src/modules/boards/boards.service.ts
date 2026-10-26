import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import {
  BoardsRepository,
  BoardWithDetails,
  PaginatedResult,
} from './boards.repository';
import { CreateBoardDto, UpdateBoardDto, BoardQueryDto } from './dto';
import { Board, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BoardsService {
  private readonly logger = new Logger(BoardsService.name);

  constructor(
    private readonly boardsRepository: BoardsRepository,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Создаёт новую доску с дефолтными колонками
   * @param dto - данные доски
   * @param organizationId - ID организации
   * @param memberId - ID сотрудника (null если создаёт Organization)
   */
  async create(
    dto: CreateBoardDto,
    organizationId: string,
    memberId: string | null,
  ): Promise<Board> {
    // Создаём доску с дефолтными колонками в транзакции
    const board = await this.prisma.$transaction(async (tx) => {
      const newBoard = await tx.board.create({
        data: {
          name: dto.name,
          description: dto.description,
          coverImage: dto.coverImage,
          backgroundColor: dto.backgroundColor,
          settings: dto.settings
            ? JSON.parse(JSON.stringify(dto.settings))
            : {},
          organizationId,
          eventId: dto.eventId,
          createdById: memberId, // null если создано организацией
        },
      });

      // Создаём дефолтные колонки
      const defaultColumns = [
        { name: 'Бэклог', position: 0, color: '#6B7280' },
        { name: 'К выполнению', position: 1, color: '#F59E0B' },
        { name: 'В работе', position: 2, color: '#3B82F6' },
        { name: 'На проверке', position: 3, color: '#8B5CF6' },
        { name: 'Готово', position: 4, color: '#10B981', isDefault: true },
      ];

      await tx.boardColumn.createMany({
        data: defaultColumns.map((col) => ({
          boardId: newBoard.id,
          ...col,
        })),
      });

      // Добавляем создателя как OWNER доски (только для Member)
      if (memberId) {
        await tx.boardMember.create({
          data: {
            boardId: newBoard.id,
            memberId,
            role: 'OWNER',
            addedById: memberId,
          },
        });
      }

      return newBoard;
    });

    this.logger.log(
      `Board created: ${board.id} by ${memberId ? `member ${memberId}` : 'organization'}`,
    );
    return board;
  }

  /**
   * Получает доску по ID
   * @throws NotFoundException если доска не найдена
   */
  async findById(
    id: string,
    organizationId: string,
  ): Promise<BoardWithDetails> {
    const board = await this.boardsRepository.findById(id);
    // Tenant-скоуп (E-5, PC-9/B-10): чужая доска неотличима от несуществующей.
    if (!board || board.organizationId !== organizationId) {
      throw new NotFoundException(`Доска с ID ${id} не найдена`);
    }
    return board;
  }

  /**
   * Получает доску с полными данными (колонки, задачи, участники)
   * @param memberId - null означает Organization (полный доступ)
   */
  async findByIdWithTasks(
    id: string,
    memberId: string | null,
    organizationId: string,
  ) {
    const board = await this.boardsRepository.findByIdWithTasks(id);
    if (!board || board.organizationId !== organizationId) {
      throw new NotFoundException(`Доска с ID ${id} не найдена`);
    }

    // Organization имеет полный доступ, для Member проверяем членство
    if (memberId) {
      const isMember = await this.boardsRepository.isMember(id, memberId);
      if (!isMember) {
        throw new ForbiddenException('У вас нет доступа к этой доске');
      }
    }

    return board;
  }

  /**
   * Получает список досок организации с пагинацией
   */
  async findMany(
    organizationId: string,
    query: BoardQueryDto,
  ): Promise<PaginatedResult<BoardWithDetails>> {
    return this.boardsRepository.findMany(organizationId, query);
  }

  /**
   * Обновляет доску
   * @throws NotFoundException если доска не найдена
   * @throws ForbiddenException если нет прав на редактирование
   */
  async update(
    id: string,
    dto: UpdateBoardDto,
    memberId: string | null,
    organizationId: string,
  ): Promise<Board> {
    await this.findById(id, organizationId);
    await this.checkEditAccess(id, memberId);

    const updateData: Prisma.BoardUpdateInput = {
      ...(dto.name && { name: dto.name }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.coverImage !== undefined && { coverImage: dto.coverImage }),
      ...(dto.backgroundColor !== undefined && {
        backgroundColor: dto.backgroundColor,
      }),

      ...(dto.settings !== undefined && {
        settings: JSON.parse(JSON.stringify(dto.settings)),
      }),
      ...(dto.isFavorite !== undefined && { isFavorite: dto.isFavorite }),
      ...(dto.isArchived !== undefined && { isArchived: dto.isArchived }),
    };

    return this.boardsRepository.update(id, updateData);
  }

  /**
   * Архивирует доску (soft delete)
   */
  async archive(
    id: string,
    memberId: string | null,
    organizationId: string,
  ): Promise<Board> {
    await this.findById(id, organizationId);
    await this.checkEditAccess(id, memberId);
    return this.boardsRepository.archive(id);
  }

  /**
   * Удаляет доску полностью
   */
  async delete(
    id: string,
    memberId: string | null,
    organizationId: string,
  ): Promise<void> {
    await this.findById(id, organizationId);

    // Organization имеет полный доступ, для Member проверяем владение
    if (memberId) {
      const isOwner = await this.prisma.boardMember.findFirst({
        where: { boardId: id, memberId, role: 'OWNER' },
      });

      if (!isOwner) {
        throw new ForbiddenException('Только владелец может удалить доску');
      }
    }

    await this.boardsRepository.delete(id);
    this.logger.log(
      `Board deleted: ${id} by ${memberId ? `member ${memberId}` : 'organization'}`,
    );
  }

  /**
   * Переключает статус избранного
   */
  async toggleFavorite(
    id: string,
    memberId: string | null,
    organizationId: string,
  ): Promise<Board> {
    const board = await this.findById(id, organizationId);
    await this.checkViewAccess(id, memberId);
    return this.boardsRepository.toggleFavorite(id, !board.isFavorite);
  }

  /**
   * Получает статистику доски
   */
  async getStats(id: string, memberId: string | null, organizationId: string) {
    await this.findById(id, organizationId);
    await this.checkViewAccess(id, memberId);
    return this.boardsRepository.getTaskStats(id);
  }

  /**
   * Проверяет право на редактирование доски
   * Organization (memberId = null) имеет полный доступ
   */
  private async checkEditAccess(
    boardId: string,
    memberId: string | null,
  ): Promise<void> {
    // Organization имеет полный доступ
    if (!memberId) return;

    const hasAccess = await this.boardsRepository.isOwnerOrAdmin(
      boardId,
      memberId,
    );
    if (!hasAccess) {
      throw new ForbiddenException(
        'Недостаточно прав для редактирования доски',
      );
    }
  }

  /**
   * Проверяет право на просмотр доски
   * Organization (memberId = null) имеет полный доступ
   */
  private async checkViewAccess(
    boardId: string,
    memberId: string | null,
  ): Promise<void> {
    // Organization имеет полный доступ
    if (!memberId) return;

    const isMember = await this.boardsRepository.isMember(boardId, memberId);
    if (!isMember) {
      throw new ForbiddenException('У вас нет доступа к этой доске');
    }
  }
}
