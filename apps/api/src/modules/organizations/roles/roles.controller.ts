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
import { UserType, OrganizationRole } from '@prisma/client';
import { CreateRoleDto, UpdateRoleDto } from './dto';
import { RolesService } from './roles.service';

@ApiTags('organization-roles')
@Controller('organizations/roles')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @Roles(UserType.ORGANIZATION, UserType.MEMBER)
  @RequirePermissions(PERMISSIONS.ROLES_MANAGE)
  @ApiOperation({ summary: 'Создать роль' })
  @ApiResponse({ status: 201 })
  async create(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: CreateRoleDto,
  ): Promise<OrganizationRole> {
    const orgId =
      user.type === UserType.ORGANIZATION ? user.sub : user.organizationId!;
    return this.rolesService.create(orgId, dto, user);
  }

  @Get()
  @Roles(UserType.ORGANIZATION, UserType.MEMBER)
  @RequirePermissions(PERMISSIONS.MEMBERS_READ)
  @ApiOperation({ summary: 'Получить список ролей' })
  @ApiResponse({ status: 200 })
  async findAll(
    @CurrentUser() user: ICurrentUser,
  ): Promise<OrganizationRole[]> {
    const orgId =
      user.type === UserType.ORGANIZATION ? user.sub : user.organizationId!;
    return this.rolesService.findAll(orgId);
  }

  @Get(':roleId')
  @Roles(UserType.ORGANIZATION, UserType.MEMBER)
  @RequirePermissions(PERMISSIONS.MEMBERS_READ)
  @ApiOperation({ summary: 'Получить роль по ID' })
  @ApiResponse({ status: 200 })
  async findOne(
    @CurrentUser() user: ICurrentUser,
    @Param('roleId', ParseUUIDPipe) roleId: string,
  ): Promise<OrganizationRole> {
    const orgId =
      user.type === UserType.ORGANIZATION ? user.sub : user.organizationId!;
    return this.rolesService.findById(orgId, roleId);
  }

  @Patch(':roleId')
  @Roles(UserType.ORGANIZATION, UserType.MEMBER)
  @RequirePermissions(PERMISSIONS.ROLES_MANAGE)
  @ApiOperation({ summary: 'Обновить роль' })
  @ApiResponse({ status: 200 })
  async update(
    @CurrentUser() user: ICurrentUser,
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @Body() dto: UpdateRoleDto,
  ): Promise<OrganizationRole> {
    const orgId =
      user.type === UserType.ORGANIZATION ? user.sub : user.organizationId!;
    return this.rolesService.update(orgId, roleId, dto, user);
  }

  @Delete(':roleId')
  @Roles(UserType.ORGANIZATION, UserType.MEMBER)
  @RequirePermissions(PERMISSIONS.ROLES_MANAGE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить роль' })
  @ApiResponse({ status: 204 })
  async delete(
    @CurrentUser() user: ICurrentUser,
    @Param('roleId', ParseUUIDPipe) roleId: string,
  ): Promise<void> {
    const orgId =
      user.type === UserType.ORGANIZATION ? user.sub : user.organizationId!;
    return this.rolesService.delete(orgId, roleId);
  }
}
