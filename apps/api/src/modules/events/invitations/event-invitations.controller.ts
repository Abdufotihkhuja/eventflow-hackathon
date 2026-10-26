import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, PermissionsGuard } from '../../../common/guards';
import { CurrentUser, RequirePermissions } from '../../../common/decorators';
import type { ICurrentUser } from '../../../common/interfaces';
import { PERMISSIONS } from '../../../common/constants/permissions.constant';
import { EventInvitationsService } from './event-invitations.service';
import { SendPrivateInvitationsDto } from './dto/send-private-invitations.dto';

/** Workspace management of personal invitations to PRIVATE events. */
@ApiTags('event-invitations')
@Controller('events/:eventId/invitations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class EventInvitationsController {
  constructor(private readonly invitations: EventInvitationsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.EVENTS_READ)
  @ApiOperation({ summary: 'List personal invitations of a PRIVATE event' })
  list(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.invitations.list(eventId, user);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.EVENTS_UPDATE)
  @ApiOperation({
    summary: 'Email personal invitations to a PRIVATE event',
    description:
      'Returns { sent, skipped }. Guests who already registered by invite are skipped.',
  })
  send(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() dto: SendPrivateInvitationsDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.invitations.send(eventId, dto, user);
  }

  @Post(':invitationId/resend')
  @RequirePermissions(PERMISSIONS.EVENTS_UPDATE)
  @ApiOperation({
    summary: 'Resend with a new link; the previous link stops working',
  })
  resend(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('invitationId', ParseUUIDPipe) invitationId: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.invitations.resend(eventId, invitationId, user);
  }

  @Post(':invitationId/revoke')
  @RequirePermissions(PERMISSIONS.EVENTS_UPDATE)
  @ApiOperation({ summary: 'Revoke a pending invitation' })
  revoke(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('invitationId', ParseUUIDPipe) invitationId: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.invitations.revoke(eventId, invitationId, user);
  }
}
