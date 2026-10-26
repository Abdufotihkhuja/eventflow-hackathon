import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, Board } from '@prisma/client';
import { BoardQueryDto } from './dto';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface BoardWithDetails extends Board {
  _count: {
    tasks: number;
    members: number;
  };
  columns: {
    id: string;
    name: string;
    position: number;
    _count: {
      tasks: number;
    };
  }[];
}

@Injectable()
export class BoardsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.BoardCreateInput): Promise<Board> {
    return this.prisma.board.create({ data });
  }

  async findById(id: string): Promise<BoardWithDetails | null> {
    return this.prisma.board.findUnique({
      where: { id },
      include: {
        columns: {
          orderBy: { position: 'asc' },
          include: {
            _count: { select: { tasks: true } },
          },
        },
        _count: {
          select: { tasks: true, members: true },
        },
      },
    }) as Promise<BoardWithDetails | null>;
  }

  async findByIdWithTasks(id: string) {
    return this.prisma.board.findUnique({
      where: { id },
      include: {
        columns: {
          orderBy: { position: 'asc' },
          include: {
            tasks: {
              orderBy: { position: 'asc' },
              include: {
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
                tags: {
                  include: {
                    tag: true,
                  },
                },
                _count: {
                  select: {
                    comments: true,
                    attachments: true,
                    checklists: true,
                  },
                },
              },
            },
          },
        },
        tags: true,
        members: {
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
        event: {
          select: {
            id: true,
            title: true,
          },
        },
        _count: {
          select: { tasks: true, members: true },
        },
      },
    });
  }

  async findMany(
    organizationId: string,
    params: BoardQueryDto,
  ): Promise<PaginatedResult<BoardWithDetails>> {
    const {
      page = 1,
      limit = 10,
      search,
      eventId,
      isArchived,
      isFavorite,
    } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.BoardWhereInput = {
      organizationId,
      isArchived: isArchived ?? false,
      ...(isFavorite !== undefined && { isFavorite }),
      ...(eventId && { eventId }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.board.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ isFavorite: 'desc' }, { updatedAt: 'desc' }],
        include: {
          columns: {
            orderBy: { position: 'asc' },
            include: {
              _count: { select: { tasks: true } },
            },
          },
          _count: {
            select: { tasks: true, members: true },
          },
        },
      }),
      this.prisma.board.count({ where }),
    ]);

    return {
      data: data as BoardWithDetails[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async update(id: string, data: Prisma.BoardUpdateInput): Promise<Board> {
    return this.prisma.board.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.board.delete({ where: { id } });
  }

  async archive(id: string): Promise<Board> {
    return this.prisma.board.update({
      where: { id },
      data: { isArchived: true },
    });
  }

  async toggleFavorite(id: string, isFavorite: boolean): Promise<Board> {
    return this.prisma.board.update({
      where: { id },
      data: { isFavorite },
    });
  }

  /**
   * Возвращает organizationId доски (или null, если доски нет). Лёгкий запрос
   * для проверки принадлежности доски организации вызывающего (мультитенантная
   * изоляция) без загрузки колонок/счётчиков.
   */
  async getOrganizationId(boardId: string): Promise<string | null> {
    const board = await this.prisma.board.findUnique({
      where: { id: boardId },
      select: { organizationId: true },
    });
    return board?.organizationId ?? null;
  }

  async isMember(boardId: string, memberId: string): Promise<boolean> {
    const member = await this.prisma.boardMember.findUnique({
      where: {
        boardId_memberId: { boardId, memberId },
      },
    });
    return !!member;
  }

  async isOwnerOrAdmin(boardId: string, memberId: string): Promise<boolean> {
    const member = await this.prisma.boardMember.findUnique({
      where: {
        boardId_memberId: { boardId, memberId },
      },
    });
    return member?.role === 'OWNER' || member?.role === 'ADMIN';
  }

  async getTaskStats(boardId: string) {
    const tasks = await this.prisma.boardTask.groupBy({
      by: ['columnId', 'isCompleted'],
      where: { boardId },
      _count: true,
    });

    const columns = await this.prisma.boardColumn.findMany({
      where: { boardId },
      select: { id: true, name: true, isDefault: true },
      orderBy: { position: 'asc' },
    });

    return {
      columns,
      tasksByColumn: tasks,
      totalTasks: tasks.reduce((sum, t) => sum + t._count, 0),
      completedTasks: tasks
        .filter((t) => t.isCompleted)
        .reduce((sum, t) => sum + t._count, 0),
    };
  }
}
