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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { UserType } from '@prisma/client';
import { BlogCategoriesService } from './blog-categories.service';
import {
  CreateBlogCategoryDto,
  UpdateBlogCategoryDto,
  BlogCategoryQueryDto,
  CheckBlogCategorySlugQueryDto,
  ReorderBlogCategoriesDto,
} from './dto';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { Public, Roles } from '../../common/decorators';
import { PUBLIC_READ_THROTTLE } from '../../common/constants/rate-limit.constants';

@ApiTags('blog-categories')
@Controller('blog-categories')
export class BlogCategoriesController {
  constructor(
    private readonly blogCategoriesService: BlogCategoriesService,
  ) {}

  // ==================== Публичные endpoints ====================

  @Get()
  @Public()
  @Throttle(PUBLIC_READ_THROTTLE)
  @ApiOperation({ summary: 'Получить все активные категории блога' })
  @ApiResponse({
    status: 200,
    description: 'Список активных категорий блога с количеством статей',
  })
  async getPublicCategories(@Query('locale') locale?: string) {
    return this.blogCategoriesService.findAllActivePublic(locale);
  }

  @Get(':idOrSlug')
  @Public()
  @Throttle(PUBLIC_READ_THROTTLE)
  @ApiOperation({ summary: 'Получить категорию блога по ID или slug' })
  @ApiResponse({ status: 200, description: 'Категория блога' })
  @ApiResponse({ status: 404, description: 'Категория не найдена' })
  async getByIdOrSlug(
    @Param('idOrSlug') idOrSlug: string,
    @Query('locale') locale?: string,
  ) {
    return this.blogCategoriesService.findPublicByIdOrSlug(idOrSlug, locale);
  }
}

// ==================== Админские endpoints ====================

@ApiTags('super-admin/blog-categories')
@Controller('super-admin/blog-categories')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserType.SUPER_ADMIN)
@ApiBearerAuth()
export class AdminBlogCategoriesController {
  constructor(
    private readonly blogCategoriesService: BlogCategoriesService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Получить список категорий блога с фильтрацией' })
  @ApiResponse({ status: 200, description: 'Список категорий блога' })
  async getAll(@Query() query: BlogCategoryQueryDto) {
    return this.blogCategoriesService.findMany(query);
  }

  @Get('check-slug')
  @ApiOperation({ summary: 'Проверить доступность slug' })
  @ApiResponse({
    status: 200,
    description: '{ available: true } или { available: false }',
  })
  async checkSlug(@Query() query: CheckBlogCategorySlugQueryDto) {
    return this.blogCategoriesService.checkSlugAvailability(
      query.slug,
      query.excludeId,
    );
  }

  @Patch('reorder')
  @ApiOperation({ summary: 'Изменить порядок категорий блога' })
  @ApiResponse({ status: 200, description: 'Порядок изменён' })
  @ApiResponse({
    status: 400,
    description:
      'Некорректный список: передайте все ID категорий в нужном порядке',
  })
  async reorder(@Body() dto: ReorderBlogCategoriesDto) {
    await this.blogCategoriesService.reorder(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить категорию блога по ID' })
  @ApiResponse({ status: 200, description: 'Категория блога' })
  @ApiResponse({ status: 404, description: 'Категория не найдена' })
  async getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.blogCategoriesService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Создать категорию блога' })
  @ApiResponse({ status: 201, description: 'Категория создана' })
  @ApiResponse({
    status: 409,
    description: 'Категория с таким именем/slug уже существует',
  })
  async create(@Body() dto: CreateBlogCategoryDto) {
    return this.blogCategoriesService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновить категорию блога' })
  @ApiResponse({ status: 200, description: 'Категория обновлена' })
  @ApiResponse({ status: 404, description: 'Категория не найдена' })
  @ApiResponse({
    status: 409,
    description: 'Категория с таким именем/slug уже существует',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBlogCategoryDto,
  ) {
    return this.blogCategoriesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить категорию блога' })
  @ApiResponse({ status: 204, description: 'Категория удалена' })
  @ApiResponse({ status: 404, description: 'Категория не найдена' })
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    await this.blogCategoriesService.delete(id);
  }
}
