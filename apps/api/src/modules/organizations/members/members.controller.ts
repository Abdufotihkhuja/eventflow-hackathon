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
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  Public,
  RequirePermissions,
  Roles,
} from '../../../common/decorators';
import {
  JwtAuthGuard,
  PermissionsGuard,
  RolesGuard,
} from '../../../common/guards';
import type { ICurrentUser } from '../../../common/interfaces';
import { PERMISSIONS } from '../../../common/constants/permissions.constant';
import { UserType } from '@prisma/client';
import {
  ActivateAccountDto,
  CreateMemberDto,
  UpdateMemberDto,
  UpdateMemberPermissionsDto,
} from './dto';
import { MembersService } from './members.service';
import type { OrganizationMemberWithAccess } from './members.repository';
import { InviteSummaryDto } from '../invites/dto/invite-response.dto';

@ApiTags('organization-members')
@Controller('organizations/members')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  // ==================== ORGANIZATION MANAGEMENT ====================

  @Post()
  @Roles(UserType.ORGANIZATION, UserType.MEMBER)
  @RequirePermissions(PERMISSIONS.MEMBERS_CREATE)
  @ApiOperation({
    summary: 'Пригласить сотрудника организации',
    description:
      'Legacy-маршрут делегирует во flow приглашений при sendInvitation=true. ' +
      'sendInvitation=false отклоняется; новым клиентам следует использовать ' +
      'POST /organizations/invites.',
  })
  @ApiResponse({ status: 201 })
  @ApiResponse({
    status: 403,
    description: 'Прямое создание ACTIVE-сотрудника запрещено',
  })
  async create(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: CreateMemberDto,
  ): Promise<OrganizationMemberWithAccess | InviteSummaryDto> {
    const orgId =
      user.type === UserType.ORGANIZATION ? user.sub : user.organizationId!;
    return this.membersService.create(orgId, dto);
  }

  @Get()
  @Roles(UserType.ORGANIZATION, UserType.MEMBER)
  @RequirePermissions(PERMISSIONS.MEMBERS_READ)
  @ApiOperation({ summary: 'Получить список сотрудников' })
  @ApiResponse({ status: 200 })
  async findAll(
    @CurrentUser() user: ICurrentUser,
  ): Promise<OrganizationMemberWithAccess[]> {
    const orgId =
      user.type === UserType.ORGANIZATION ? user.sub : user.organizationId!;
    return this.membersService.findAll(orgId);
  }

  @Get(':memberId')
  @Roles(UserType.ORGANIZATION, UserType.MEMBER)
  @RequirePermissions(PERMISSIONS.MEMBERS_READ)
  @ApiOperation({ summary: 'Получить сотрудника по ID' })
  @ApiResponse({ status: 200 })
  async findOne(
    @CurrentUser() user: ICurrentUser,
    @Param('memberId', ParseUUIDPipe) memberId: string,
  ): Promise<OrganizationMemberWithAccess> {
    const orgId =
      user.type === UserType.ORGANIZATION ? user.sub : user.organizationId!;
    return this.membersService.findById(orgId, memberId);
  }

  @Patch(':memberId')
  @Roles(UserType.ORGANIZATION, UserType.MEMBER)
  @RequirePermissions(PERMISSIONS.MEMBERS_UPDATE)
  @ApiOperation({ summary: 'Обновить сотрудника' })
  @ApiResponse({ status: 200 })
  async update(
    @CurrentUser() user: ICurrentUser,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Body() dto: UpdateMemberDto,
  ): Promise<OrganizationMemberWithAccess> {
    const orgId =
      user.type === UserType.ORGANIZATION ? user.sub : user.organizationId!;
    return this.membersService.update(orgId, memberId, dto, user);
  }

  @Delete(':memberId')
  @Roles(UserType.ORGANIZATION, UserType.MEMBER)
  @RequirePermissions(PERMISSIONS.MEMBERS_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить сотрудника' })
  @ApiResponse({ status: 204 })
  async delete(
    @CurrentUser() user: ICurrentUser,
    @Param('memberId', ParseUUIDPipe) memberId: string,
  ): Promise<void> {
    const orgId =
      user.type === UserType.ORGANIZATION ? user.sub : user.organizationId!;
    return this.membersService.delete(orgId, memberId);
  }

  @Patch(':memberId/permissions')
  @Roles(UserType.ORGANIZATION, UserType.MEMBER)
  @RequirePermissions(PERMISSIONS.ROLES_MANAGE)
  @ApiOperation({ summary: 'Обновить индивидуальные права сотрудника' })
  @ApiResponse({ status: 200 })
  async updatePermissions(
    @CurrentUser() user: ICurrentUser,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Body() dto: UpdateMemberPermissionsDto,
  ): Promise<OrganizationMemberWithAccess> {
    const orgId =
      user.type === UserType.ORGANIZATION ? user.sub : user.organizationId!;
    return this.membersService.updatePermissions(orgId, memberId, dto, user);
  }

  @Post(':memberId/resend-invitation')
  @Roles(UserType.ORGANIZATION, UserType.MEMBER)
  @RequirePermissions(PERMISSIONS.MEMBERS_UPDATE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Повторная отправка приглашения сотруднику' })
  @ApiResponse({ status: 200, description: 'Приглашение успешно отправлено' })
  async resendInvitation(
    @CurrentUser() user: ICurrentUser,
    @Param('memberId', ParseUUIDPipe) memberId: string,
  ): Promise<{ message: string }> {
    const orgId =
      user.type === UserType.ORGANIZATION ? user.sub : user.organizationId!;
    await this.membersService.resendInvitation(orgId, memberId);
    return { message: 'Приглашение успешно отправлено' };
  }

  @Post('activate')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Активация аккаунта сотрудника по токену' })
  @ApiResponse({ status: 200, description: 'Аккаунт успешно активирован' })
  async activateAccount(
    @Body() dto: ActivateAccountDto,
  ): Promise<{ message: string }> {
    await this.membersService.activateAccount(dto.token, dto.password);
    return { message: 'Аккаунт успешно активирован' };
  }
}
