import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserType } from '@prisma/client';
import { PERMISSIONS } from '../../common/constants/permissions.constant';
import {
  CurrentUser,
  Public,
  RequirePermissions,
} from '../../common/decorators';
import { JwtAuthGuard, PermissionsGuard } from '../../common/guards';
import type { ICurrentUser } from '../../common/interfaces';
import { ContactsService } from '../organizations/contacts/contacts.service';
import { CreatePlaceRentalRequestDto } from '../organizations/contacts/dto';
import {
  CatalogPlacesQueryDto,
  CreatePlaceDto,
  PlaceSuggestionsQueryDto,
  PlacesQueryDto,
  UpdatePlaceDto,
} from './dto';
import { PlacesService } from './places.service';

@ApiTags('places')
@Controller('places')
export class PlacesController {
  constructor(
    private readonly placesService: PlacesService,
    private readonly contactsService: ContactsService,
  ) {}

  @Post('images/upload')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.PLACES_CREATE)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiOperation({ summary: 'Загрузить фотографию площадки' })
  @ApiResponse({
    status: 201,
    description: 'Фотография загружена. Вернётся URL для imageUrls.',
  })
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.placesService.uploadImage(file, user);
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.PLACES_CREATE)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Создать площадку для аренды' })
  @ApiResponse({ status: 201, description: 'Площадка создана' })
  async create(@Body() dto: CreatePlaceDto, @CurrentUser() user: ICurrentUser) {
    return this.placesService.create(dto, user);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.PLACES_READ)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Мои площадки организации' })
  @ApiResponse({ status: 200, description: 'Список площадок организации' })
  async findMine(
    @Query() query: PlacesQueryDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.placesService.findMine(query, user);
  }

  @Get('catalog')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.PLACES_READ)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Каталог опубликованных площадок для организаторов',
  })
  @ApiResponse({ status: 200, description: 'Каталог опубликованных площадок' })
  async getCatalog(@Query() query: CatalogPlacesQueryDto) {
    return this.placesService.getCatalog(query);
  }

  @Get('suggestions/nearby')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.PLACES_READ)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Подобрать nearby площадки по координатам' })
  @ApiResponse({ status: 200, description: 'Список nearby площадок' })
  async getNearbySuggestions(@Query() query: PlaceSuggestionsQueryDto) {
    return this.placesService.getNearbySuggestions(query);
  }

  @Get('public')
  @Public()
  @ApiOperation({ summary: 'Публичный каталог площадок' })
  @ApiResponse({ status: 200, description: 'Публичный каталог площадок' })
  async getPublicCatalog(@Query() query: CatalogPlacesQueryDto) {
    return this.placesService.getCatalog(query);
  }

  @Get('public/by-slug/:slug')
  @Public()
  @ApiOperation({ summary: 'Публичная карточка площадки по slug' })
  @ApiParam({ name: 'slug', description: 'SEO-friendly slug площадки' })
  @ApiResponse({ status: 200, description: 'Площадка найдена' })
  async getPublicBySlug(@Param('slug') slug: string) {
    return this.placesService.findPublicBySlug(slug);
  }

  @Get('public/:id')
  @Public()
  @ApiOperation({ summary: 'Публичная карточка площадки по ID' })
  @ApiParam({ name: 'id', description: 'ID площадки' })
  @ApiResponse({ status: 200, description: 'Площадка найдена' })
  async getPublicById(@Param('id', ParseUUIDPipe) id: string) {
    return this.placesService.findPublicById(id);
  }

  @Post(':id/request')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.PLACES_REQUEST)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Отправить заявку на аренду площадки от имени организации-заявителя',
  })
  @ApiParam({ name: 'id', description: 'ID площадки' })
  @ApiResponse({
    status: 201,
    description: 'Заявка на аренду площадки отправлена',
  })
  async createRentalRequest(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreatePlaceRentalRequestDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    const requesterOrganizationId =
      user.type === UserType.ORGANIZATION ? user.sub : user.organizationId!;

    await this.contactsService.createPlaceRentalRequest(
      requesterOrganizationId,
      id,
      dto,
    );

    return { message: 'Заявка на аренду площадки отправлена' };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.PLACES_READ)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получить площадку своей организации' })
  @ApiParam({ name: 'id', description: 'ID площадки' })
  @ApiResponse({ status: 200, description: 'Площадка найдена' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.placesService.findOneForOwner(id, user);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.PLACES_UPDATE)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Обновить площадку' })
  @ApiParam({ name: 'id', description: 'ID площадки' })
  @ApiResponse({ status: 200, description: 'Площадка обновлена' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePlaceDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.placesService.update(id, dto, user);
  }

  @Post(':id/publish')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.PLACES_PUBLISH)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Опубликовать площадку' })
  @ApiParam({ name: 'id', description: 'ID площадки' })
  @ApiResponse({ status: 200, description: 'Площадка опубликована' })
  async publish(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.placesService.publish(id, user);
  }

  @Post(':id/archive')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.PLACES_PUBLISH)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Архивировать площадку' })
  @ApiParam({ name: 'id', description: 'ID площадки' })
  @ApiResponse({ status: 200, description: 'Площадка архивирована' })
  async archive(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.placesService.archive(id, user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.PLACES_DELETE)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Удалить площадку' })
  @ApiParam({ name: 'id', description: 'ID площадки' })
  @ApiResponse({ status: 200, description: 'Площадка удалена' })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    await this.placesService.delete(id, user);
    return { message: 'Площадка удалена' };
  }
}
