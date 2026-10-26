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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SavedArticle, UserCertificate, UserType } from '@prisma/client';
import { CurrentUser, Roles } from '../../common/decorators';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import type { ICurrentUser } from '../../common/interfaces';
import {
  CalendarEventsQueryDto,
  CalendarEventsResponseDto,
  CalendarMonthResponseDto,
  CalendarQueryDto,
  CertificatesListResponseDto,
  CertificatesStatsDto,
  CreateUserCertificateDto,
  SaveArticleDto,
  SavedArticlesQueryDto,
  SavedArticlesListDto,
  UpdatePrivacySettingsDto,
  UpdateUserCertificateDto,
  UpdateUserProfileDto,
  UserCertificateDto,
  UserEventsQueryDto,
  UserEventsStatsDto,
  UserEventsWithStatsResponseDto,
  UserProfileResponseDto,
} from '../users/dto';
import { UsersService, UserProfile } from '../users/users.service';

@ApiTags('account')
@Controller('account')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AccountController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @Roles(UserType.USER)
  @ApiOperation({ summary: 'Получить текущий account profile' })
  @ApiResponse({
    status: 200,
    description: 'Профиль аккаунта',
    type: UserProfileResponseDto,
  })
  async getMe(@CurrentUser() user: ICurrentUser): Promise<UserProfile> {
    return this.usersService.findById(user.sub);
  }

  @Patch('me')
  @Roles(UserType.USER)
  @ApiOperation({ summary: 'Обновить профиль аккаунта' })
  @ApiResponse({
    status: 200,
    description: 'Обновлённый профиль аккаунта',
    type: UserProfileResponseDto,
  })
  async updateProfile(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: UpdateUserProfileDto,
  ): Promise<UserProfile> {
    return this.usersService.updateProfile(user.sub, dto);
  }

  @Post('me/avatar')
  @Roles(UserType.USER)
  @UseInterceptors(FileInterceptor('avatar'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Загрузить аватар аккаунта' })
  @ApiResponse({ status: 200, description: 'Профиль с новым аватаром' })
  async uploadAvatar(
    @CurrentUser() user: ICurrentUser,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UserProfile> {
    return this.usersService.uploadAvatar(user.sub, file);
  }

  @Delete('me/avatar')
  @Roles(UserType.USER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Удалить аватар аккаунта' })
  @ApiResponse({ status: 200, description: 'Профиль без аватара' })
  async deleteAvatar(@CurrentUser() user: ICurrentUser): Promise<UserProfile> {
    return this.usersService.deleteAvatar(user.sub);
  }

  @Patch('me/privacy')
  @Roles(UserType.USER)
  @ApiOperation({ summary: 'Обновить настройки приватности аккаунта' })
  @ApiResponse({
    status: 200,
    description: 'Обновлённые настройки приватности аккаунта',
  })
  async updatePrivacySettings(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: UpdatePrivacySettingsDto,
  ): Promise<UserProfile> {
    return this.usersService.updatePrivacySettings(user.sub, dto);
  }

  @Get('me/export')
  @Roles(UserType.USER)
  @ApiOperation({
    summary: 'Экспортировать данные аккаунта',
    description: 'Скачать копию всех данных пользователя в формате JSON',
  })
  @ApiResponse({
    status: 200,
    description: 'JSON с данными аккаунта',
  })
  async exportData(
    @CurrentUser() user: ICurrentUser,
  ): Promise<Record<string, any>> {
    return this.usersService.exportUserData(user.sub);
  }

  @Post('me/complete-onboarding')
  @Roles(UserType.USER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Завершить онбординг аккаунта',
  })
  @ApiResponse({ status: 200, description: 'Онбординг аккаунта завершен' })
  async completeOnboarding(
    @CurrentUser() user: ICurrentUser,
  ): Promise<UserProfile> {
    return this.usersService.completeOnboarding(user.sub);
  }

  @Post('me/complete-profile-info')
  @Roles(UserType.USER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Завершить заполнение доп. полей аккаунта',
  })
  @ApiResponse({
    status: 200,
    description: 'Профиль аккаунта с флагом profileInfoCompleted',
  })
  async completeProfileInfo(
    @CurrentUser() user: ICurrentUser,
  ): Promise<UserProfile> {
    return this.usersService.completeProfileInfo(user.sub);
  }

  @Get('me/calendar')
  @Roles(UserType.USER)
  @ApiOperation({
    summary: 'Получить календарь активности аккаунта',
    description:
      'Возвращает календарь с событиями пользователя на указанный месяц',
  })
  @ApiResponse({
    status: 200,
    description: 'Календарь активности',
    type: CalendarMonthResponseDto,
  })
  async getCalendar(
    @CurrentUser() user: ICurrentUser,
    @Query() query: CalendarQueryDto,
  ): Promise<CalendarMonthResponseDto> {
    return this.usersService.getCalendar(user.sub, query);
  }

  @Get('me/calendar/events')
  @Roles(UserType.USER)
  @ApiOperation({
    summary: 'Получить события аккаунта на дату',
    description: 'Возвращает список событий пользователя на указанную дату',
  })
  @ApiResponse({
    status: 200,
    description: 'Список событий на дату',
    type: CalendarEventsResponseDto,
  })
  async getCalendarEvents(
    @CurrentUser() user: ICurrentUser,
    @Query() query: CalendarEventsQueryDto,
  ): Promise<CalendarEventsResponseDto> {
    return this.usersService.getCalendarEvents(user.sub, query);
  }

  @Get('me/certificates')
  @Roles(UserType.USER)
  @ApiOperation({
    summary: 'Получить сертификаты аккаунта',
    description: 'Возвращает список сертификатов со статистикой',
  })
  @ApiResponse({
    status: 200,
    description: 'Список сертификатов',
    type: CertificatesListResponseDto,
  })
  async getCertificates(
    @CurrentUser() user: ICurrentUser,
    @Query('search') search?: string,
    @Query('filter') filter?: 'all' | 'verified' | 'unverified',
    @Query('locale') locale?: string,
  ): Promise<CertificatesListResponseDto> {
    return this.usersService.getCertificates(user.sub, {
      search,
      filter,
      locale,
    });
  }

  @Get('me/certificates/stats')
  @Roles(UserType.USER)
  @ApiOperation({ summary: 'Получить статистику сертификатов аккаунта' })
  @ApiResponse({
    status: 200,
    description: 'Статистика сертификатов',
    type: CertificatesStatsDto,
  })
  async getCertificatesStats(
    @CurrentUser() user: ICurrentUser,
  ): Promise<CertificatesStatsDto> {
    return this.usersService.getCertificatesStats(user.sub);
  }

  @Get('me/certificates/:id')
  @Roles(UserType.USER)
  @ApiOperation({ summary: 'Получить сертификат аккаунта по ID' })
  @ApiResponse({
    status: 200,
    description: 'Сертификат',
    type: UserCertificateDto,
  })
  async getCertificateById(
    @CurrentUser() user: ICurrentUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<UserCertificate> {
    return this.usersService.getCertificateById(user.sub, id);
  }

  @Post('me/certificates')
  @Roles(UserType.USER)
  @ApiOperation({ summary: 'Добавить сертификат аккаунта' })
  @ApiResponse({ status: 201, description: 'Созданный сертификат' })
  async createCertificate(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: CreateUserCertificateDto,
  ): Promise<UserCertificate> {
    return this.usersService.createCertificate(user.sub, dto);
  }

  @Patch('me/certificates/:id')
  @Roles(UserType.USER)
  @ApiOperation({ summary: 'Обновить сертификат аккаунта' })
  @ApiResponse({ status: 200, description: 'Обновлённый сертификат' })
  async updateCertificate(
    @CurrentUser() user: ICurrentUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserCertificateDto,
  ): Promise<UserCertificate> {
    return this.usersService.updateCertificate(user.sub, id, dto);
  }

  @Delete('me/certificates/:id')
  @Roles(UserType.USER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить сертификат аккаунта' })
  @ApiResponse({ status: 204, description: 'Сертификат удалён' })
  async deleteCertificate(
    @CurrentUser() user: ICurrentUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.usersService.deleteCertificate(user.sub, id);
  }

  @Get('me/articles')
  @Roles(UserType.USER)
  @ApiOperation({
    summary: 'Получить избранные статьи аккаунта',
    description: 'Возвращает список сохранённых статей из блога',
  })
  @ApiResponse({
    status: 200,
    description: 'Список избранных статей',
    type: SavedArticlesListDto,
  })
  async getSavedArticles(
    @CurrentUser() user: ICurrentUser,
    @Query() query: SavedArticlesQueryDto,
  ): Promise<SavedArticlesListDto> {
    return this.usersService.getSavedArticles(user.sub, {
      search: query.search,
      category: query.category,
      page: query.page,
      limit: query.limit,
    });
  }

  @Post('me/articles')
  @Roles(UserType.USER)
  @ApiOperation({ summary: 'Сохранить статью аккаунта в избранное' })
  @ApiResponse({ status: 201, description: 'Статья сохранена' })
  @ApiResponse({ status: 409, description: 'Статья уже сохранена' })
  async saveArticle(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: SaveArticleDto,
  ): Promise<SavedArticle> {
    return this.usersService.saveArticle(user.sub, dto);
  }

  @Get('me/articles/check')
  @Roles(UserType.USER)
  @ApiOperation({ summary: 'Проверить, сохранена ли статья аккаунта' })
  @ApiResponse({ status: 200, description: 'Статус сохранения' })
  async isArticleSaved(
    @CurrentUser() user: ICurrentUser,
    @Query('url') articleUrl: string,
  ): Promise<{ saved: boolean }> {
    const saved = await this.usersService.isArticleSaved(user.sub, articleUrl);
    return { saved };
  }

  @Delete('me/articles/:id')
  @Roles(UserType.USER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить статью аккаунта из избранного по ID' })
  @ApiResponse({ status: 204, description: 'Статья удалена из избранного' })
  async removeSavedArticle(
    @CurrentUser() user: ICurrentUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.usersService.removeSavedArticle(user.sub, id);
  }

  @Delete('me/articles')
  @Roles(UserType.USER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить статью аккаунта из избранного по URL' })
  @ApiResponse({ status: 204, description: 'Статья удалена из избранного' })
  async removeSavedArticleByUrl(
    @CurrentUser() user: ICurrentUser,
    @Query('url') articleUrl: string,
  ): Promise<void> {
    return this.usersService.removeSavedArticleByUrl(user.sub, articleUrl);
  }

  @Get('me/events')
  @Roles(UserType.USER)
  @ApiOperation({
    summary: 'Получить события аккаунта',
    description:
      'Страница "Мои события". Возвращает список событий с фильтрацией и статистикой. Фильтры: ALL, APPROVED, PENDING, ATTENDED, CANCELLED',
  })
  @ApiResponse({
    status: 200,
    description: 'Список событий со статистикой',
    type: UserEventsWithStatsResponseDto,
  })
  async getUserEvents(
    @CurrentUser() user: ICurrentUser,
    @Query() query: UserEventsQueryDto,
  ): Promise<UserEventsWithStatsResponseDto> {
    return this.usersService.getUserEvents(user.sub, query);
  }

  @Get('me/events/stats')
  @Roles(UserType.USER)
  @ApiOperation({
    summary: 'Получить статистику событий аккаунта',
    description: 'Быстрая статистика для страницы "Мои события"',
  })
  @ApiResponse({
    status: 200,
    description: 'Статистика событий',
    type: UserEventsStatsDto,
  })
  async getUserEventsStats(
    @CurrentUser() user: ICurrentUser,
  ): Promise<UserEventsStatsDto> {
    return this.usersService.getUserEventsStats(user.sub);
  }

  @Delete('me')
  @Roles(UserType.USER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить аккаунт (soft delete)' })
  @ApiResponse({ status: 204 })
  async deleteMe(@CurrentUser() user: ICurrentUser): Promise<void> {
    return this.usersService.softDelete(user.sub);
  }
}
