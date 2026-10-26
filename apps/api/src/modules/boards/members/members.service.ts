import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AddBoardMemberDto, UpdateMemberRoleDto } from './dto';
import { BoardMember, BoardRole } from '@prisma/client';
import { BoardsRepository } from '../boards.repository';

@Injectable()
export class BoardMembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boardsRepository: BoardsRepository,
  ) {}

  async addMember(
    boardId: string,
    dto: AddBoardMemberDto,
    addedById: string | null,
    orgId: string,
  ): Promise<BoardMember> {
    await this.checkAdminAccess(boardId, addedById, orgId);

    // Проверяем что участник принадлежит той же организации
    const board = await this.prisma.board.findUnique({
      where: { id: boardId },
    });

    if (!board) {
      throw new NotFoundException('Доска не найдена');
    }

    const member = await this.prisma.organizationMember.findFirst({
      where: {
        id: dto.memberId,
        organizationId: board.organizationId,
      },
    });

    if (!member) {
      throw new NotFoundException('Участник не найден в организации');
    }

    // Проверяем что участник ещё не добавлен
    const existing = await this.prisma.boardMember.findUnique({
      where: {
        boardId_memberId: { boardId, memberId: dto.memberId },
      },
    });

    if (existing) {
      throw new ConflictException('Участник уже добавлен в доску');
    }

    return this.prisma.boardMember.create({
      data: {
        boardId,
        memberId: dto.memberId,
        role: dto.role ?? BoardRole.MEMBER,
        addedById: addedById ?? undefined,
      },
      include: {
        member: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  }

  async findByBoardId(
    boardId: string,
    memberId: string | null,
    orgId: string,
  ) {
    await this.checkMemberAccess(boardId, memberId, orgId);

    return this.prisma.boardMember.findMany({
      where: { boardId },
      include: {
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            position: true,
          },
        },
      },
      orderBy: [
        { role: 'asc' }, // OWNER first
        { addedAt: 'asc' },
      ],
    });
  }

  async updateRole(
    boardId: string,
    memberId: string,
    dto: UpdateMemberRoleDto,
    updatedById: string | null,
    orgId: string,
  ): Promise<BoardMember> {
    await this.checkAdminAccess(boardId, updatedById, orgId);

    const boardMember = await this.prisma.boardMember.findUnique({
      where: {
        boardId_memberId: { boardId, memberId },
      },
    });

    if (!boardMember) {
      throw new NotFoundException('Участник не найден в доске');
    }

    // Нельзя изменить роль OWNER
    if (boardMember.role === BoardRole.OWNER) {
      throw new ForbiddenException('Нельзя изменить роль владельца');
    }

    // Нельзя назначить OWNER
    if (dto.role === BoardRole.OWNER) {
      throw new BadRequestException('Нельзя назначить роль владельца');
    }

    return this.prisma.boardMember.update({
      where: {
        boardId_memberId: { boardId, memberId },
      },
      data: { role: dto.role },
      include: {
        member: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  }

  async removeMember(
    boardId: string,
    memberId: string,
    removedById: string | null,
    orgId: string,
  ): Promise<void> {
    await this.checkAdminAccess(boardId, removedById, orgId);

    const boardMember = await this.prisma.boardMember.findUnique({
      where: {
        boardId_memberId: { boardId, memberId },
      },
    });

    if (!boardMember) {
      throw new NotFoundException('Участник не найден в доске');
    }

    // Нельзя удалить OWNER
    if (boardMember.role === BoardRole.OWNER) {
      throw new ForbiddenException('Нельзя удалить владельца доски');
    }

    await this.prisma.boardMember.delete({
      where: {
        boardId_memberId: { boardId, memberId },
      },
    });
  }

  async leaveBoard(
    boardId: string,
    memberId: string | null,
    orgId: string,
  ): Promise<void> {
    // Organization не может покинуть доску - это действие только для Members
    if (!memberId) {
      throw new ForbiddenException('Организация не может покинуть доску');
    }

    const boardMember = await this.prisma.boardMember.findUnique({
      where: {
        boardId_memberId: { boardId, memberId },
      },
    });

    if (!boardMember) {
      throw new NotFoundException('Вы не являетесь участником доски');
    }

    // OWNER не может покинуть доску
    if (boardMember.role === BoardRole.OWNER) {
      throw new ForbiddenException(
        'Владелец не может покинуть доску. Передайте права или удалите доску.',
      );
    }

    await this.prisma.boardMember.delete({
      where: {
        boardId_memberId: { boardId, memberId },
      },
    });
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

  /**
   * Проверяет админский доступ к доске
   * Organization (memberId = null) имеет полный доступ
   */
  private async checkAdminAccess(
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
