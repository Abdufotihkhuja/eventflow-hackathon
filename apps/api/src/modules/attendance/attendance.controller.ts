import {
  Controller,
  Get,
  Post,
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
import { AttendanceService } from './attendance.service';
import {
  CheckInDto,
  AttendanceQueryDto,
  RegistrationQrDto,
  SelfCheckInResultDto,
} from './dto';
import { JwtAuthGuard, PermissionsGuard } from '../../common/guards';
import { CurrentUser, RequirePermissions } from '../../common/decorators';
import type { ICurrentUser } from '../../common/interfaces';
import { PERMISSIONS } from '../../common/constants/permissions.constant';

// Контроллер для пользователей (получение QR-кода)
@ApiTags('attendance')
@Controller('registrations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UserAttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get(':id/qr')
  @ApiOperation({ summary: 'Получить QR-код регистрации' })
  @ApiResponse({
    status: 200,
    description: 'QR-код регистрации (data-URL PNG)',
    type: RegistrationQrDto,
  })
  async getQrCode(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    const qrCode = await this.attendanceService.generateQrCode(id, user);
    return { qrCode };
  }
}

// Контроллер для упрощённого check-in (без eventId)
@ApiTags('attendance')
@Controller('attendance')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('check-in')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_CHECKIN)
  @ApiOperation({
    summary: 'Отметить посещение по QR коду',
    description:
      'Упрощённый check-in: автоматически определяет событие из QR кода. После успешного check-in возвращает данные участника и ссылки на скачивание билета в двух вариантах дизайна',
  })
  async checkInByQrCode(
    @Body() dto: CheckInDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.attendanceService.checkInByQrCode(dto, user);
  }
}

// Контроллер для самостоятельного check-in участника
@ApiTags('attendance')
@Controller('events')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SelfCheckInController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post(':eventId/attendance/self-check-in')
  @ApiOperation({
    summary: 'Самостоятельный check-in участника',
    description:
      'Участник сканирует QR «один для всех» (eventflow.uz/check-in?eventId=...) и отмечает себя сам. Для многодневных событий — один check-in на день (UTC).',
  })
  @ApiResponse({
    status: 201,
    description: 'Участник отмечен',
    type: SelfCheckInResultDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Мероприятие ещё не началось или уже завершилось',
  })
  @ApiResponse({ status: 403, description: 'Доступно только для пользователей' })
  @ApiResponse({
    status: 404,
    description: 'Регистрация не найдена или не подтверждена',
  })
  @ApiResponse({ status: 409, description: 'Участник уже отмечен сегодня' })
  async selfCheckIn(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.attendanceService.selfCheckIn(eventId, user);
  }
}

// Контроллер для организаторов (отчёты посещаемости)
@ApiTags('event-attendance')
@Controller('events/:eventId/attendance')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class EventAttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.ATTENDANCE_READ)
  @ApiOperation({ summary: 'Получить отчёт посещаемости' })
  async getReport(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Query() query: AttendanceQueryDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.attendanceService.getAttendanceReport(eventId, query, user);
  }

  @Get('stats')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_READ)
  @ApiOperation({ summary: 'Получить статистику посещаемости' })
  async getStats(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.attendanceService.getAttendanceStats(eventId, user);
  }

  @Get('check-in-landing-qr')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_READ)
  @ApiOperation({
    summary: 'QR «один для всех»',
    description:
      'QR ведёт на публичный сайт (eventflow.uz/check-in?eventId=...). Участники сканируют его при входе.',
  })
  async getCheckInLandingQr(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    const qrCode = await this.attendanceService.generateEventCheckInLandingQr(
      eventId,
      user,
    );
    return { qrCode };
  }
}
