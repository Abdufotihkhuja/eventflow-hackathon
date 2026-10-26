import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../../common/decorators';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import type { ICurrentUser } from '../../common/interfaces';
import { UserType, SuperAdmin, Event, BlogPost } from '@prisma/client';
import {
  SuperAdminService,
  type AdminUserListItem,
  type AdminOrganizationListItem,
  type SafeUser,
  type SafeOrganization,
  type SystemStats,
  type AdminEventStats,
  type AdminUserStats,
  type AdminOrganizationStats,
} from './super-admin.service';
import { UsersExportService } from './users-export.service';
import {
  CreateSuperAdminDto,
  RejectDto,
  AdminUsersQueryDto,
  AdminUsersExportQueryDto,
  AdminOrganizationsQueryDto,
  AdminEventsQueryDto,
  AdminBlogPostsQueryDto,
  AdminUpdateUserDto,
  AdminUpdateOrganizationDto,
  AdminUpdateEventDto,
  AdminSetEventStatusDto,
  HardDeleteOrganizationDto,
  OrganizationDeletePreviewDto,
  ArchiveAccountDto,
  ProvisionOrganizationDto,
  ProvisionOrganizationResponseDto,
} from './dto';

@ApiTags('super-admin')
@Controller('super-admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserType.SUPER_ADMIN)
export class SuperAdminController {
  constructor(
    private readonly superAdminService: SuperAdminService,
    private readonly usersExportService: UsersExportService,
  ) {}

  @Post('admins')
  @ApiOperation({ summary: 'Создать нового супер-админа' })
  @ApiResponse({ status: 201 })
  async createAdmin(
    @Body() dto: CreateSuperAdminDto,
  ): Promise<Omit<SuperAdmin, 'passwordHash'>> {
    return this.superAdminService.createSuperAdmin(dto);
  }

  @Post('organizations/provision')
  @ApiOperation({
    summary: 'Контролируемое создание организации',
    description:
      'Единственный разрешённый bootstrap организации: создаёт Organization, ' +
      'Account/ORGANIZATION Identity, OWNER Membership и системные роли в одной транзакции. ' +
      'Personal scope владельцу не создаётся.',
  })
  @ApiResponse({ status: 201, type: ProvisionOrganizationResponseDto })
  @ApiResponse({
    status: 409,
    description: 'Email/ИНН занят или требует ручной reconciliation',
  })
  async provisionOrganization(
    @CurrentUser() actor: ICurrentUser,
    @Body() dto: ProvisionOrganizationDto,
  ): Promise<ProvisionOrganizationResponseDto> {
    return this.superAdminService.provisionOrganization(dto, {
      id: actor.sub,
      email: actor.email,
    });
  }

  @Get('users')
  @ApiOperation({ summary: 'Получить список пользователей с фильтрами' })
  @ApiResponse({ status: 200 })
  async getUsers(@Query() query: AdminUsersQueryDto): Promise<{
    data: AdminUserListItem[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this.superAdminService.getAllUsers(query);
  }

  // Объявлено до `users/:userId` — иначе 'export' уйдёт в параметр маршрута.
  @Get('users/export')
  @ApiOperation({
    summary: 'Выгрузить пользователей в XLSX',
    description:
      'Колонки задаются параметром fields, фильтры совпадают с GET /users. ' +
      'Выгружается вся выборка, а не текущая страница.',
  })
  @ApiResponse({ status: 200, description: 'XLSX-файл' })
  async exportUsers(
    @Query() query: AdminUsersExportQueryDto,
    @CurrentUser() actor: ICurrentUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { stream, filename, total } =
      await this.usersExportService.export(query);

    await this.superAdminService.recordUsersExport(
      { id: actor.sub, email: actor.email },
      { total, fields: query.fields, status: query.status },
    );

    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      // Число строк — чтобы фронт мог показать «выгружено N» без парсинга файла.
      'X-Export-Total': String(total),
      'Access-Control-Expose-Headers': 'Content-Disposition, X-Export-Total',
    });

    return new StreamableFile(stream);
  }

  @Get('organizations')
  @ApiOperation({ summary: 'Получить список организаций с фильтрами' })
  @ApiResponse({ status: 200 })
  async getOrganizations(@Query() query: AdminOrganizationsQueryDto): Promise<{
    data: AdminOrganizationListItem[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this.superAdminService.getAllOrganizations(query);
  }

  @Get('organizations/pending')
  @ApiOperation({ summary: 'Получить организации на верификации' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200 })
  async getPendingOrganizations(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<{ data: SafeOrganization[]; total: number }> {
    return this.superAdminService.getPendingOrganizations(page, limit);
  }

  @Get('events')
  @ApiOperation({ summary: 'Получить список всех событий с фильтрами' })
  @ApiResponse({ status: 200 })
  async getEvents(
    @Query() query: AdminEventsQueryDto,
  ): Promise<{ data: Event[]; total: number; page: number; limit: number }> {
    return this.superAdminService.getAllEvents(query);
  }

  @Post('users/:userId/archive')
  @ApiOperation({
    summary: 'Архивировать (деактивировать) пользователя',
    description:
      'Soft delete: данные сохраняются, сессии завершаются, вход блокируется. ' +
      'Запрещает self-archive и архивацию аккаунта, связанного с супер-админом.',
  })
  @ApiResponse({ status: 201 })
  async archiveUser(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() actor: ICurrentUser,
    @Body() dto: ArchiveAccountDto,
  ): Promise<{ success: true; userId: string }> {
    return this.superAdminService.archiveUser(
      userId,
      { id: actor.sub, email: actor.email },
      dto?.reason,
    );
  }

  @Post('users/:userId/restore')
  @ApiOperation({ summary: 'Восстановить архивированного пользователя' })
  @ApiResponse({ status: 201 })
  async restoreUser(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() actor: ICurrentUser,
  ): Promise<{ success: true; userId: string }> {
    return this.superAdminService.restoreUser(userId, {
      id: actor.sub,
      email: actor.email,
    });
  }

  @Delete('users/:userId/hard-delete')
  @ApiOperation({
    summary: 'Необратимо удалить пользователя (hard delete)',
    description:
      'Полное удаление учётной записи пользователя и связанных данных. ' +
      'Запрещает self-delete и удаление аккаунта, связанного с супер-админом; ' +
      'инвалидирует все сессии; пишет audit log. Действие необратимо.',
  })
  @ApiResponse({ status: 200 })
  @ApiResponse({
    status: 400,
    description: 'Self-delete или защищённый аккаунт',
  })
  @ApiResponse({ status: 404, description: 'Пользователь не найден' })
  async hardDeleteUser(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() actor: ICurrentUser,
  ): Promise<{ success: true; userId: string; email: string }> {
    return this.superAdminService.hardDeleteUser(userId, {
      id: actor.sub,
      email: actor.email,
    });
  }

  @Post('organizations/:orgId/archive')
  @ApiOperation({
    summary: 'Архивировать (деактивировать) организацию',
    description:
      'Soft delete: данные сохраняются; сессии организации и всех сотрудников ' +
      'завершаются, вход блокируется.',
  })
  @ApiResponse({ status: 201 })
  async archiveOrganization(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @CurrentUser() actor: ICurrentUser,
    @Body() dto: ArchiveAccountDto,
  ): Promise<{ success: true; organizationId: string }> {
    return this.superAdminService.archiveOrganization(
      orgId,
      { id: actor.sub, email: actor.email },
      dto?.reason,
    );
  }

  @Post('organizations/:orgId/restore')
  @ApiOperation({ summary: 'Восстановить архивированную организацию' })
  @ApiResponse({ status: 201 })
  async restoreOrganization(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @CurrentUser() actor: ICurrentUser,
  ): Promise<{ success: true; organizationId: string }> {
    return this.superAdminService.restoreOrganization(orgId, {
      id: actor.sub,
      email: actor.email,
    });
  }

  @Get('organizations/:orgId/delete-preview')
  @ApiOperation({
    summary: 'Сводка зависимостей организации перед удалением',
    description:
      'Реальные счётчики связанных сущностей (сотрудники, события, регистрации, ' +
      'сертификаты, билеты и т.д.) для подтверждающего диалога hard delete.',
  })
  @ApiResponse({ status: 200, type: OrganizationDeletePreviewDto })
  @ApiResponse({ status: 404, description: 'Организация не найдена' })
  async getOrganizationDeletePreview(
    @Param('orgId', ParseUUIDPipe) orgId: string,
  ): Promise<OrganizationDeletePreviewDto> {
    return this.superAdminService.getOrganizationDeletePreview(orgId);
  }

  @Delete('organizations/:orgId/hard-delete')
  @ApiOperation({
    summary: 'Hard delete организации (отключён)',
    description:
      'Маршрут сохранён для совместимости, но необратимое удаление запрещено. ' +
      'Используйте архивирование организации.',
    deprecated: true,
  })
  @ApiResponse({
    status: 403,
    description: 'Необратимое удаление организации запрещено',
  })
  async hardDeleteOrganization(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @CurrentUser() actor: ICurrentUser,
    @Body() dto: HardDeleteOrganizationDto,
  ): Promise<{ success: true; organizationId: string; name: string }> {
    return this.superAdminService.hardDeleteOrganization(
      orgId,
      { id: actor.sub, email: actor.email },
      dto.confirmation,
    );
  }

  // ==================== ПОЛУЧЕНИЕ ПО ID ====================

  @Get('users/:userId')
  @ApiOperation({ summary: 'Получить пользователя по ID' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Пользователь не найден' })
  async getUserById(
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<SafeUser & { stats: AdminUserStats }> {
    return this.superAdminService.getUserById(userId);
  }

  @Get('organizations/:orgId')
  @ApiOperation({ summary: 'Получить организацию по ID' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Организация не найдена' })
  async getOrganizationById(
    @Param('orgId', ParseUUIDPipe) orgId: string,
  ): Promise<SafeOrganization & { stats: AdminOrganizationStats }> {
    return this.superAdminService.getOrganizationById(orgId);
  }

  @Get('events/:eventId')
  @ApiOperation({ summary: 'Получить событие по ID' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Мероприятие не найдено' })
  async getEventById(
    @Param('eventId', ParseUUIDPipe) eventId: string,
  ): Promise<Event & { stats: AdminEventStats }> {
    return this.superAdminService.getEventById(eventId);
  }

  // ==================== РЕДАКТИРОВАНИЕ (без изменения статуса) ====================

  @Patch('users/:userId')
  @ApiOperation({
    summary: 'Редактировать пользователя (без изменения статуса)',
  })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Пользователь не найден' })
  @ApiResponse({ status: 409, description: 'Email уже используется' })
  async updateUser(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: AdminUpdateUserDto,
  ): Promise<SafeUser> {
    return this.superAdminService.updateUser(userId, dto);
  }

  @Patch('organizations/:orgId')
  @ApiOperation({
    summary: 'Редактировать организацию (без изменения статуса верификации)',
  })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Организация не найдена' })
  @ApiResponse({ status: 409, description: 'Email или ИНН уже используется' })
  async updateOrganization(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Body() dto: AdminUpdateOrganizationDto,
  ): Promise<SafeOrganization> {
    return this.superAdminService.updateOrganization(orgId, dto);
  }

  @Patch('events/:eventId')
  @ApiOperation({ summary: 'Редактировать событие (без изменения статуса)' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Мероприятие не найдено' })
  async updateEvent(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() dto: AdminUpdateEventDto,
  ): Promise<Event> {
    return this.superAdminService.updateEvent(eventId, dto);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Получить расширенную сводку платформы' })
  @ApiResponse({ status: 200 })
  async getStats(): Promise<SystemStats> {
    return this.superAdminService.getSystemStats();
  }

  // ==================== МОДЕРАЦИЯ ОРГАНИЗАЦИЙ ====================

  @Post('organizations/:orgId/approve')
  @ApiOperation({ summary: 'Одобрить организацию' })
  @ApiResponse({ status: 200, description: 'Организация одобрена' })
  async approveOrganization(
    @Param('orgId', ParseUUIDPipe) orgId: string,
  ): Promise<SafeOrganization> {
    return this.superAdminService.approveOrganization(orgId);
  }

  @Post('organizations/:orgId/reject')
  @ApiOperation({ summary: 'Отклонить организацию' })
  @ApiResponse({ status: 200, description: 'Организация отклонена' })
  async rejectOrganization(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Body() dto: RejectDto,
  ): Promise<SafeOrganization> {
    return this.superAdminService.rejectOrganization(orgId, dto.reason);
  }

  // ==================== МОДЕРАЦИЯ СОБЫТИЙ ====================

  @Get('events/pending')
  @ApiOperation({ summary: 'Получить события на модерации' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200 })
  async getPendingEvents(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<{ data: Event[]; total: number }> {
    return this.superAdminService.getPendingEvents(page, limit);
  }

  @Post('events/:eventId/approve')
  @ApiOperation({
    summary: 'Одобрить/опубликовать мероприятие',
    description:
      'Публикует мероприятие на модерации (PENDING_REVIEW) или черновик (DRAFT) — супер-админ может опубликовать событие, не дожидаясь отправки на рассмотрение.',
  })
  @ApiResponse({ status: 200, description: 'Мероприятие опубликовано' })
  async approveEvent(
    @Param('eventId', ParseUUIDPipe) eventId: string,
  ): Promise<Event> {
    return this.superAdminService.approveEvent(eventId);
  }

  @Post('events/:eventId/reject')
  @ApiOperation({ summary: 'Отклонить мероприятие (вернуть в черновик)' })
  @ApiResponse({ status: 200, description: 'Мероприятие отклонено' })
  async rejectEvent(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() dto: RejectDto,
  ): Promise<Event> {
    return this.superAdminService.rejectEvent(eventId, dto.reason, dto.kind);
  }

  @Patch('events/:eventId/status')
  @ApiOperation({
    summary: 'Принудительно изменить статус мероприятия',
    description:
      'Опасный супер-админский override из любого текущего статуса в любой другой. ' +
      'Требует причины и ожидаемой версии события для защиты от конкурентных изменений.',
  })
  @ApiResponse({ status: 200, description: 'Статус мероприятия изменён' })
  @ApiResponse({
    status: 409,
    description: 'Событие уже изменилось; требуется обновить данные',
  })
  async setEventStatus(
    @CurrentUser() actor: ICurrentUser,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() dto: AdminSetEventStatusDto,
  ): Promise<Event> {
    return this.superAdminService.setEventStatus(eventId, dto, {
      id: actor.sub,
      email: actor.email,
    });
  }

  @Patch('events/:eventId/featured')
  @ApiOperation({ summary: 'Переключить статус "Топовое событие"' })
  @ApiResponse({ status: 200, description: 'Статус топового события изменен' })
  @ApiResponse({ status: 404, description: 'Мероприятие не найдено' })
  async toggleFeaturedEvent(
    @Param('eventId', ParseUUIDPipe) eventId: string,
  ): Promise<Event> {
    return this.superAdminService.toggleFeaturedEvent(eventId);
  }

  // ==================== МОДЕРАЦИЯ БЛОГ-ПОСТОВ ====================

  @Get('blog-posts')
  @ApiOperation({ summary: 'Получить все статьи блога с фильтрами' })
  @ApiResponse({ status: 200 })
  async getAllBlogPosts(
    @Query() query: AdminBlogPostsQueryDto,
  ): Promise<{ data: BlogPost[]; total: number; page: number; limit: number }> {
    return this.superAdminService.getAllBlogPosts(query);
  }

  @Get('blog-posts/pending')
  @ApiOperation({ summary: 'Получить статьи блога на модерации' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200 })
  async getPendingBlogPosts(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<{ data: BlogPost[]; total: number; page: number; limit: number }> {
    return this.superAdminService.getPendingBlogPosts(page, limit);
  }

  @Get('blog-posts/:postId')
  @ApiOperation({ summary: 'Получить статью блога по ID (для модерации)' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Статья не найдена' })
  async getBlogPostById(
    @Param('postId', ParseUUIDPipe) postId: string,
  ): Promise<BlogPost> {
    return this.superAdminService.getBlogPostById(postId);
  }

  @Post('blog-posts/:postId/approve')
  @ApiOperation({ summary: 'Одобрить статью блога' })
  @ApiResponse({ status: 200, description: 'Статья одобрена' })
  @ApiResponse({ status: 400, description: 'Статья не на модерации' })
  async approveBlogPost(
    @Param('postId', ParseUUIDPipe) postId: string,
  ): Promise<BlogPost> {
    return this.superAdminService.approveBlogPost(postId);
  }

  @Post('blog-posts/:postId/reject')
  @ApiOperation({ summary: 'Отклонить статью блога' })
  @ApiResponse({ status: 200, description: 'Статья отклонена' })
  @ApiResponse({ status: 400, description: 'Статья не на модерации' })
  async rejectBlogPost(
    @Param('postId', ParseUUIDPipe) postId: string,
    @Body() dto: RejectDto,
  ): Promise<BlogPost> {
    return this.superAdminService.rejectBlogPost(
      postId,
      dto.reason || 'Статья не соответствует требованиям',
    );
  }

  // ==================== УДАЛЕНИЕ ====================

  @Delete('events/:eventId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Удалить мероприятие (soft delete)',
    description:
      'Мягкое удаление супер-админом. Опционально: body { "reason": "Текст" }. Удалённые slug возвращают 410 при обращении.',
  })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 404, description: 'Мероприятие не найдено' })
  async deleteEvent(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: ICurrentUser,
    @Body() dto?: RejectDto,
  ): Promise<void> {
    return this.superAdminService.deleteEvent(eventId, user.sub, dto?.reason);
  }

  @Delete('blog-posts/:postId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Удалить статью блога (soft delete)',
    description:
      'Мягкое удаление супер-админом. Опционально: body { "reason": "Текст" }. Удалённые slug возвращают 410 при обращении.',
  })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 404, description: 'Статья не найдена' })
  async deleteBlogPost(
    @Param('postId', ParseUUIDPipe) postId: string,
    @CurrentUser() user: ICurrentUser,
    @Body() dto?: RejectDto,
  ): Promise<void> {
    return this.superAdminService.deleteBlogPost(postId, user.sub, dto?.reason);
  }
}
