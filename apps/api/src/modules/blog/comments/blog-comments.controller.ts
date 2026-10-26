import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { BlogCommentsService } from './blog-comments.service';
import {
  CreateBlogCommentDto,
  UpdateBlogCommentDto,
  BlogCommentLikeDto,
  BlogCommentsQueryDto,
} from './dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import type { ICurrentUser } from '../../../common/interfaces';
import { UserType } from '@prisma/client';

@ApiTags('Blog Comments')
@Controller('blog/:postId/comments')
export class BlogCommentsController {
  constructor(private readonly commentsService: BlogCommentsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.USER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Создать комментарий' })
  @ApiParam({ name: 'postId', description: 'ID статьи' })
  @ApiResponse({ status: 201, description: 'Комментарий создан' })
  @ApiResponse({ status: 403, description: 'Комментарии отключены' })
  async create(
    @Param('postId', ParseUUIDPipe) postId: string,
    @Body() dto: CreateBlogCommentDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.commentsService.create(postId, dto, user);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Получить комментарии статьи' })
  @ApiParam({ name: 'postId', description: 'ID статьи' })
  @ApiResponse({ status: 200, description: 'Список комментариев' })
  async findAll(
    @Param('postId', ParseUUIDPipe) postId: string,
    @Query() query: BlogCommentsQueryDto,
    @CurrentUser() user?: ICurrentUser,
  ) {
    return this.commentsService.findByPost(postId, query, user);
  }

  @Patch(':commentId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.USER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Редактировать комментарий' })
  @ApiResponse({ status: 200, description: 'Комментарий обновлён' })
  @ApiResponse({ status: 403, description: 'Нет прав на редактирование' })
  async update(
    @Param('postId', ParseUUIDPipe) postId: string,
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @Body() dto: UpdateBlogCommentDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.commentsService.update(postId, commentId, dto, user);
  }

  @Delete(':commentId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.USER)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить комментарий' })
  @ApiResponse({ status: 204, description: 'Комментарий удалён' })
  @ApiResponse({ status: 403, description: 'Нет прав на удаление' })
  async delete(
    @Param('postId', ParseUUIDPipe) postId: string,
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    await this.commentsService.delete(postId, commentId, user);
  }

  @Post(':commentId/like')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.USER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Лайк/дизлайк комментария' })
  @ApiResponse({ status: 200, description: 'Реакция обновлена' })
  async toggleLike(
    @Param('postId', ParseUUIDPipe) postId: string,
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @Body() dto: BlogCommentLikeDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.commentsService.toggleLike(postId, commentId, dto.isLike, user);
  }
}
