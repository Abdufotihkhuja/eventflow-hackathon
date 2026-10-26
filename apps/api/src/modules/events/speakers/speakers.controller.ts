import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { SpeakersService } from './speakers.service';
import {
  CreateSpeakerDto,
  UpdateSpeakerDto,
  InviteSpeakerDto,
  AcceptSpeakerInvitationDto,
  RejectSpeakerInvitationDto,
  ReorderSpeakersDto,
} from './dto';
import {
  JwtAuthGuard,
  PermissionsGuard,
  RolesGuard,
} from '../../../common/guards';
import {
  CurrentUser,
  RequirePermissions,
  Public,
  Roles,
} from '../../../common/decorators';
import type { ICurrentUser } from '../../../common/interfaces';
import { PERMISSIONS } from '../../../common/constants/permissions.constant';
import { UserType } from '@prisma/client';

@ApiTags('speakers')
@Controller('events/:eventId/speakers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class SpeakersController {
  constructor(private readonly speakersService: SpeakersService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.EVENTS_UPDATE)
  @ApiOperation({ summary: 'Добавить спикера' })
  async create(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() dto: CreateSpeakerDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.speakersService.create(eventId, dto, user);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.EVENTS_READ)
  @ApiOperation({ summary: 'Получить спикеров события' })
  async findAll(@Param('eventId', ParseUUIDPipe) eventId: string) {
    return this.speakersService.findByEvent(eventId);
  }

  @Patch('reorder')
  @RequirePermissions(PERMISSIONS.EVENTS_UPDATE)
  @ApiOperation({ summary: 'Изменить порядок спикеров' })
  async reorder(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() dto: ReorderSpeakersDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.speakersService.reorder(eventId, dto.speakerIds, user);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.EVENTS_UPDATE)
  @ApiOperation({ summary: 'Обновить спикера' })
  async update(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSpeakerDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.speakersService.update(eventId, id, dto, user);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.EVENTS_UPDATE)
  @ApiOperation({ summary: 'Удалить спикера' })
  async delete(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    await this.speakersService.delete(eventId, id, user);
    return { message: 'Спикер удалён' };
  }

  // === Speaker Invitation Endpoints ===

  @Post('invite')
  @RequirePermissions(PERMISSIONS.EVENTS_UPDATE)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Отправить приглашение спикеру' })
  @ApiResponse({
    status: 201,
    description: 'Приглашение успешно отправлено',
  })
  @ApiResponse({
    status: 409,
    description: 'Спикер с таким email уже приглашен',
  })
  async inviteSpeaker(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() dto: InviteSpeakerDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.speakersService.inviteSpeaker(eventId, dto, user);
  }

  @Post(':speakerId/resend-invitation')
  @RequirePermissions(PERMISSIONS.EVENTS_UPDATE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Повторно отправить приглашение спикеру' })
  @ApiResponse({ status: 200, description: 'Приглашение успешно отправлено' })
  async resendInvitation(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('speakerId', ParseUUIDPipe) speakerId: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.speakersService.resendInvitation(eventId, speakerId, user);
  }
}

// === Public Speaker Invitation Controller ===

@ApiTags('speaker-invitations')
@Controller('speakers/invitation')
export class SpeakerInvitationsController {
  constructor(private readonly speakersService: SpeakersService) {}

  @Get(':token')
  @Public()
  @ApiOperation({ summary: 'Получить информацию о приглашении (публичный)' })
  @ApiResponse({
    status: 200,
    description: 'Информация о приглашении',
  })
  @ApiResponse({
    status: 404,
    description: 'Приглашение не найдено',
  })
  async getInvitationInfo(@Param('token') token: string) {
    return this.speakersService.findByInvitationToken(token);
  }

  @Post('accept')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.USER)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Принять приглашение спикера (требует авторизации User)',
  })
  @ApiResponse({
    status: 200,
    description: 'Приглашение успешно принято',
  })
  @ApiResponse({
    status: 400,
    description: 'Email не совпадает или срок действия истек',
  })
  async acceptInvitation(
    @Body() dto: AcceptSpeakerInvitationDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.speakersService.acceptInvitation(dto.token, user.sub);
  }

  @Post('reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.USER)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Отклонить приглашение спикера (требует авторизации User)',
  })
  @ApiResponse({
    status: 200,
    description: 'Приглашение успешно отклонено',
  })
  async rejectInvitation(
    @Body() dto: RejectSpeakerInvitationDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.speakersService.rejectInvitation(dto.token, user.sub, dto.reason);
  }
}
