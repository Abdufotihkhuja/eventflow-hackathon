import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiParam } from '@nestjs/swagger';
import {
  CurrentUser,
  RequirePermissions,
  Roles,
} from '../../../common/decorators';
import {
  JwtAuthGuard,
  PermissionsGuard,
  RolesGuard,
} from '../../../common/guards';
import type { ICurrentUser } from '../../../common/interfaces';
import { UserType } from '@prisma/client';
import { PERMISSIONS } from '../../../common/constants/permissions.constant';
import { ContactsService } from './contacts.service';
import { ContactRequestEntity, ContactRequestStatsEntity } from './entities';
import {
  CreateContactRequestDto,
  UpdateContactStatusDto,
  ContactRequestQueryDto,
} from './dto';

@ApiTags('organizations/contacts')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  // ==================== ENDPOINTS ДЛЯ ПОЛЬЗОВАТЕЛЕЙ ====================

  @Post('organizations/:id/contact')
  @Roles(UserType.USER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Отправить заявку на связь с организатором' })
  @ApiParam({ name: 'id', description: 'ID организации' })
  @ApiResponse({ status: 201, description: 'Заявка успешно отправлена' })
  @ApiResponse({ status: 404, description: 'Организация не найдена' })
  async create(
    @CurrentUser() user: ICurrentUser,
    @Param('id', ParseUUIDPipe) organizationId: string,
    @Body() dto: CreateContactRequestDto,
  ): Promise<void> {
    await this.contactsService.create(user.sub, organizationId, dto);
  }

  // ==================== ENDPOINTS ДЛЯ ОРГАНИЗАТОРОВ ====================

  @Get('organizations/contacts')
  @Roles(UserType.ORGANIZATION, UserType.MEMBER)
  @RequirePermissions(PERMISSIONS.CONTACTS_READ)
  @ApiOperation({ summary: 'Получить список заявок на связь' })
  @ApiResponse({
    status: 200,
    description: 'Список заявок',
    type: [ContactRequestEntity],
  })
  async findAll(
    @CurrentUser() user: ICurrentUser,
    @Query() query: ContactRequestQueryDto,
  ): Promise<{
    data: ContactRequestEntity[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const organizationId =
      user.type === UserType.ORGANIZATION ? user.sub : user.organizationId!;

    return this.contactsService.findAll(organizationId, query);
  }

  @Get('organizations/contacts/stats')
  @Roles(UserType.ORGANIZATION, UserType.MEMBER)
  @RequirePermissions(PERMISSIONS.CONTACTS_READ)
  @ApiOperation({ summary: 'Получить статистику заявок' })
  @ApiResponse({
    status: 200,
    description: 'Статистика заявок',
    type: ContactRequestStatsEntity,
  })
  async getStats(
    @CurrentUser() user: ICurrentUser,
  ): Promise<ContactRequestStatsEntity> {
    const organizationId =
      user.type === UserType.ORGANIZATION ? user.sub : user.organizationId!;

    return this.contactsService.getStats(organizationId);
  }

  @Get('organizations/contacts/:id')
  @Roles(UserType.ORGANIZATION, UserType.MEMBER)
  @RequirePermissions(PERMISSIONS.CONTACTS_READ)
  @ApiOperation({ summary: 'Получить заявку по ID' })
  @ApiParam({ name: 'id', description: 'ID заявки' })
  @ApiResponse({
    status: 200,
    description: 'Заявка найдена',
    type: ContactRequestEntity,
  })
  @ApiResponse({ status: 404, description: 'Заявка не найдена' })
  async findOne(
    @CurrentUser() user: ICurrentUser,
    @Param('id', ParseUUIDPipe) requestId: string,
  ): Promise<ContactRequestEntity> {
    const organizationId =
      user.type === UserType.ORGANIZATION ? user.sub : user.organizationId!;

    return this.contactsService.findById(organizationId, requestId);
  }

  @Patch('organizations/contacts/:id/status')
  @Roles(UserType.ORGANIZATION, UserType.MEMBER)
  @RequirePermissions(PERMISSIONS.CONTACTS_UPDATE)
  @ApiOperation({ summary: 'Обновить статус заявки' })
  @ApiParam({ name: 'id', description: 'ID заявки' })
  @ApiResponse({
    status: 200,
    description: 'Статус обновлен',
    type: ContactRequestEntity,
  })
  @ApiResponse({ status: 404, description: 'Заявка не найдена' })
  async updateStatus(
    @CurrentUser() user: ICurrentUser,
    @Param('id', ParseUUIDPipe) requestId: string,
    @Body() dto: UpdateContactStatusDto,
  ): Promise<ContactRequestEntity> {
    const organizationId =
      user.type === UserType.ORGANIZATION ? user.sub : user.organizationId!;

    return this.contactsService.updateStatus(organizationId, requestId, dto);
  }
}
