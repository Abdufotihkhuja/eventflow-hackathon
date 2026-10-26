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
import { TagsService } from './tags.service';
import { CreateTagDto, UpdateTagDto } from './dto';
import { JwtAuthGuard } from '../../../common/guards';
import { CurrentUser } from '../../../common/decorators';
import type { ICurrentUser } from '../../../common/interfaces';
import { resolveUserContext } from '../boards.utils';

@ApiTags('board-tags')
@Controller('boards/:boardId/tags')
@UseGuards(JwtAuthGuard, BoardWriteGateGuard)
@ApiBearerAuth()
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Post()
  @ApiOperation({ summary: 'Создать тег' })
  @ApiResponse({ status: 201, description: 'Тег создан' })
  async create(
    @Param('boardId', ParseUUIDPipe) boardId: string,
    @Body() dto: CreateTagDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    const ctx = resolveUserContext(user);
    return this.tagsService.create(boardId, dto, ctx.memberId, ctx.orgId);
  }

  @Get()
  @ApiOperation({ summary: 'Получить теги доски' })
  @ApiResponse({ status: 200, description: 'Список тегов' })
  async findAll(@Param('boardId', ParseUUIDPipe) boardId: string) {
    return this.tagsService.findByBoardId(boardId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновить тег' })
  @ApiResponse({ status: 200, description: 'Тег обновлён' })
  async update(
    @Param('boardId', ParseUUIDPipe) boardId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTagDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    const ctx = resolveUserContext(user);
    return this.tagsService.update(boardId, id, dto, ctx.memberId, ctx.orgId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить тег' })
  @ApiResponse({ status: 200, description: 'Тег удалён' })
  async delete(
    @Param('boardId', ParseUUIDPipe) boardId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    const ctx = resolveUserContext(user);
    await this.tagsService.delete(boardId, id, ctx.memberId, ctx.orgId);
    return { message: 'Тег удалён' };
  }
}
