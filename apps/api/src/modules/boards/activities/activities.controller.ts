import { BoardWriteGateGuard } from '../board-write-gate.guard';
import {
  Controller,
  Get,
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
import { ActivitiesService } from './activities.service';
import { JwtAuthGuard } from '../../../common/guards';
import { CurrentUser } from '../../../common/decorators';
import type { ICurrentUser } from '../../../common/interfaces';
import { resolveUserContext } from '../boards.utils';

@ApiTags('activities')
@UseGuards(JwtAuthGuard, BoardWriteGateGuard)
@ApiBearerAuth()
@Controller()
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Get('tasks/:taskId/activities')
  @ApiOperation({ summary: 'Получить историю изменений задачи' })
  @ApiResponse({ status: 200, description: 'История изменений' })
  async findByTask(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @CurrentUser() user: ICurrentUser,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const ctx = resolveUserContext(user);
    return this.activitiesService.findByTaskId(
      taskId,
      ctx.memberId,
      page,
      limit,
      ctx.orgId,
    );
  }

  @Get('boards/:boardId/activities')
  @ApiOperation({ summary: 'Получить историю изменений доски' })
  @ApiResponse({ status: 200, description: 'История изменений доски' })
  async findByBoard(
    @Param('boardId', ParseUUIDPipe) boardId: string,
    @CurrentUser() user: ICurrentUser,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const ctx = resolveUserContext(user);
    return this.activitiesService.findByBoardId(
      boardId,
      ctx.memberId,
      page,
      limit,
      ctx.orgId,
    );
  }
}
