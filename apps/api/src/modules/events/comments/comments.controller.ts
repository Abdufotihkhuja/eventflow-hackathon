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
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { CommentsService } from './comments.service';
import {
  CreateCommentDto,
  UpdateCommentDto,
  CommentQueryDto,
  ToggleLikeDto,
  CommentDto,
  PaginatedCommentsDto,
  CommentLikeCountsDto,
} from './dto';
import { JwtAuthGuard } from '../../../common/guards';
import { CurrentUser, Public } from '../../../common/decorators';
import type { ICurrentUser } from '../../../common/interfaces';

@ApiTags('event-comments')
@Controller('events/:eventId/comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Создать комментарий к мероприятию' })
  @ApiResponse({ status: 201, description: 'Комментарий создан', type: CommentDto })
  async create(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.commentsService.create(eventId, dto, user);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Получить комментарии к мероприятию' })
  @ApiResponse({
    status: 200,
    description: 'Список комментариев',
    type: PaginatedCommentsDto,
  })
  async findAll(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Query() query: CommentQueryDto,
    @CurrentUser() user?: ICurrentUser,
  ) {
    return this.commentsService.findByEventId(eventId, query, user?.sub);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Обновить комментарий' })
  @ApiResponse({ status: 200, description: 'Комментарий обновлён' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCommentDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.commentsService.update(id, dto, user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Удалить комментарий' })
  @ApiResponse({ status: 200, description: 'Комментарий удалён' })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    await this.commentsService.delete(id, user);
    return { message: 'Комментарий удалён' };
  }

  @Post(':id/like')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Поставить лайк/дизлайк на комментарий' })
  @ApiResponse({
    status: 200,
    description: 'Реакция обновлена',
    type: CommentLikeCountsDto,
  })
  async toggleLike(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ToggleLikeDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.commentsService.toggleLike(id, dto.isLike, user);
  }
}
