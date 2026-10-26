import { BoardWriteGateGuard } from '../board-write-gate.guard';
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { BoardMembersService } from './members.service';
import { AddBoardMemberDto, UpdateMemberRoleDto } from './dto';
import { JwtAuthGuard } from '../../../common/guards';
import { CurrentUser } from '../../../common/decorators';
import type { ICurrentUser } from '../../../common/interfaces';
import { resolveUserContext } from '../boards.utils';

@ApiTags('board-members')
@Controller('boards/:boardId/members')
@UseGuards(JwtAuthGuard, BoardWriteGateGuard)
@ApiBearerAuth()
export class BoardMembersController {
  constructor(private readonly membersService: BoardMembersService) {}

  @Post()
  @ApiOperation({ summary: 'Добавить участника в доску' })
  @ApiResponse({ status: 201, description: 'Участник добавлен' })
  async addMember(
    @Param('boardId', ParseUUIDPipe) boardId: string,
    @Body() dto: AddBoardMemberDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    const ctx = resolveUserContext(user);
    return this.membersService.addMember(
      boardId,
      dto,
      ctx.memberId,
      ctx.orgId,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Получить участников доски' })
  @ApiResponse({ status: 200, description: 'Список участников' })
  async findAll(
    @Param('boardId', ParseUUIDPipe) boardId: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    const ctx = resolveUserContext(user);
    return this.membersService.findByBoardId(boardId, ctx.memberId, ctx.orgId);
  }

  @Patch(':memberId')
  @ApiOperation({ summary: 'Изменить роль участника' })
  @ApiResponse({ status: 200, description: 'Роль изменена' })
  async updateRole(
    @Param('boardId', ParseUUIDPipe) boardId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Body() dto: UpdateMemberRoleDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    const ctx = resolveUserContext(user);
    return this.membersService.updateRole(
      boardId,
      memberId,
      dto,
      ctx.memberId,
      ctx.orgId,
    );
  }

  @Delete(':memberId')
  @ApiOperation({ summary: 'Удалить участника из доски' })
  @ApiResponse({ status: 200, description: 'Участник удалён' })
  async removeMember(
    @Param('boardId', ParseUUIDPipe) boardId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    const ctx = resolveUserContext(user);
    await this.membersService.removeMember(
      boardId,
      memberId,
      ctx.memberId,
      ctx.orgId,
    );
    return { message: 'Участник удалён' };
  }

  @Delete('leave')
  @ApiOperation({ summary: 'Покинуть доску' })
  @ApiResponse({ status: 200, description: 'Вы покинули доску' })
  async leaveBoard(
    @Param('boardId', ParseUUIDPipe) boardId: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    const ctx = resolveUserContext(user);
    await this.membersService.leaveBoard(boardId, ctx.memberId, ctx.orgId);
    return { message: 'Вы покинули доску' };
  }
}
