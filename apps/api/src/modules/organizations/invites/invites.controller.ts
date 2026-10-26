import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { InviteStatus, UserType } from '@prisma/client';
import {
  CurrentUser,
  Public,
  RequirePermissions,
  Roles,
} from '../../../common/decorators';
import {
  JwtAuthGuard,
  OptionalJwtAuthGuard,
  PermissionsGuard,
  RolesGuard,
} from '../../../common/guards';
import type { ICurrentUser } from '../../../common/interfaces';
import { PERMISSIONS } from '../../../common/constants/permissions.constant';
import { InvitesService } from './invites.service';
import { AcceptInviteDto, CreateInviteDto, DeclineInviteDto } from './dto';
import {
  AcceptInviteResultDto,
  InviteInspectionDto,
  InviteSummaryDto,
  MyInviteDto,
} from './dto/invite-response.dto';

@ApiTags('organization-invites')
@Controller('organizations/invites')
export class InvitesController {
  constructor(private readonly invitesService: InvitesService) {}

  // ==================== ADMIN ====================

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(UserType.ORGANIZATION, UserType.MEMBER)
  @RequirePermissions(PERMISSIONS.MEMBERS_CREATE)
  @ApiOperation({ summary: 'Пригласить пользователя в организацию' })
  @ApiResponse({ status: 201, type: InviteSummaryDto })
  create(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: CreateInviteDto,
  ): Promise<InviteSummaryDto> {
    return this.invitesService.createInvite(
      this.resolveOrgId(user),
      dto,
      user.sub,
    );
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(UserType.ORGANIZATION, UserType.MEMBER)
  @RequirePermissions(PERMISSIONS.MEMBERS_READ)
  @ApiOperation({ summary: 'Список приглашений организации' })
  @ApiResponse({ status: 200, type: [InviteSummaryDto] })
  list(
    @CurrentUser() user: ICurrentUser,
    @Query('status') status?: InviteStatus,
  ): Promise<InviteSummaryDto[]> {
    return this.invitesService.listInvites(this.resolveOrgId(user), status);
  }

  @Post(':inviteId/resend')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(UserType.ORGANIZATION, UserType.MEMBER)
  @RequirePermissions(PERMISSIONS.MEMBERS_UPDATE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Повторно отправить приглашение' })
  @ApiResponse({ status: 200, type: InviteSummaryDto })
  resend(
    @CurrentUser() user: ICurrentUser,
    @Param('inviteId', ParseUUIDPipe) inviteId: string,
  ): Promise<InviteSummaryDto> {
    return this.invitesService.resendInvite(this.resolveOrgId(user), inviteId);
  }

  @Delete(':inviteId')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(UserType.ORGANIZATION, UserType.MEMBER)
  @RequirePermissions(PERMISSIONS.MEMBERS_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Отозвать приглашение' })
  @ApiResponse({ status: 204 })
  revoke(
    @CurrentUser() user: ICurrentUser,
    @Param('inviteId', ParseUUIDPipe) inviteId: string,
  ): Promise<void> {
    return this.invitesService.revokeInvite(this.resolveOrgId(user), inviteId);
  }

  // ==================== ПРИГЛАШЁННЫЙ (свои приглашения) ====================
  // Объявлены до маршрутов с :token: иначе Nest примет "mine" за токен.

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Приглашения, адресованные текущему пользователю',
  })
  @ApiResponse({ status: 200, type: [MyInviteDto] })
  listMine(@CurrentUser() user: ICurrentUser): Promise<MyInviteDto[]> {
    return this.invitesService.listMyInvites(this.toViewer(user));
  }

  @Post('mine/:inviteId/accept')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Принять своё приглашение из кабинета (без токена из письма)',
  })
  @ApiResponse({ status: 200, type: AcceptInviteResultDto })
  acceptMine(
    @CurrentUser() user: ICurrentUser,
    @Param('inviteId', ParseUUIDPipe) inviteId: string,
  ): Promise<AcceptInviteResultDto> {
    return this.invitesService.acceptMyInvite(inviteId, this.toViewer(user));
  }

  @Post('mine/:inviteId/decline')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Отказаться от приглашения (можно с комментарием)',
  })
  @ApiResponse({ status: 204 })
  declineMine(
    @CurrentUser() user: ICurrentUser,
    @Param('inviteId', ParseUUIDPipe) inviteId: string,
    @Body() dto: DeclineInviteDto,
  ): Promise<void> {
    return this.invitesService.declineMyInvite(
      inviteId,
      this.toViewer(user),
      dto.reason,
    );
  }

  // ==================== PUBLIC (token-gated) ====================

  @Get(':token')
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Проверить приглашение по токену (до принятия)' })
  @ApiResponse({ status: 200, type: InviteInspectionDto })
  inspect(
    @Param('token') token: string,
    @CurrentUser() user: ICurrentUser | undefined,
  ): Promise<InviteInspectionDto> {
    return this.invitesService.inspectInvite(
      token,
      user ? { email: user.email } : undefined,
    );
  }

  @Post(':token/accept')
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Принять приглашение' })
  @ApiResponse({ status: 200, type: AcceptInviteResultDto })
  accept(
    @Param('token') token: string,
    @Body() dto: AcceptInviteDto,
    @CurrentUser() user: ICurrentUser | undefined,
  ): Promise<AcceptInviteResultDto> {
    return this.invitesService.acceptInvite(token, {
      password: dto.password,
      viewer: user ? this.toViewer(user) : undefined,
    });
  }

  /** Maps the session actor to the minimal viewer the invite flow needs. */
  private toViewer(user: ICurrentUser) {
    return {
      email: user.email,
      accountId: user.accountId,
      userId: user.type === UserType.USER ? user.sub : undefined,
    };
  }

  private resolveOrgId(user: ICurrentUser): string {
    return user.type === UserType.ORGANIZATION
      ? user.sub
      : user.organizationId!;
  }
}
