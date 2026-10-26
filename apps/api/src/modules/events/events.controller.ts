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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { EventsService } from './events.service';
import {
  CreateEventDto,
  UpdateEventDto,
  EventQueryDto,
  OrganizationEventsQueryDto,
  PaginatedOrganizationEventsDto,
  SendEventInvitationDto,
  CheckSlugQueryDto,
  SuggestSlugQueryDto,
} from './dto';
import { PlaceSuggestionsQueryDto } from '../places/dto';
import {
  JwtAuthGuard,
  OptionalJwtAuthGuard,
  PermissionsGuard,
  VerifiedOrganizationGuard,
} from '../../common/guards';
import {
  CurrentUser,
  RequirePermissions,
  Public,
} from '../../common/decorators';
import type { ICurrentUser } from '../../common/interfaces';
import { PERMISSIONS } from '../../common/constants/permissions.constant';
import { BlockNoteUtil } from '../../common/utils/blocknote.util';
import { BlockNoteDocument } from '../../common/types/blocknote.types';

@ApiTags('events')
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.EVENTS_CREATE)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Создать мероприятие' })
  @ApiResponse({ status: 201, description: 'Мероприятие создано' })
  async create(@Body() dto: CreateEventDto, @CurrentUser() user: ICurrentUser) {
    return this.eventsService.create(dto, user);
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.EVENTS_READ)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получить список мероприятий организации' })
  async findAll(
    @Query() query: EventQueryDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.eventsService.findByOrganization(query, user);
  }

  @Get('check-slug')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.EVENTS_READ)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Проверить доступность slug',
    description:
      'Проверка уникальности slug при создании/редактировании мероприятия. excludeId — ID текущего мероприятия при редактировании.',
  })
  @ApiResponse({
    status: 200,
    description: '{ available: true } или { available: false }',
    schema: { properties: { available: { type: 'boolean' } } },
  })
  async checkSlug(@Query() query: CheckSlugQueryDto) {
    return this.eventsService.checkSlugAvailability(
      query.slug,
      query.excludeId,
    );
  }

  @Get('suggest-slug')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.EVENTS_READ)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Предложить slug по заголовку',
    description:
      'Генерирует уникальный slug из заголовка (транслитерация, нормализация). Та же логика, что при создании мероприятия. excludeId — при редактировании.',
  })
  @ApiResponse({
    status: 200,
    description: '{ slug: string }',
    schema: {
      properties: { slug: { type: 'string', example: 'tech-conference-2025' } },
    },
  })
  async suggestSlug(@Query() query: SuggestSlugQueryDto) {
    return this.eventsService.suggestSlug(query.title, query.excludeId);
  }

  @Get('place-suggestions/nearby')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.EVENTS_READ)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Подобрать nearby площадки для формы создания мероприятия',
  })
  async getNearbyPlaceSuggestions(@Query() query: PlaceSuggestionsQueryDto) {
    return this.eventsService.getNearbyPlaceSuggestions(query);
  }

  @Get('by-slug/:slug')
  @Public()
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @ApiOperation({
    summary: 'Получить опубликованное мероприятие по slug',
    description:
      'Публичный endpoint. Только мероприятия со статусом PUBLISHED.',
  })
  @ApiParam({ name: 'slug', description: 'URL-slug мероприятия' })
  @ApiResponse({ status: 200, description: 'Мероприятие найдено' })
  @ApiResponse({ status: 404, description: 'Мероприятие не найдено' })
  async findBySlug(@Param('slug') slug: string) {
    return this.eventsService.findPublicBySlug(slug);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.EVENTS_READ)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получить мероприятие по ID' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.eventsService.findByIdWithAccess(id, user);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.EVENTS_UPDATE)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Обновить мероприятие' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEventDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.eventsService.update(id, dto, user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.EVENTS_DELETE)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Удалить мероприятие' })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    await this.eventsService.delete(id, user);
    return { message: 'Мероприятие удалено' };
  }

  @Post(':id/submit-review')
  @UseGuards(JwtAuthGuard, PermissionsGuard, VerifiedOrganizationGuard)
  @RequirePermissions(PERMISSIONS.EVENTS_UPDATE)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Отправить мероприятие на модерацию',
    description:
      'Отправляет черновик мероприятия на проверку супер-админу. После одобрения мероприятие будет опубликовано.',
  })
  @ApiResponse({
    status: 200,
    description: 'Мероприятие отправлено на модерацию',
  })
  @ApiResponse({
    status: 403,
    description: 'Организация не верифицирована',
  })
  async submitForReview(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.eventsService.submitForReview(id, user);
  }

  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.EVENTS_UPDATE)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Отменить мероприятие' })
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.eventsService.cancel(id, user);
  }

  @Post(':id/complete')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.EVENTS_UPDATE)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Завершить мероприятие' })
  async complete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.eventsService.complete(id, user);
  }

  @Post(':id/regenerate-invite-code')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.EVENTS_UPDATE)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Регенерировать код приглашения',
    description: 'Только для событий с типом доступа INVITE_ONLY',
  })
  async regenerateInviteCode(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.eventsService.regenerateInviteCode(id, user);
  }

  @Get(':id/invite-link')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.EVENTS_READ)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Получить ссылку и код приглашения',
    description:
      'Только для событий INVITE_ONLY. Ссылка ведёт на страницу регистрации с кодом.',
  })
  @ApiResponse({
    status: 200,
    description: 'Ссылка и код приглашения',
    schema: {
      properties: {
        inviteLink: {
          type: 'string',
          example: 'https://.../events/slug?inviteCode=EVT-XXX',
        },
        inviteCode: { type: 'string', example: 'EVT-XXXXXXXX' },
      },
    },
  })
  async getInviteLink(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.eventsService.getInviteLink(id, user);
  }

  @Post(':id/send-invitation')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.EVENTS_UPDATE)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Отправить приглашение на email',
    description:
      'Только для событий INVITE_ONLY. Отправляет письмо с ссылкой и кодом приглашения.',
  })
  @ApiResponse({ status: 200, description: 'Приглашение отправлено' })
  async sendInvitation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SendEventInvitationDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.eventsService.sendInvitation(id, dto, user);
  }

  @Get('organizations/:id/events')
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Получить список событий организатора' })
  @ApiParam({ name: 'id', description: 'ID организации' })
  @ApiQuery({
    name: 'status',
    required: true,
    enum: ['upcoming', 'past'],
    description: 'Фильтр по времени: upcoming (предстоящие) или past (прошедшие)',
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
    description: 'Количество записей на странице',
  })
  @ApiResponse({
    status: 200,
    description: 'Список событий организатора',
    type: PaginatedOrganizationEventsDto,
  })
  async getOrganizationEvents(
    @Param('id', ParseUUIDPipe) organizationId: string,
    @Query() query: OrganizationEventsQueryDto,
  ) {
    return this.eventsService.getOrganizationEvents(organizationId, query);
  }

  @Get(':id/description/html')
  @Public()
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 запросов в минуту
  @ApiOperation({
    summary: 'Получить описание мероприятия в HTML формате',
    description:
      'Публичный endpoint для получения описания события в безопасном HTML формате с санитизацией',
  })
  @ApiParam({ name: 'id', description: 'ID мероприятия' })
  @ApiResponse({
    status: 200,
    description: 'HTML версия описания',
    schema: {
      type: 'object',
      properties: {
        html: { type: 'string', example: '<p>Описание мероприятия</p>' },
      },
    },
  })
  async getDescriptionAsHTML(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ html: string }> {
    const event = await this.eventsService.findPublicById(id);

    if (!event.description) {
      return { html: '' };
    }

    const html = BlockNoteUtil.toHTML(
      event.description as unknown as BlockNoteDocument,
    );
    return { html };
  }

  @Get(':id/description/text')
  @Public()
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 запросов в минуту
  @ApiOperation({
    summary: 'Получить описание мероприятия в текстовом формате',
    description:
      'Публичный endpoint для получения описания события в plain text формате (без форматирования)',
  })
  @ApiParam({ name: 'id', description: 'ID мероприятия' })
  @ApiResponse({
    status: 200,
    description: 'Текстовая версия описания',
    schema: {
      type: 'object',
      properties: {
        text: { type: 'string', example: 'Описание мероприятия' },
      },
    },
  })
  async getDescriptionAsText(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ text: string }> {
    const event = await this.eventsService.findPublicById(id);

    if (!event.description) {
      return { text: '' };
    }

    const text = BlockNoteUtil.toPlainText(
      event.description as unknown as BlockNoteDocument,
    );
    return { text };
  }
}
