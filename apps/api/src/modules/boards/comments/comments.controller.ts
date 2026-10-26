import { BoardWriteGateGuard } from '../board-write-gate.guard';
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CommentsService } from './comments.service';
import { CreateCommentDto, UpdateCommentDto } from './dto';
import { JwtAuthGuard } from '../../../common/guards';
import { CurrentUser } from '../../../common/decorators';
import type { ICurrentUser } from '../../../common/interfaces';
import { resolveUserContext } from '../boards.utils';

@ApiTags('task-comments')
@Controller('tasks/:taskId/comments')
@UseGuards(JwtAuthGuard, BoardWriteGateGuard)
@ApiBearerAuth()
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  @ApiOperation({ summary: 'Добавить комментарий' })
  @ApiResponse({ status: 201, description: 'Комментарий добавлен' })
  async create(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    const ctx = resolveUserContext(user);
    return this.commentsService.create(taskId, dto, ctx.memberId, ctx.orgId);
  }

  @Get()
  @ApiOperation({ summary: 'Получить комментарии задачи' })
  @ApiResponse({ status: 200, description: 'Список комментариев' })
  async findAll(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @CurrentUser() user: ICurrentUser,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const ctx = resolveUserContext(user);
    return this.commentsService.findByTaskId(
      taskId,
      ctx.memberId,
      page,
      limit,
      ctx.orgId,
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Редактировать комментарий' })
  @ApiResponse({ status: 200, description: 'Комментарий обновлён' })
  async update(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCommentDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    const ctx = resolveUserContext(user);
    return this.commentsService.update(taskId, id, dto, ctx.memberId, ctx.orgId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить комментарий' })
  @ApiResponse({ status: 200, description: 'Комментарий удалён' })
  async delete(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    const ctx = resolveUserContext(user);
    await this.commentsService.delete(taskId, id, ctx.memberId, ctx.orgId);
    return { message: 'Комментарий удалён' };
  }
}
