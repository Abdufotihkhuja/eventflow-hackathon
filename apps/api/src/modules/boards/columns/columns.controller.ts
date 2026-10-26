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
import { ColumnsService } from './columns.service';
import { CreateColumnDto, UpdateColumnDto, ReorderColumnsDto } from './dto';
import { JwtAuthGuard } from '../../../common/guards';
import { CurrentUser } from '../../../common/decorators';
import type { ICurrentUser } from '../../../common/interfaces';
import { resolveUserContext } from '../boards.utils';

@ApiTags('board-columns')
@Controller('boards/:boardId/columns')
@UseGuards(JwtAuthGuard, BoardWriteGateGuard)
@ApiBearerAuth()
export class ColumnsController {
  constructor(private readonly columnsService: ColumnsService) {}

  @Post()
  @ApiOperation({ summary: 'Создать колонку' })
  @ApiResponse({ status: 201, description: 'Колонка создана' })
  async create(
    @Param('boardId', ParseUUIDPipe) boardId: string,
    @Body() dto: CreateColumnDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    const ctx = resolveUserContext(user);
    return this.columnsService.create(boardId, dto, ctx.memberId, ctx.orgId);
  }

  @Get()
  @ApiOperation({ summary: 'Получить все колонки доски' })
  @ApiResponse({ status: 200, description: 'Список колонок' })
  async findAll(@Param('boardId', ParseUUIDPipe) boardId: string) {
    return this.columnsService.findByBoardId(boardId);
  }

  @Patch('reorder')
  @ApiOperation({ summary: 'Изменить порядок колонок' })
  @ApiResponse({ status: 200, description: 'Порядок изменён' })
  async reorder(
    @Param('boardId', ParseUUIDPipe) boardId: string,
    @Body() dto: ReorderColumnsDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    const ctx = resolveUserContext(user);
    return this.columnsService.reorder(boardId, dto, ctx.memberId, ctx.orgId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновить колонку' })
  @ApiResponse({ status: 200, description: 'Колонка обновлена' })
  async update(
    @Param('boardId', ParseUUIDPipe) boardId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateColumnDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    const ctx = resolveUserContext(user);
    return this.columnsService.update(boardId, id, dto, ctx.memberId, ctx.orgId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить колонку' })
  @ApiResponse({ status: 200, description: 'Колонка удалена' })
  async delete(
    @Param('boardId', ParseUUIDPipe) boardId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    const ctx = resolveUserContext(user);
    await this.columnsService.delete(boardId, id, ctx.memberId, ctx.orgId);
    return { message: 'Колонка удалена' };
  }
}
