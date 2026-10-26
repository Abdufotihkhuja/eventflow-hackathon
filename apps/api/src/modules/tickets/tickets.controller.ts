import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  ParseUUIDPipe,
  UseGuards,
  Res,
  StreamableFile,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { TicketsService } from './tickets.service';
import {
  GenerateTicketDto,
  DownloadTicketsDto,
  TicketDesign,
  EventTicketViewModelDto,
  ValidateTicketDto,
  TicketValidationResultDto,
} from './dto';
import { ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard, PermissionsGuard } from '../../common/guards';
import { CurrentUser, RequirePermissions } from '../../common/decorators';
import type { ICurrentUser } from '../../common/interfaces';
import { PERMISSIONS } from '../../common/constants/permissions.constant';
import { UserType } from '@prisma/client';
import { FileStorageService } from '../storage/application/file-storage.service';
import { TicketViewService } from './application/ticket-view.service';
import { TicketValidationService } from './application/ticket-validation.service';
import { TicketCheckInService } from './application/ticket-check-in.service';

/**
 * Контроллер для пользователей — скачивание своих билетов
 */
@ApiTags('tickets')
@Controller('registrations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UserTicketsController {
  constructor(
    private readonly ticketsService: TicketsService,
    private readonly storage: FileStorageService,
  ) {}

  @Get(':id/ticket')
  @ApiOperation({ summary: 'Скачать свой билет' })
  @ApiQuery({
    name: 'design',
    enum: TicketDesign,
    required: false,
    description: 'Дизайн билета: branded (по умолчанию) или simple',
  })
  @ApiResponse({ status: 200, description: 'PDF билет' })
  async downloadMyTicket(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: GenerateTicketDto,
    @CurrentUser() user: ICurrentUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile | { status: string; jobId: string; message: string }> {
    const design = query.design || TicketDesign.BRANDED;
    const ticket = await this.ticketsService.generateMyTicket(id, design, user);

    if (ticket.status === 'processing') {
      res.status(HttpStatus.ACCEPTED);
      return ticket;
    }

    const fileStream = this.storage.createReadStream(ticket.file.path);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(ticket.file.filename)}"`,
    });

    return new StreamableFile(fileStream);
  }
}

/**
 * Контроллер для организаторов — скачивание билетов участников
 */
@ApiTags('event-tickets')
@Controller('events/:eventId/tickets')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class EventTicketsController {
  constructor(
    private readonly ticketsService: TicketsService,
    private readonly storage: FileStorageService,
  ) {}

  @Get(':registrationId')
  @RequirePermissions(PERMISSIONS.EVENTS_READ)
  @ApiOperation({ summary: 'Скачать билет участника' })
  @ApiQuery({
    name: 'design',
    enum: TicketDesign,
    required: false,
    description: 'Дизайн билета: branded (по умолчанию) или simple',
  })
  @ApiResponse({ status: 200, description: 'PDF билет' })
  async downloadParticipantTicket(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('registrationId', ParseUUIDPipe) registrationId: string,
    @Query() query: GenerateTicketDto,
    @CurrentUser() user: ICurrentUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile | { status: string; jobId: string; message: string }> {
    const design = query.design || TicketDesign.BRANDED;
    const ticket = await this.ticketsService.generateTicketForOrganizer(
      eventId,
      registrationId,
      design,
      user,
    );

    if (ticket.status === 'processing') {
      res.status(HttpStatus.ACCEPTED);
      return ticket;
    }

    const fileStream = this.storage.createReadStream(ticket.file.path);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(ticket.file.filename)}"`,
    });

    return new StreamableFile(fileStream);
  }

  @Post('download-all')
  @RequirePermissions(PERMISSIONS.EVENTS_READ)
  @ApiOperation({
    summary: 'Скачать все билеты (ZIP)',
    description: 'Скачивает билеты всех одобренных участников в ZIP архиве',
  })
  @ApiResponse({ status: 200, description: 'ZIP архив с билетами' })
  async downloadAllTickets(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() dto: DownloadTicketsDto,
    @CurrentUser() user: ICurrentUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile | { status: string; jobId: string; message: string }> {
    const ticket = await this.ticketsService.generateAllTicketsZip(
      eventId,
      dto,
      user,
    );

    if (ticket.status === 'processing') {
      res.status(HttpStatus.ACCEPTED);
      return ticket;
    }

    const fileStream = this.storage.createReadStream(ticket.file.path);

    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(ticket.file.filename)}"`,
    });

    return new StreamableFile(fileStream);
  }
}

