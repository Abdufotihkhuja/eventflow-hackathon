import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { BlogLikesService } from './blog-likes.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { ICurrentUser } from '../../../common/interfaces';
import { UserType } from '@prisma/client';

@ApiTags('Blog Likes')
@Controller('blog/:postId/like')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserType.USER)
@ApiBearerAuth()
export class BlogLikesController {
  constructor(private readonly likesService: BlogLikesService) {}

  @Post()
  @ApiOperation({ summary: 'Поставить лайк статье' })
  @ApiParam({ name: 'postId', description: 'ID статьи' })
  @ApiResponse({ status: 201, description: 'Лайк поставлен' })
  @ApiResponse({ status: 409, description: 'Статья уже лайкнута' })
  async like(
    @Param('postId', ParseUUIDPipe) postId: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.likesService.like(postId, user);
  }

  @Delete()
  @ApiOperation({ summary: 'Убрать лайк со статьи' })
  @ApiParam({ name: 'postId', description: 'ID статьи' })
  @ApiResponse({ status: 200, description: 'Лайк убран' })
  @ApiResponse({ status: 409, description: 'Статья не лайкнута' })
  async unlike(
    @Param('postId', ParseUUIDPipe) postId: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.likesService.unlike(postId, user);
  }

  @Get('check')
  @ApiOperation({ summary: 'Проверить, лайкнул ли пользователь статью' })
  @ApiParam({ name: 'postId', description: 'ID статьи' })
  @ApiResponse({ status: 200, description: 'Статус лайка' })
  async checkLiked(
    @Param('postId', ParseUUIDPipe) postId: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.likesService.checkLiked(postId, user);
  }
}
