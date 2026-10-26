import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { Public, CurrentUser } from '../../common/decorators';
import { OptionalJwtAuthGuard } from '../../common/guards';
import type { ICurrentUser } from '../../common/interfaces';
import { PUBLIC_READ_THROTTLE } from '../../common/constants/rate-limit.constants';
import { UsersService } from '../users/users.service';
import { MaterialsService } from '../events/agenda/materials.service';
import { FileStorageService } from '../storage/application/file-storage.service';
import { PublicService } from './public.service';
import {
  PlatformStatsDto,
  OrganizationPublicStatsDto,
  PublicEventsListDto,
  PublicEventsQueryDto,
  PublicOrganizationsQueryDto,
  PublicEventDetailDto,
  CanRegisterDto,
} from './dto';

@ApiTags('public')
@Controller('public')
@Public()
@Throttle(PUBLIC_READ_THROTTLE)
export class PublicController {
  constructor(
    private readonly publicService: PublicService,
    private readonly usersService: UsersService,
    private readonly materialsService: MaterialsService,
    private readonly storage: FileStorageService,
  ) {}

  @Get('profile-options')
  @ApiOperation({
    summary: 'Справочники для формы доп. полей профиля',
    description:
      'Навыки (макс. 3), регионы Узбекистана, языки, специализации, статус (работник/школьник/студент), пол. Без авторизации.',
  })
  @ApiResponse({ status: 200, description: 'Списки для выбора в форме' })
  getProfileOptions(): ReturnType<UsersService['getProfileOptions']> {
    return this.usersService.getProfileOptions();
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Получить статистику платформы',
    description:
      'Возвращает общую статистику EventFlow для отображения на публичной странице (landing page)',
  })
  @ApiResponse({
    status: 200,
    type: PlatformStatsDto,
    description: 'Статистика платформы',
  })
  async getPlatformStats(): Promise<PlatformStatsDto> {
    return this.publicService.getPlatformStats();
  }

  @Get('organizations/:id/stats')
  @ApiOperation({
    summary: 'Получить публичную статистику организации',
    description: 'Возвращает публичную статистику конкретной организации',
  })
  @ApiParam({ name: 'id', description: 'ID организации' })
  @ApiResponse({
    status: 200,
    type: OrganizationPublicStatsDto,
    description: 'Статистика организации',
  })
  @ApiResponse({ status: 404, description: 'Организация не найдена' })
  async getOrganizationStats(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('locale') locale?: string,
  ): Promise<OrganizationPublicStatsDto> {
    return this.publicService.getOrganizationStats(id, locale);
  }

  @Get('organizations')
  @ApiOperation({
    summary: 'Получить список публичных организаций',
    description:
      'Возвращает paginated список верифицированных (APPROVED) организаций с числом событий. Используется страницей /organizers/all и SEO-каркасом.',
  })
  async getPublicOrganizations(@Query() query: PublicOrganizationsQueryDto) {
    return this.publicService.getPublicOrganizations(query);
  }

  @Get('events')
  @ApiOperation({
    summary: 'Получить список публичных событий',
    description:
      'Возвращает список опубликованных событий с фильтрацией и пагинацией',
  })
  @ApiResponse({
    status: 200,
    type: PublicEventsListDto,
    description: 'Список событий',
  })
  async getPublicEvents(
    @Query() query: PublicEventsQueryDto,
  ): Promise<PublicEventsListDto> {
    return this.publicService.getPublicEvents(query);
  }

  @Get('events/by-slug/:slug')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({
    summary: 'Получить событие по slug (SEO-friendly)',
    description:
      'Возвращает подробную информацию о событии по SEO-friendly slug. При передаче Authorization: Bearer <token> в ответ добавляется myRegistration, если пользователь зарегистрирован на событие.',
  })
  @ApiParam({
    name: 'slug',
    description: 'SEO-friendly slug события',
    example: 'tech-conference-2025',
  })
  @ApiBearerAuth('optional')
  @ApiQuery({
    name: 'inviteCode',
    required: false,
    description:
      'Код приглашения (accessType=INVITE_ONLY) или персональный токен приглашения (accessType=PRIVATE) для открытия события по прямой ссылке.',
  })
  @ApiResponse({
    status: 200,
    description: 'Информация о событии',
    type: PublicEventDetailDto,
  })
  @ApiResponse({
    status: 410,
    description:
      'Событие удалено супер-админом. Body: { deleted: true, deletionReason?, deletedAt }',
  })
  @ApiResponse({ status: 404, description: 'Событие не найдено' })
  async getPublicEventBySlug(
    @Param('slug') slug: string,
    @CurrentUser() user: ICurrentUser | undefined,
    @Query('locale') locale?: string,
    @Query('inviteCode') inviteCode?: string,
  ) {
    return this.publicService.getPublicEventBySlug(
      slug,
      user,
      locale,
      inviteCode,
    );
  }

  @Get('events/:id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({
    summary: 'Получить событие по ID',
    description:
      'Возвращает подробную информацию о событии. При передаче Authorization: Bearer <token> в ответ добавляется myRegistration, если пользователь зарегистрирован на событие.',
  })
  @ApiParam({ name: 'id', description: 'ID события' })
  @ApiBearerAuth('optional')
  @ApiResponse({
    status: 200,
    description: 'Информация о событии',
    type: PublicEventDetailDto,
  })
  @ApiResponse({ status: 404, description: 'Событие не найдено' })
  async getPublicEventById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser | undefined,
    @Query('locale') locale?: string,
  ) {
    return this.publicService.getPublicEventById(id, user, locale);
  }

  @Get('events/:eventId/agenda/:agendaItemId/materials/download')
  @ApiOperation({
    summary: 'Скачать материал агенды (публично)',
    description:
      'Стримит файл материала, прикреплённого к agenda-item опубликованного события. Без авторизации — для тех же URL, которые уже отдаются в публичном листинге агенды. Прод-nginx режет прямой доступ к /uploads/materials/, поэтому этот route — единственный способ получить файл.',
  })
  @ApiParam({ name: 'eventId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'agendaItemId', type: 'string', format: 'uuid' })
  @ApiQuery({
    name: 'fileUrl',
    description: 'Относительный путь /uploads/materials/<uuid>.<ext>',
  })
  @ApiResponse({ status: 200, description: 'Файл для скачивания' })
  @ApiResponse({ status: 404, description: 'Файл не найден' })
  async downloadMaterial(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('agendaItemId', ParseUUIDPipe) agendaItemId: string,
    @Query('fileUrl') fileUrl: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { filepath, originalName } =
      await this.materialsService.getPublicMaterialPath(
        eventId,
        agendaItemId,
        fileUrl,
      );

    const file = this.storage.createReadStream(filepath);
    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(originalName)}"`,
    });
    return new StreamableFile(file);
  }

  @Get('events/:id/can-register')
  @ApiOperation({
    summary: 'Проверить возможность регистрации',
    description: 'Возвращает информацию о возможности регистрации на событие',
  })
  @ApiParam({ name: 'id', description: 'ID события' })
  @ApiResponse({
    status: 200,
    description: 'Результат проверки',
    type: CanRegisterDto,
  })
  @ApiResponse({ status: 404, description: 'Событие не найдено' })
  @ApiQuery({
    name: 'inviteCode',
    required: false,
    description: 'Персональный токен приглашения для событий accessType=PRIVATE.',
  })
  async canRegister(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('inviteCode') inviteCode?: string,
  ) {
    return this.publicService.canRegister(id, inviteCode);
  }
}