/**
 * Контроллер билета пользователя для конкретного события — premium web-view.
 */
@ApiTags('tickets')
@Controller('events')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MyEventTicketController {
  constructor(private readonly ticketViewService: TicketViewService) {}

  @Get(':eventId/my-ticket')
  @ApiOperation({
    summary: 'Мой билет на мероприятие',
    description:
      'Возвращает view-model дефолтного e-ticket текущего пользователя для указанного события. ' +
      'Билет создаётся автоматически при регистрации (idempotent).',
  })
  @ApiResponse({ status: 200, type: EventTicketViewModelDto })
  @ApiResponse({ status: 404, description: 'Регистрация на это мероприятие не найдена' })
  async getMyTicket(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: ICurrentUser,
  ): Promise<EventTicketViewModelDto> {
    return this.ticketViewService.getMyTicketViewModel(eventId, user);
  }
}

/**
 * Staff/organizer scanner endpoints — структурированный response для UI.
 *
 * - `POST /api/v1/tickets/validate`  — preview-only, не пишет в Attendance.
 * - `POST /api/v1/tickets/check-in`  — атомарно validate + write Attendance.
 *
 * Обе ручки требуют разрешения `EVENTS_UPDATE` и проверяют, что вызывающий
 * организатор имеет доступ к owning-org мероприятия (если billet валиден).
 */
@ApiTags('tickets')
@Controller('tickets')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class TicketScannerController {
  constructor(
    private readonly validationService: TicketValidationService,
    private readonly checkInService: TicketCheckInService,
  ) {}

  @Post('validate')
  @RequirePermissions(PERMISSIONS.EVENTS_UPDATE)
  @ApiOperation({
    summary: 'Preview-валидация билета (без записи)',
    description:
      'Проверяет HMAC-подпись, существование билета, статус регистрации, временные границы события и факт повторного прохода. ' +
      'Никогда не пишет в Attendance — используется UI staff для предпросмотра перед сканированием.',
  })
  @ApiResponse({ status: 200, type: TicketValidationResultDto })
  async validate(
    @Body() dto: ValidateTicketDto,
    @CurrentUser() user: ICurrentUser,
  ): Promise<TicketValidationResultDto> {
    const result = await this.validationService.validate({
      qrCode: dto.qrCode,
      eventId: dto.eventId,
    });
    if (result.event) {
      await this.assertOrganizerCanScanEvent(result.event.id, user);
    }
    return result;
  }

  @Post('check-in')
  @RequirePermissions(PERMISSIONS.EVENTS_UPDATE)
  @ApiOperation({
    summary: 'Сканирование билета: атомарная валидация и check-in',
    description:
      'Проверяет билет и при успехе создаёт Attendance в той же транзакции. ' +
      'Защита от повторного прохода: на second-scan возвращает `already_used` с временем первого check-in. ' +
      'Гонка между двумя сканерами разрешается через `(registrationId, checkInDate)` unique constraint.',
  })
  @ApiResponse({ status: 200, type: TicketValidationResultDto })
  async checkIn(
    @Body() dto: ValidateTicketDto,
    @CurrentUser() user: ICurrentUser,
  ): Promise<TicketValidationResultDto> {
    // Сначала валидируем — если status != valid, не лезем в БД на запись.
    const previewResult = await this.validationService.validate({
      qrCode: dto.qrCode,
      eventId: dto.eventId,
    });
    if (previewResult.event) {
      await this.assertOrganizerCanScanEvent(previewResult.event.id, user);
    }
    if (!previewResult.valid) return previewResult;

    return this.checkInService.checkIn({
      qrCode: dto.qrCode,
      eventId: dto.eventId,
    });
  }

  private async assertOrganizerCanScanEvent(
    eventId: string,
    user: ICurrentUser,
  ): Promise<void> {
    const callerOrg = this.organizationIdOf(user);
    const event =
      await this.validationService.loadEventOrganization(eventId);
    if (event && event.organizationId !== callerOrg) {
      throw new ForbiddenException(
        'Нет доступа к мероприятию: билет принадлежит другой организации',
      );
    }
  }

  private organizationIdOf(user: ICurrentUser): string {
    if (user.type === UserType.ORGANIZATION) return user.sub;
    if (user.type === UserType.MEMBER && user.organizationId) {
      return user.organizationId;
    }
    throw new ForbiddenException('Только организаторы могут сканировать билеты');
  }
}
