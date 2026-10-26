import { BoardWriteGateGuard } from '../board-write-gate.guard';
import {
  Controller,
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
import { ChecklistsService } from './checklists.service';
import {
  CreateChecklistDto,
  CreateChecklistItemDto,
  UpdateChecklistItemDto,
} from './dto';
import { JwtAuthGuard } from '../../../common/guards';
import { CurrentUser } from '../../../common/decorators';
import type { ICurrentUser } from '../../../common/interfaces';
import { resolveUserContext } from '../boards.utils';

@ApiTags('task-checklists')
@UseGuards(JwtAuthGuard, BoardWriteGateGuard)
@ApiBearerAuth()
@Controller()
export class ChecklistsController {
  constructor(private readonly checklistsService: ChecklistsService) {}

  @Post('tasks/:taskId/checklists')
  @ApiOperation({ summary: 'Создать чеклист' })
  @ApiResponse({ status: 201, description: 'Чеклист создан' })
  async createChecklist(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() dto: CreateChecklistDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    const ctx = resolveUserContext(user);
    return this.checklistsService.createChecklist(
      taskId,
      dto,
      ctx.memberId,
      ctx.orgId,
    );
  }

  @Patch('tasks/:taskId/checklists/:checklistId')
  @ApiOperation({ summary: 'Обновить чеклист' })
  @ApiResponse({ status: 200, description: 'Чеклист обновлён' })
  async updateChecklist(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Param('checklistId', ParseUUIDPipe) checklistId: string,
    @Body() dto: CreateChecklistDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    const ctx = resolveUserContext(user);
    return this.checklistsService.updateChecklist(
      taskId,
      checklistId,
      dto,
      ctx.memberId,
      ctx.orgId,
    );
  }

  @Delete('tasks/:taskId/checklists/:checklistId')
  @ApiOperation({ summary: 'Удалить чеклист' })
  @ApiResponse({ status: 200, description: 'Чеклист удалён' })
  async deleteChecklist(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Param('checklistId', ParseUUIDPipe) checklistId: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    const ctx = resolveUserContext(user);
    await this.checklistsService.deleteChecklist(
      taskId,
      checklistId,
      ctx.memberId,
      ctx.orgId,
    );
    return { message: 'Чеклист удалён' };
  }

  @Post('checklists/:checklistId/items')
  @ApiOperation({ summary: 'Добавить пункт в чеклист' })
  @ApiResponse({ status: 201, description: 'Пункт добавлен' })
  async addItem(
    @Param('checklistId', ParseUUIDPipe) checklistId: string,
    @Body() dto: CreateChecklistItemDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    const ctx = resolveUserContext(user);
    return this.checklistsService.addItem(
      checklistId,
      dto,
      ctx.memberId,
      ctx.orgId,
    );
  }

  @Patch('checklists/:checklistId/items/:itemId')
  @ApiOperation({ summary: 'Обновить пункт чеклиста' })
  @ApiResponse({ status: 200, description: 'Пункт обновлён' })
  async updateItem(
    @Param('checklistId', ParseUUIDPipe) checklistId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: UpdateChecklistItemDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    const ctx = resolveUserContext(user);
    return this.checklistsService.updateItem(
      checklistId,
      itemId,
      dto,
      ctx.memberId,
      ctx.orgId,
    );
  }

  @Delete('checklists/:checklistId/items/:itemId')
  @ApiOperation({ summary: 'Удалить пункт чеклиста' })
  @ApiResponse({ status: 200, description: 'Пункт удалён' })
  async deleteItem(
    @Param('checklistId', ParseUUIDPipe) checklistId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    const ctx = resolveUserContext(user);
    await this.checklistsService.deleteItem(
      checklistId,
      itemId,
      ctx.memberId,
      ctx.orgId,
    );
    return { message: 'Пункт удалён' };
  }
}
