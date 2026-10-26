import { BoardWriteGateGuard } from './board-write-gate.guard';
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
import { BoardsService } from './boards.service';
import { CreateBoardDto, UpdateBoardDto, BoardQueryDto } from './dto';
import { JwtAuthGuard } from '../../common/guards';
import { CurrentUser } from '../../common/decorators';
import type { ICurrentUser } from '../../common/interfaces';
import { resolveUserContext } from './boards.utils';

@ApiTags('boards')
@Controller('boards')
@UseGuards(JwtAuthGuard, BoardWriteGateGuard)
@ApiBearerAuth()
export class BoardsController {
  constructor(private readonly boardsService: BoardsService) {}

  @Post()
  @ApiOperation({ summary: 'Создать доску' })
  @ApiResponse({ status: 201, description: 'Доска создана' })
  async create(@Body() dto: CreateBoardDto, @CurrentUser() user: ICurrentUser) {
    const { orgId, memberId } = resolveUserContext(user);
    return this.boardsService.create(dto, orgId, memberId);
  }

  @Get()
  @ApiOperation({ summary: 'Получить список досок организации' })
  @ApiResponse({ status: 200, description: 'Список досок' })
  async findAll(
    @Query() query: BoardQueryDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    const { orgId } = resolveUserContext(user);
    return this.boardsService.findMany(orgId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить доску с колонками и задачами' })
  @ApiResponse({ status: 200, description: 'Доска с данными' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    const { orgId, memberId } = resolveUserContext(user);
    return this.boardsService.findByIdWithTasks(id, memberId, orgId);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Получить статистику доски' })
  @ApiResponse({ status: 200, description: 'Статистика доски' })
  async getStats(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    const { orgId, memberId } = resolveUserContext(user);
    return this.boardsService.getStats(id, memberId, orgId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновить доску' })
  @ApiResponse({ status: 200, description: 'Доска обновлена' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBoardDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    const { orgId, memberId } = resolveUserContext(user);
    return this.boardsService.update(id, dto, memberId, orgId);
  }

  @Post(':id/favorite')
  @ApiOperation({ summary: 'Переключить статус избранного' })
  @ApiResponse({ status: 200, description: 'Статус изменён' })
  async toggleFavorite(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    const { orgId, memberId } = resolveUserContext(user);
    return this.boardsService.toggleFavorite(id, memberId, orgId);
  }

  @Post(':id/archive')
  @ApiOperation({ summary: 'Архивировать доску' })
  @ApiResponse({ status: 200, description: 'Доска архивирована' })
  async archive(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    const { orgId, memberId } = resolveUserContext(user);
    return this.boardsService.archive(id, memberId, orgId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить доску' })
  @ApiResponse({ status: 200, description: 'Доска удалена' })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    const { orgId, memberId } = resolveUserContext(user);
    await this.boardsService.delete(id, memberId, orgId);
    return { message: 'Доска удалена' };
  }
}
