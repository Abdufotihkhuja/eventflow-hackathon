import {
  Controller,
  Get,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { BlogService } from './blog.service';
import { PublicBlogPostsQueryDto, BlogPostSortBy, SortOrder } from './dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { ICurrentUser } from '../../common/interfaces';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { PUBLIC_READ_THROTTLE } from '../../common/constants/rate-limit.constants';

/**
 * Публичный контроллер блога
 * Доступен без авторизации, показывает только опубликованные статьи
 */
@ApiTags('Blog (Публичный)')
@Controller('blog')
@Public()
@Throttle(PUBLIC_READ_THROTTLE)
export class BlogPublicController {
  constructor(private readonly blogService: BlogService) {}

  @Get()
  @ApiOperation({
    summary: 'Получить список опубликованных статей',
    description:
      'Возвращает только опубликованные статьи с поддержкой фильтрации и сортировки. ' +
      'Поддерживает фильтры: по организации, тегам, дате публикации, времени чтения. ' +
      'При передаче Authorization в каждую статью добавляется поле saved.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Номер страницы',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Количество записей',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Поиск по заголовку',
  })
  @ApiQuery({
    name: 'organizationId',
    required: false,
    type: String,
    description: 'ID организации',
  })
  @ApiQuery({
    name: 'tagId',
    required: false,
    type: String,
    description: 'ID тега',
  })
  @ApiQuery({
    name: 'tagIds',
    required: false,
    isArray: true,
    type: String,
    description: 'ID тегов (массив)',
  })
  @ApiQuery({
    name: 'publishedAfter',
    required: false,
    type: String,
    description: 'Опубликовано после (ISO 8601)',
  })
  @ApiQuery({
    name: 'publishedBefore',
    required: false,
    type: String,
    description: 'Опубликовано до (ISO 8601)',
  })
  @ApiQuery({
    name: 'minReadingTime',
    required: false,
    type: Number,
    description: 'Мин. время чтения (мин)',
  })
  @ApiQuery({
    name: 'maxReadingTime',
    required: false,
    type: Number,
    description: 'Макс. время чтения (мин)',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: BlogPostSortBy,
    description: 'Сортировка по полю',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: SortOrder,
    description: 'Порядок сортировки',
  })
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth('optional')
  @ApiResponse({ status: 200, description: 'Список опубликованных статей' })
  async findAll(
    @Query() query: PublicBlogPostsQueryDto,
    @CurrentUser() user: ICurrentUser | undefined,
  ) {
    return this.blogService.findPublished(query, user);
  }

  @Get('by-slug/:slug')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth('optional')
  @ApiOperation({
    summary: 'Получить статью по slug',
    description:
      'Возвращает опубликованную статью по её URL-slug и увеличивает счётчик просмотров. При передаче Authorization добавляется поле saved.',
  })
  @ApiParam({
    name: 'slug',
    description: 'URL-slug статьи (уникальный идентификатор в URL)',
  })
  @ApiResponse({ status: 200, description: 'Статья найдена' })
  @ApiResponse({
    status: 410,
    description:
      'Статья удалена супер-админом. Body: { deleted: true, deletionReason?, deletedAt }',
  })
  @ApiResponse({
    status: 404,
    description: 'Статья не найдена или не опубликована',
  })
  async findBySlug(
    @Param('slug') slug: string,
    @Query('locale') locale: string | undefined,
    @CurrentUser() user: ICurrentUser | undefined,
  ) {
    return this.blogService.findPublicBySlug(slug, user, locale);
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth('optional')
  @ApiOperation({
    summary: 'Получить статью по ID',
    description:
      'Возвращает опубликованную статью по её ID и увеличивает счётчик просмотров. При передаче Authorization добавляется поле saved.',
  })
  @ApiParam({ name: 'id', description: 'UUID статьи' })
  @ApiResponse({ status: 200, description: 'Статья найдена' })
  @ApiResponse({
    status: 404,
    description: 'Статья не найдена или не опубликована',
  })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('locale') locale: string | undefined,
    @CurrentUser() user: ICurrentUser | undefined,
  ) {
    return this.blogService.findPublicById(id, user, locale);
  }
}
