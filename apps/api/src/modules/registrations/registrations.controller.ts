import {
  Controller,
  Get,
  Post,
  Patch,
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
  ApiResponse,
} from '@nestjs/swagger';
import { RegistrationsService } from './registrations.service';
import {
  CreateRegistrationDto,
  RegistrationQueryDto,
  MyRegistrationsQueryDto,
  RejectRegistrationDto,
  CancelRegistrationDto,
  UpdateRegistrationDto,
  RegistrationDto,
  PaginatedRegistrationsDto,
  BulkRegistrationIdsDto,
  BulkRejectRegistrationsDto,
} from './dto';
import { JwtAuthGuard, PermissionsGuard } from '../../common/guards';
import { CurrentUser, RequirePermissions } from '../../common/decorators';
import type { ICurrentUser } from '../../common/interfaces';
import { PERMISSIONS } from '../../common/constants/permissions.constant';

// Контроллер для пользователей (регистрация на события)
@ApiTags('registrations')
@Controller()
export class RegistrationsController {
  constructor(private readonly registrationsService: RegistrationsService) {}

  @Post('events/:eventId/register')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Зарегистрироваться на мероприятие',
    description:
      'Для INVITE_ONLY событий требуется передать inviteCode в query параметре',
  })
  @ApiResponse({
    status: 201,
    description: 'Созданная регистрация',
    type: RegistrationDto,
  })
  async register(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() dto: CreateRegistrationDto,
    @Query('inviteCode') inviteCode: string | undefined,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.registrationsService.register(eventId, dto, user, inviteCode);
  }

  @Get('my-registrations')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Мои регистрации',
    description:
      'Страница /profile/events. Фильтры: ALL, APPROVED, PENDING, ATTENDED, CANCELLED',
  })
  @ApiResponse({
    status: 200,
    description: 'Пагинированный список регистраций пользователя',
    type: PaginatedRegistrationsDto,
  })
  async findMyRegistrations(
    @Query() query: MyRegistrationsQueryDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.registrationsService.findMyRegistrations(query, user);
  }

  @Patch('registrations/:id/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Отменить свою регистрацию' })
  @ApiResponse({
    status: 200,
    description: 'Обновлённая (отменённая) регистрация',
    type: RegistrationDto,
  })
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.registrationsService.cancel(id, user);
  }

  @Patch('registrations/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Обновить регистрацию',
    description:
      'Обновить роль, даты перелёта и дни подготовки для календаря активности',
  })
  async updateMyRegistration(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRegistrationDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.registrationsService.updateMyRegistration(id, dto, user);
  }
}

// Контроллер для организаторов (управление регистрациями)
@ApiTags('event-registrations')
@Controller('events/:eventId/registrations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class EventRegistrationsController {
  constructor(private readonly registrationsService: RegistrationsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.EVENTS_READ)
  @ApiOperation({ summary: 'Получить регистрации события' })
  async findAll(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Query() query: RegistrationQueryDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.registrationsService.findByEvent(eventId, query, user);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.EVENTS_READ)
  @ApiOperation({ summary: 'Получить регистрацию по ID' })
  async findOne(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.registrationsService.findByIdForOrganizer(eventId, id, user);
  }

  @Patch(':id/approve')
  @RequirePermissions(PERMISSIONS.EVENTS_UPDATE)
  @ApiOperation({ summary: 'Одобрить регистрацию' })
  async approve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.registrationsService.approve(id, user);
  }

  @Patch(':id/reject')
  @RequirePermissions(PERMISSIONS.EVENTS_UPDATE)
  @ApiOperation({ summary: 'Отклонить регистрацию' })
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectRegistrationDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.registrationsService.reject(id, dto, user);
  }

  @Patch(':id/cancel')
  @RequirePermissions(PERMISSIONS.EVENTS_UPDATE)
  @ApiOperation({
    summary: 'Отменить участие участника (организатор)',
    description:
      'Переводит ожидающую или одобренную регистрацию в статус CANCELLED. Освобождает место; отменённый билет/QR не действует.',
  })
  async cancelByOrganizer(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelRegistrationDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.registrationsService.cancelByOrganizer(id, dto, user);
  }

  @Patch(':id/revoke')
  @RequirePermissions(PERMISSIONS.EVENTS_UPDATE)
  @ApiOperation({
    summary: 'Отозвать подтверждение участия (организатор)',
    description:
      'Возвращает одобренную (APPROVED) регистрацию в статус PENDING на повторное рассмотрение. Билет/QR перестаёт действовать до нового одобрения.',
  })
  async revokeApproval(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelRegistrationDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.registrationsService.revokeApproval(id, dto, user);
  }

  @Post('bulk-approve')
  @RequirePermissions(PERMISSIONS.EVENTS_UPDATE)
  @ApiOperation({ summary: 'Массовое одобрение регистраций' })
  async bulkApprove(
    @Body() body: BulkRegistrationIdsDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    const count = await this.registrationsService.bulkApprove(body.ids, user);
    return { approved: count };
  }

  @Post('bulk-reject')
  @RequirePermissions(PERMISSIONS.EVENTS_UPDATE)
  @ApiOperation({ summary: 'Массовое отклонение регистраций' })
  async bulkReject(
    @Body() body: BulkRejectRegistrationsDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    const count = await this.registrationsService.bulkReject(
      body.ids,
      body.reason,
      user,
    );
    return { rejected: count };
  }
}
