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
  ApiParam,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { UserType } from '@prisma/client';
import { CollectionsService } from './collections.service';
import { UploadsService } from '../uploads/uploads.service';
import {
  CreateCollectionDto,
  UpdateCollectionDto,
  CollectionQueryDto,
  AddEventsToCollectionDto,
  RemoveEventsFromCollectionDto,
  ReorderCollectionEventsDto,
  AvailableEventsQueryDto,
  CheckCollectionSlugQueryDto,
  PublicCollectionListItemDto,
  PublicCollectionWithEventsDto,
} from './dto';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { Public, Roles } from '../../common/decorators';
import { PUBLIC_READ_THROTTLE } from '../../common/constants/rate-limit.constants';

@ApiTags('collections')
@Controller('collections')
export class CollectionsController {
  constructor(private readonly collectionsService: CollectionsService) {}

  // ==================== Публичные endpoints ====================

  @Get()
  @Public()
  @Throttle(PUBLIC_READ_THROTTLE)
  @ApiOperation({ summary: 'Получить все активные подборки' })
  @ApiResponse({
    status: 200,
    description: 'Список активных подборок с количеством событий',
    type: [PublicCollectionListItemDto],
  })
  async getPublicCollections(@Query('locale') locale?: string) {
    return this.collectionsService.findAllActivePublic(locale);
  }

  @Get(':id')
  @Public()
  @Throttle(PUBLIC_READ_THROTTLE)
  @ApiOperation({ summary: 'Получить подборку по ID с событиями' })
  @ApiResponse({
    status: 200,
    description: 'Подборка с событиями',
    type: PublicCollectionWithEventsDto,
  })
  @ApiResponse({ status: 404, description: 'Подборка не найдена' })
  async getById(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('locale') locale?: string,
  ) {
    return this.collectionsService.findPublicByIdWithEvents(id, locale);
  }

  @Get('by-slug/:slug')
  @Public()
  @Throttle(PUBLIC_READ_THROTTLE)
  @ApiOperation({ summary: 'Получить подборку по slug с событиями' })
  @ApiParam({ name: 'slug', description: 'Slug подборки' })
  @ApiResponse({
    status: 200,
    description: 'Подборка с событиями',
    type: PublicCollectionWithEventsDto,
  })
  @ApiResponse({ status: 404, description: 'Подборка не найдена' })
  async getBySlug(
    @Param('slug') slug: string,
    @Query('locale') locale?: string,
  ) {
    return this.collectionsService.findPublicBySlugWithEvents(slug, locale);
  }
}

// ==================== Админские endpoints ====================

@ApiTags('super-admin/collections')
@Controller('super-admin/collections')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserType.SUPER_ADMIN)
@ApiBearerAuth()
export class AdminCollectionsController {
  constructor(
    private readonly collectionsService: CollectionsService,
    private readonly uploadsService: UploadsService,
  ) {}

  @Get('available-events')
  @ApiOperation({
    summary:
      'Список событий для выбора в подборку (опубликованные и прошедшие, минимальные поля)',
  })
  @ApiResponse({
    status: 200,
    description:
      'Список событий: id, title, slug, coverImage, startDate, endDate, status',
  })
  async getAvailableEvents(@Query() query: AvailableEventsQueryDto) {
    return this.collectionsService.getAvailableEventsForPicker(query);
  }

  @Get('check-slug')
  @ApiOperation({ summary: 'Проверить доступность slug' })
  @ApiResponse({
    status: 200,
    description: '{ available: true } или { available: false }',
  })
  async checkSlug(@Query() query: CheckCollectionSlugQueryDto) {
    return this.collectionsService.checkSlugAvailability(
      query.slug,
      query.excludeId,
    );
  }

  @Post('cover-upload')
  @ApiOperation({ summary: 'Загрузить обложку подборки' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        cover: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Файл загружен, возвращается url для поля coverImage',
  })
  @ApiResponse({
    status: 400,
    description:
      'Файл не предоставлен или недопустимый тип (JPEG, PNG, GIF, WebP, макс. 5MB)',
  })
  @UseInterceptors(FileInterceptor('cover'))
  async uploadCover(@UploadedFile() file: Express.Multer.File) {
    return this.uploadsService.uploadImage(file);
  }

  @Get()
  @ApiOperation({ summary: 'Получить список подборок с фильтрацией' })
  @ApiResponse({ status: 200, description: 'Список подборок' })
  async getAll(@Query() query: CollectionQueryDto) {
    return this.collectionsService.findMany(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить подборку по ID с событиями' })
  @ApiResponse({ status: 200, description: 'Подборка с событиями' })
  @ApiResponse({ status: 404, description: 'Подборка не найдена' })
  async getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.collectionsService.findByIdWithEvents(id);
  }

  @Get(':id/events')
  @ApiOperation({ summary: 'Получить события подборки' })
  @ApiResponse({ status: 200, description: 'Список событий подборки' })
  @ApiResponse({ status: 404, description: 'Подборка не найдена' })
  async getCollectionEvents(@Param('id', ParseUUIDPipe) id: string) {
    return this.collectionsService.getCollectionEvents(id);
  }

  @Post()
  @ApiOperation({ summary: 'Создать подборку' })
  @ApiResponse({ status: 201, description: 'Подборка создана' })
  @ApiResponse({
    status: 409,
    description: 'Подборка с таким slug уже существует',
  })
  async create(@Body() dto: CreateCollectionDto) {
    return this.collectionsService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновить подборку' })
  @ApiResponse({ status: 200, description: 'Подборка обновлена' })
  @ApiResponse({ status: 404, description: 'Подборка не найдена' })
  @ApiResponse({
    status: 409,
    description: 'Подборка с таким slug уже существует',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCollectionDto,
  ) {
    return this.collectionsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить подборку' })
  @ApiResponse({ status: 204, description: 'Подборка удалена' })
  @ApiResponse({ status: 404, description: 'Подборка не найдена' })
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    await this.collectionsService.delete(id);
  }

  // ==================== Управление событиями ====================

  @Post(':id/events')
  @ApiOperation({ summary: 'Добавить события в подборку' })
  @ApiResponse({ status: 200, description: 'События добавлены' })
  @ApiResponse({ status: 404, description: 'Подборка не найдена' })
  async addEvents(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddEventsToCollectionDto,
  ) {
    await this.collectionsService.addEvents(id, dto);
    return { message: 'События добавлены в подборку' };
  }

  @Delete(':id/events')
  @ApiOperation({ summary: 'Удалить события из подборки' })
  @ApiResponse({ status: 200, description: 'События удалены' })
  @ApiResponse({ status: 404, description: 'Подборка не найдена' })
  async removeEvents(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RemoveEventsFromCollectionDto,
  ) {
    await this.collectionsService.removeEvents(id, dto);
    return { message: 'События удалены из подборки' };
  }

  @Patch(':id/events/reorder')
  @ApiOperation({ summary: 'Изменить порядок событий в подборке' })
  @ApiResponse({ status: 200, description: 'Порядок событий изменён' })
  @ApiResponse({ status: 404, description: 'Подборка не найдена' })
  async reorderEvents(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReorderCollectionEventsDto,
  ) {
    await this.collectionsService.reorderEvents(id, dto);
    return { message: 'Порядок событий изменён' };
  }
}
