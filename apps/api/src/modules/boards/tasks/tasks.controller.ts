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
import { TasksService } from './tasks.service';
import {
  CreateTaskDto,
  UpdateTaskDto,
  MoveTaskDto,
  TaskQueryDto,
  AddAssigneesDto,
} from './dto';
import { JwtAuthGuard } from '../../../common/guards';
import { CurrentUser } from '../../../common/decorators';
import type { ICurrentUser } from '../../../common/interfaces';
import { resolveUserContext } from '../boards.utils';

@ApiTags('board-tasks')
@Controller('boards/:boardId/tasks')
@UseGuards(JwtAuthGuard, BoardWriteGateGuard)
@ApiBearerAuth()
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @ApiOperation({ summary: 'Создать задачу' })
  @ApiResponse({ status: 201, description: 'Задача создана' })
  async create(
    @Param('boardId', ParseUUIDPipe) boardId: string,
    @Body() dto: CreateTaskDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    const ctx = resolveUserContext(user);
    return this.tasksService.create(boardId, dto, ctx.memberId, ctx.orgId);
  }

  @Get()
  @ApiOperation({ summary: 'Получить задачи доски с фильтрами' })
  @ApiResponse({ status: 200, description: 'Список задач' })
  async findAll(
    @Param('boardId', ParseUUIDPipe) boardId: string,
    @Query() query: TaskQueryDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    const ctx = resolveUserContext(user);
    return this.tasksService.findMany(boardId, query, ctx.memberId, ctx.orgId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить задачу по ID' })
  @ApiResponse({ status: 200, description: 'Задача' })
  async findOne(
    @Param('boardId', ParseUUIDPipe) boardId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    const ctx = resolveUserContext(user);
    return this.tasksService.findById(boardId, id, ctx.memberId, ctx.orgId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновить задачу' })
  @ApiResponse({ status: 200, description: 'Задача обновлена' })
  async update(
    @Param('boardId', ParseUUIDPipe) boardId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTaskDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    const ctx = resolveUserContext(user);
    return this.tasksService.update(boardId, id, dto, ctx.memberId, ctx.orgId);
  }

  @Patch(':id/move')
  @ApiOperation({ summary: 'Переместить задачу' })
  @ApiResponse({ status: 200, description: 'Задача перемещена' })
  async move(
    @Param('boardId', ParseUUIDPipe) boardId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MoveTaskDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    const ctx = resolveUserContext(user);
    return this.tasksService.move(boardId, id, dto, ctx.memberId, ctx.orgId);
  }

  @Post(':id/assignees')
  @ApiOperation({ summary: 'Назначить исполнителей' })
  @ApiResponse({ status: 200, description: 'Исполнители назначены' })
  async addAssignees(
    @Param('boardId', ParseUUIDPipe) boardId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddAssigneesDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    const ctx = resolveUserContext(user);
    return this.tasksService.addAssignees(
      boardId,
      id,
      dto,
      ctx.memberId,
      ctx.orgId,
    );
  }

  @Delete(':id/assignees/:memberId')
  @ApiOperation({ summary: 'Удалить исполнителя' })
  @ApiResponse({ status: 200, description: 'Исполнитель удалён' })
  async removeAssignee(
    @Param('boardId', ParseUUIDPipe) boardId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    const ctx = resolveUserContext(user);
    return this.tasksService.removeAssignee(
      boardId,
      id,
      memberId,
      ctx.memberId,
      ctx.orgId,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить задачу' })
  @ApiResponse({ status: 200, description: 'Задача удалена' })
  async delete(
    @Param('boardId', ParseUUIDPipe) boardId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    const ctx = resolveUserContext(user);
    await this.tasksService.delete(boardId, id, ctx.memberId, ctx.orgId);
    return { message: 'Задача удалена' };
  }
}
