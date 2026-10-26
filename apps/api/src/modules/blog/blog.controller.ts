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
} from '@nestjs/swagger';
import { BlogService } from './blog.service';
import {
  CreateBlogPostDto,
  UpdateBlogPostDto,
  OrganizationBlogPostsQueryDto,
  CheckSlugQueryDto,
  SuggestSlugQueryDto,
} from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { ICurrentUser } from '../../common/interfaces';
import { UserType } from '@prisma/client';
import { PERMISSIONS } from '../../common/constants/permissions.constant';

/**
 * Контроллер для управления статьями блога (для организаторов)
 *
 * Жизненный цикл статьи:
 * 1. DRAFT (черновик) - создание и редактирование
 * 2. PENDING_REVIEW (на модерации) - после отправки на модерацию
 * 3. PUBLISHED (опубликована) - автоматически после одобрения модератором
 * 4. REJECTED (отклонена) - если модератор отклонил
 *
 * После редактирования опубликованной/отклонённой статьи она возвращается в DRAFT
 */
@ApiTags('Blog Posts (Организатор)')
@ApiBearerAuth()
@Controller('blog-posts')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(UserType.ORGANIZATION, UserType.MEMBER)
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.BLOG_CREATE)
  @ApiOperation({
    summary: 'Создать статью блога',
    description: 'Создаёт новую статью в статусе DRAFT (черновик)',
  })
  @ApiResponse({ status: 201, description: 'Статья создана как черновик' })
  async create(
    @Body() dto: CreateBlogPostDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.blogService.create(dto, user);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.BLOG_READ)
  @ApiOperation({
    summary: 'Получить список статей организации',
    description: 'Возвращает все статьи организации с фильтрацией по статусу',
  })
  @ApiResponse({ status: 200, description: 'Список статей' })
  async findAll(
    @Query() query: OrganizationBlogPostsQueryDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.blogService.findByOrganization(query, user);
  }

  @Get('check-slug')
  @RequirePermissions(PERMISSIONS.BLOG_READ)
  @ApiOperation({
    summary: 'Проверить доступность slug',
    description:
      'Проверка уникальности slug при создании/редактировании статьи. excludeId — ID текущей статьи при редактировании.',
  })
  @ApiResponse({
    status: 200,
    description: '{ available: true } или { available: false }',
    schema: { properties: { available: { type: 'boolean' } } },
  })
  async checkSlug(@Query() query: CheckSlugQueryDto) {
    return this.blogService.checkSlugAvailability(
      query.slug,
      query.excludeId,
    );
  }

  @Get('suggest-slug')
  @RequirePermissions(PERMISSIONS.BLOG_READ)
  @ApiOperation({
    summary: 'Предложить slug по заголовку',
    description:
      'Генерирует уникальный slug из заголовка (транслитерация, нормализация). Та же логика, что при создании статьи. excludeId — при редактировании.',
  })
  @ApiResponse({
    status: 200,
    description: '{ slug: string }',
    schema: {
      properties: {
        slug: {
          type: 'string',
          example: 'kak-organizovat-uspeshnuyu-konferentsiyu',
        },
      },
    },
  })
  async suggestSlug(@Query() query: SuggestSlugQueryDto) {
    return this.blogService.suggestSlug(query.title, query.excludeId);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.BLOG_READ)
  @ApiOperation({ summary: 'Получить статью по ID' })
  @ApiResponse({ status: 200, description: 'Статья' })
  @ApiResponse({ status: 404, description: 'Статья не найдена' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.blogService.findByIdWithAccess(id, user);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.BLOG_UPDATE)
  @ApiOperation({
    summary: 'Обновить статью',
    description:
      'Обновляет статью. Нельзя редактировать статью на модерации. ' +
      'При редактировании опубликованной/отклонённой статьи она возвращается в черновик.',
  })
  @ApiResponse({ status: 200, description: 'Статья обновлена' })
  @ApiResponse({ status: 400, description: 'Статья на модерации' })
  @ApiResponse({ status: 404, description: 'Статья не найдена' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBlogPostDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.blogService.update(id, dto, user);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.BLOG_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Удалить статью',
    description:
      'Удаляет статью. Нельзя удалить опубликованную статью — сначала снимите с публикации.',
  })
  @ApiResponse({ status: 204, description: 'Статья удалена' })
  @ApiResponse({
    status: 400,
    description: 'Нельзя удалить опубликованную статью',
  })
  @ApiResponse({ status: 404, description: 'Статья не найдена' })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    await this.blogService.delete(id, user);
  }

  @Post(':id/submit')
  @RequirePermissions(PERMISSIONS.BLOG_SUBMIT)
  @ApiOperation({
    summary: 'Отправить статью на модерацию',
    description:
      'Отправляет черновик на модерацию. После одобрения модератором статья автоматически публикуется.',
  })
  @ApiResponse({ status: 200, description: 'Статья отправлена на модерацию' })
  @ApiResponse({ status: 400, description: 'Можно отправить только черновик' })
  async submitForReview(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.blogService.submitForReview(id, user);
  }

  @Post(':id/unpublish')
  @RequirePermissions(PERMISSIONS.BLOG_PUBLISH)
  @ApiOperation({
    summary: 'Снять статью с публикации',
    description:
      'Снимает статью с публикации и возвращает в черновик. ' +
      'Для повторной публикации нужно заново отправить на модерацию.',
  })
  @ApiResponse({
    status: 200,
    description: 'Статья снята с публикации (вернулась в черновик)',
  })
  @ApiResponse({
    status: 400,
    description: 'Можно снять только опубликованную статью',
  })
  async unpublish(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.blogService.unpublish(id, user);
  }
}
