import {
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserType } from '@prisma/client';
import { CurrentUser, Roles } from '../../common/decorators';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import type { ICurrentUser } from '../../common/interfaces';
import { SavedBlogPostsQueryDto } from '../blog/saved/dto';
import { SavedBlogPostsService } from '../blog/saved/saved-blog-posts.service';

@ApiTags('account-saved-blog-posts')
@Controller('account/me/saved-blog-posts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserType.USER)
@ApiBearerAuth()
export class AccountSavedBlogPostsController {
  constructor(private readonly savedBlogPostsService: SavedBlogPostsService) {}

  @Get()
  @ApiOperation({ summary: 'Получить сохранённые статьи' })
  @ApiResponse({ status: 200, description: 'Список сохранённых статей' })
  findAll(
    @Query() query: SavedBlogPostsQueryDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.savedBlogPostsService.findUserSaved(query, user);
  }

  @Post(':postId')
  @ApiOperation({ summary: 'Сохранить статью' })
  @ApiParam({ name: 'postId', description: 'ID статьи' })
  @ApiResponse({ status: 201, description: 'Статья сохранена' })
  @ApiResponse({ status: 409, description: 'Статья уже сохранена' })
  save(
    @Param('postId', ParseUUIDPipe) postId: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.savedBlogPostsService.save(postId, user);
  }

  @Delete(':postId')
  @ApiOperation({ summary: 'Удалить статью из сохранённых' })
  @ApiParam({ name: 'postId', description: 'ID статьи' })
  @ApiResponse({ status: 200, description: 'Статья удалена из сохранённых' })
  @ApiResponse({ status: 409, description: 'Статья не сохранена' })
  unsave(
    @Param('postId', ParseUUIDPipe) postId: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.savedBlogPostsService.unsave(postId, user);
  }

  @Get(':postId/check')
  @ApiOperation({ summary: 'Проверить, сохранена ли статья' })
  @ApiParam({ name: 'postId', description: 'ID статьи' })
  @ApiResponse({ status: 200, description: 'Статус сохранения' })
  checkSaved(
    @Param('postId', ParseUUIDPipe) postId: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.savedBlogPostsService.checkSaved(postId, user);
  }
}
