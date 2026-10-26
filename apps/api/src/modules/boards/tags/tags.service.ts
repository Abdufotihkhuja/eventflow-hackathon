import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateTagDto, UpdateTagDto } from './dto';
import { BoardTag } from '@prisma/client';
import { BoardsRepository } from '../boards.repository';

@Injectable()
export class TagsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boardsRepository: BoardsRepository,
  ) {}

  async create(
    boardId: string,
    dto: CreateTagDto,
    memberId: string | null,
    orgId: string,
  ): Promise<BoardTag> {
    await this.checkEditAccess(boardId, memberId, orgId);

    // Проверяем уникальность имени
    const existing = await this.prisma.boardTag.findUnique({
      where: { boardId_name: { boardId, name: dto.name } },
    });

    if (existing) {
      throw new ConflictException(`Тег "${dto.name}" уже существует`);
    }

    return this.prisma.boardTag.create({
      data: {
        boardId,
        name: dto.name,
        color: dto.color,
      },
    });
  }

  async findByBoardId(boardId: string): Promise<BoardTag[]> {
    return this.prisma.boardTag.findMany({
      where: { boardId },
      orderBy: { name: 'asc' },
    });
  }

  async update(
    boardId: string,
    id: string,
    dto: UpdateTagDto,
    memberId: string | null,
    orgId: string,
  ): Promise<BoardTag> {
    await this.checkEditAccess(boardId, memberId, orgId);

    const tag = await this.prisma.boardTag.findUnique({ where: { id } });
    if (!tag) {
      throw new NotFoundException(`Тег с ID ${id} не найден`);
    }

    // Проверяем уникальность нового имени
    if (dto.name && dto.name !== tag.name) {
      const existing = await this.prisma.boardTag.findUnique({
        where: { boardId_name: { boardId, name: dto.name } },
      });
      if (existing) {
        throw new ConflictException(`Тег "${dto.name}" уже существует`);
      }
    }

    return this.prisma.boardTag.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.color && { color: dto.color }),
      },
    });
  }

  async delete(
    boardId: string,
    id: string,
    memberId: string | null,
    orgId: string,
  ): Promise<void> {
    await this.checkEditAccess(boardId, memberId, orgId);

    const tag = await this.prisma.boardTag.findUnique({ where: { id } });
    if (!tag) {
      throw new NotFoundException(`Тег с ID ${id} не найден`);
    }

    await this.prisma.boardTag.delete({ where: { id } });
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
      throw new ForbiddenException('Недостаточно прав');
    }
  }
}
