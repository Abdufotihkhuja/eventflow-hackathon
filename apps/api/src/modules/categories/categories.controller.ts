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
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { UserType } from '@prisma/client';
import { CategoriesService } from './categories.service';
import { UploadsService } from '../uploads/uploads.service';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CategoryQueryDto,
  CheckSlugQueryDto,
  ReorderCategoriesDto,
  PublicCategoryDto,
} from './dto';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { Public, Roles } from '../../common/decorators';
import { PUBLIC_READ_THROTTLE } from '../../common/constants/rate-limit.constants';

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  // ==================== Публичные endpoints ====================

  @Get()
  @Public()
  @Throttle(PUBLIC_READ_THROTTLE)
  @ApiOperation({ summary: 'Получить все активные категории' })
  @ApiResponse({
    status: 200,
    description: 'Список активных категорий с количеством событий',
    type: [PublicCategoryDto],
  })
  async getPublicCategories(@Query('locale') locale?: string) {
    return this.categoriesService.findAllActivePublic(locale);
  }

  @Get(':id')
  @Public()
  @Throttle(PUBLIC_READ_THROTTLE)
  @ApiOperation({ summary: 'Получить категорию по ID' })
  @ApiResponse({ status: 200, description: 'Категория', type: PublicCategoryDto })
  @ApiResponse({ status: 404, description: 'Категория не найдена' })
  async getById(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('locale') locale?: string,
  ) {
    return this.categoriesService.findPublicById(id, locale);
  }
}

// ==================== Админские endpoints ====================

@ApiTags('super-admin/categories')
@Controller('super-admin/categories')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserType.SUPER_ADMIN)
@ApiBearerAuth()
export class AdminCategoriesController {
  constructor(
    private readonly categoriesService: CategoriesService,
    private readonly uploadsService: UploadsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Получить список категорий с фильтрацией' })
  @ApiResponse({ status: 200, description: 'Список категорий' })
  async getAll(@Query() query: CategoryQueryDto) {
    return this.categoriesService.findMany(query);
  }

  @Get('check-slug')
  @ApiOperation({ summary: 'Проверить доступность slug' })
  @ApiResponse({
    status: 200,
    description: '{ available: true } или { available: false }',
  })
  async checkSlug(@Query() query: CheckSlugQueryDto) {
    return this.categoriesService.checkSlugAvailability(
      query.slug,
      query.excludeId,
    );
  }

  @Post('icon-upload')
  @ApiOperation({ summary: 'Загрузить иконку категории (SVG)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        icon: { type: 'string', format: 'binary', description: 'Файл .svg' },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Файл загружен, возвращается url для поля icon',
  })
  @ApiResponse({
    status: 400,
    description: 'Файл не предоставлен или не SVG (image/svg+xml, макс. 512KB)',
  })
  @UseInterceptors(FileInterceptor('icon'))
  async uploadIcon(@UploadedFile() file: Express.Multer.File) {
    return this.uploadsService.uploadSvgIcon(file);
  }

  @Patch('reorder')
  @ApiOperation({ summary: 'Изменить порядок категорий' })
  @ApiResponse({ status: 200, description: 'Порядок изменён' })
  @ApiResponse({
    status: 400,
    description:
      'Некорректный список: передайте все ID категорий в нужном порядке',
  })
  async reorder(@Body() dto: ReorderCategoriesDto) {
    await this.categoriesService.reorder(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить категорию по ID' })
  @ApiResponse({ status: 200, description: 'Категория' })
  @ApiResponse({ status: 404, description: 'Категория не найдена' })
  async getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.categoriesService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Создать категорию' })
  @ApiResponse({ status: 201, description: 'Категория создана' })
  @ApiResponse({
    status: 409,
    description: 'Категория с таким именем/slug уже существует',
  })
  async create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновить категорию' })
  @ApiResponse({ status: 200, description: 'Категория обновлена' })
  @ApiResponse({ status: 404, description: 'Категория не найдена' })
  @ApiResponse({
    status: 409,
    description: 'Категория с таким именем/slug уже существует',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить категорию' })
  @ApiResponse({ status: 204, description: 'Категория удалена' })
  @ApiResponse({ status: 404, description: 'Категория не найдена' })
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    await this.categoriesService.delete(id);
  }
}
