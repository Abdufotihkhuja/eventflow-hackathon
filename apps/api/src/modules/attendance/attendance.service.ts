import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CheckInDto, AttendanceQueryDto } from './dto';
import { EventCheckpoint, RegistrationStatus, UserType } from '@prisma/client';
import { ICurrentUser } from '../../common/interfaces';
import { ConfigService } from '@nestjs/config';
import * as QRCode from 'qrcode';
import { TicketQrService } from '../tickets/application/ticket-qr.service';
import { RegistrationChainService } from '../notifications/chains/registration-chain.service';
import { EventCheckpointsService } from '../events/checkpoints/event-checkpoints.service';

/** Человекочитаемый номер билета: EVF-YYMMDD-XXXXXX (Crockford base32, без I/L/O/U). */
const TICKET_NUMBER_REGEX = /^EVF-\d{6}-[0-9ABCDEFGHJKMNPQRSTVWXYZ]{6}$/;

export interface IAttendanceReport {
  date: string;
  total: number;
  attendees: {
    userId: string;
    userName: string;
    userEmail: string;
    checkInAt: Date;
  }[];
}

export interface IEventAttendanceStats {
  totalRegistrations: number;
  totalAttended: number;
  attendanceByDate: {
    date: string;
    count: number;
  }[];
}

/** Чекпоинт, в который попала отметка (null — скан вне всех окон). */
export interface ICheckInCheckpoint {
  id: string;
  name: string;
  startsAt: Date;
  endsAt: Date;
}

export interface ISelfCheckInResult {
  attendance: {
    id: string;
    checkInAt: Date;
    checkInDate: Date;
  };
  checkpoint: ICheckInCheckpoint | null;
  event: {
    id: string;
    title: string;
    slug: string;
    startDate: Date;
    endDate: Date;
  };
}

export interface ICheckInResult {
  attendance: {
    id: string;
    checkInAt: Date;
    checkInDate: Date;
  };
  checkpoint: ICheckInCheckpoint | null;
  participant: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    role: string;
  };
  registration: {
    id: string;
    status: string;
  };
  ticketUrls: {
    branded: string;
    simple: string;
  };
}

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly ticketQrService: TicketQrService,
    private readonly registrationChain: RegistrationChainService,
    private readonly checkpointsService: EventCheckpointsService,
  ) {}

  /**
   * Генерирует QR-код для регистрации
   */
  async generateQrCode(
    registrationId: string,
    user: ICurrentUser,
  ): Promise<string> {
    // Только пользователи могут получать свои QR-коды
    if (user.type !== UserType.USER) {
      throw new ForbiddenException('Доступно только для пользователей');
    }

    const registration = await this.prisma.registration.findUnique({
      where: { id: registrationId },
      include: {
        event: { select: { title: true, startDate: true } },
      },
    });

    if (!registration) {
      throw new NotFoundException('Регистрация не найдена');
    }

    if (registration.userId !== user.sub) {
      throw new ForbiddenException('Нет доступа к этой регистрации');
    }

    if (registration.status !== RegistrationStatus.APPROVED) {
      throw new BadRequestException(
        'QR-код доступен только для одобренных регистраций',
      );
    }

    if (!registration.qrCode) {
      throw new BadRequestException('QR-код не найден');
    }

    // QR билета: организатор сканирует → открывается app.
    // Кодируем подписанный v2-payload, чтобы защититься от подделки и обеспечить отзыв через qrPayloadVersion.
    const signedPayload = this.ticketQrService.encodeQrPayload({
      id: registration.id,
      qrCode: registration.qrCode,
      qrPayloadVersion: registration.qrPayloadVersion,
    });
    const appUrl = this.configService.get<string>('frontend.appUrl');
    const qrUrl = `${appUrl}/check-in?code=${encodeURIComponent(signedPayload)}`;

    // Генерируем изображение QR-кода (base64)
    const qrDataUrl = await QRCode.toDataURL(qrUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });

    return qrDataUrl;
  }

  /**
   * Генерирует QR «один для всех»: ссылка на публичную страницу check-in события.
   * Участники сканируют этот QR и попадают на eventflow.uz/check-in?eventId=...
   */
  async generateEventCheckInLandingQr(
    eventId: string,
    user: ICurrentUser,
  ): Promise<string> {
    await this.checkEventAccess(eventId, user);

    const publicUrl = this.configService.get<string>('frontend.publicUrl');
    const qrUrl = `${publicUrl}/check-in?eventId=${eventId}`;

    const qrDataUrl = await QRCode.toDataURL(qrUrl, {
      width: 300,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    });

    return qrDataUrl;
  }

  /**
   * Упрощённый check-in по QR коду (без eventId в параметрах).
   *
   * Принимает оба формата:
   *  - v2 signed payload (`v2.<body>.<hmac>`) — новый формат с защитой от подделки и revoke через qrPayloadVersion;
   *  - legacy raw UUID — для обратной совместимости со старыми билетами.
   *
   * При повторном check-in возвращает 409 с полем `alreadyCheckedIn` и временем последнего прохода.
   */
  async checkInByQrCode(
    dto: CheckInDto,
    user: ICurrentUser,
  ): Promise<ICheckInResult> {
    const verification = this.ticketQrService.verifyQrPayload(dto.qrCode);

    if (verification.kind === 'invalid') {
      throw new BadRequestException(
        `Невалидный QR-код: ${verification.reason}`,
      );
    }

    const registrationInclude = {
      user: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      event: {
        select: {
          id: true,
          title: true,
          startDate: true,
          endDate: true,
          organizationId: true,
        },
      },
    } as const;

    let registration =
      verification.kind === 'v2'
        ? await this.prisma.registration.findUnique({
            where: { id: verification.registrationId },
            include: registrationInclude,
          })
        : await this.prisma.registration.findUnique({
            where: { qrCode: verification.qrCode },
            include: registrationInclude,
          });

    // Ручной ввод на входе: оператор видит на билете человекочитаемый номер
    // (EVF-YYMMDD-XXXXXX), а не payload из QR — принимаем и его.
    if (!registration && verification.kind === 'legacy') {
      const ticketNumber = verification.qrCode.trim().toUpperCase();
      if (TICKET_NUMBER_REGEX.test(ticketNumber)) {
        registration = await this.prisma.registration.findUnique({
          where: { ticketNumber },
          include: registrationInclude,
        });
      }
    }

    if (
      verification.kind === 'v2' &&
      registration &&
      registration.qrPayloadVersion !== verification.version
    ) {
      throw new BadRequestException(
        'QR-код устарел: билет был перевыпущен. Попросите участника обновить билет.',
      );
    }

    if (!registration) {
      throw new NotFoundException('Регистрация не найдена');
    }

    // Проверяем доступ организатора к этому событию
    await this.checkEventAccess(registration.event.id, user);

    if (registration.status !== RegistrationStatus.APPROVED) {
      throw new BadRequestException('Регистрация не одобрена');
    }

    // Проверяем, что событие началось
    const now = new Date();
    if (registration.event.startDate > now) {
      throw new BadRequestException('Мероприятие ещё не началось');
    }

    // Куда пишем отметку: активный чекпоинт, а если его нет — день целиком.
    const slot = await this.checkpointsService.resolveCheckInSlot(
      registration.event.id,
      registration.id,
      now,
    );

    if (slot.existing) {
      throw this.buildCheckInConflict(
        slot.existing.checkInAt,
        registration.id,
        slot.checkpoint,
      );
    }

    const { attendance, created } = await this.checkpointsService.recordCheckIn(
      {
        registrationId: registration.id,
        checkpointId: slot.checkpoint?.id ?? null,
        checkInAt: now,
        checkInDate: slot.checkInDate,
      },
    );

    if (!created) {
      // Параллельный сканер выиграл гонку — тот же ответ, что и при повторе.
      throw this.buildCheckInConflict(
        attendance.checkInAt,
        registration.id,
        slot.checkpoint,
      );
    }

    // REG-09: тихий пуш «вы отмечены» + строка инбокса. Не бросает наружу.
    await this.registrationChain.onCheckIn(registration.id, slot.checkInDate);

    // Формируем URL для скачивания билетов
    const ticketBaseUrl = `/api/v1/events/${registration.event.id}/tickets/${registration.id}`;

    return {
      attendance: {
        id: attendance.id,
        checkInAt: attendance.checkInAt,
        checkInDate: attendance.checkInDate,
      },
      checkpoint: this.toCheckpointSummary(slot.checkpoint),
      participant: {
        id: registration.user.id,
        firstName: registration.user.firstName,
        lastName: registration.user.lastName,
        email: registration.user.email,
        role: registration.role,
      },
      registration: {
        id: registration.id,
        status: registration.status,
      },
      ticketUrls: {
        branded: `${ticketBaseUrl}?design=branded`,
        simple: `${ticketBaseUrl}?design=simple`,
      },
    };
  }

  /**
   * Самостоятельный check-in участника: пользователь сканирует QR «один для всех»
   * (eventflow.uz/check-in?eventId=...) и отмечает себя сам.
   *
   * Статус события не проверяем — паритет с организаторским check-in.
   * Для многодневных событий — один check-in на UTC-день (та же конвенция,
   * что и в checkInByQrCode). Гонка на create гасится уникальным индексом
   * (registrationId, checkInDate) и деградирует в 409 `already_used`.
   */
  async selfCheckIn(
    eventId: string,
    user: ICurrentUser,
  ): Promise<ISelfCheckInResult> {
    if (user.type !== UserType.USER) {
      throw new ForbiddenException('Доступно только для пользователей');
    }

    const registration = await this.prisma.registration.findUnique({
      where: { eventId_userId: { eventId, userId: user.sub } },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            slug: true,
            startDate: true,
            endDate: true,
            deletedAt: true,
          },
        },
      },
    });

    if (!registration) {
      throw new NotFoundException({
        code: 'not_registered',
        message: 'Регистрация на это мероприятие не найдена',
      });
    }

    if (registration.event.deletedAt) {
      throw new NotFoundException({
        code: 'event_not_found',
        message: 'Мероприятие не найдено',
      });
    }

    // Структурный `code` — фронтенд выбирает i18n-текст info-состояния по нему
    // (та же лестница, что и в TicketViewService.getMyTicketViewModel).
    if (registration.status === RegistrationStatus.PENDING) {
      throw new NotFoundException({
        code: 'pending_review',
        message: 'Регистрация ожидает подтверждения',
      });
    }
    if (registration.status === RegistrationStatus.REJECTED) {
      throw new NotFoundException({
        code: 'rejected',
        message: 'Регистрация отклонена',
      });
    }
    if (registration.status === RegistrationStatus.CANCELLED) {
      throw new NotFoundException({
        code: 'cancelled',
        message: 'Регистрация отменена',
      });
    }
    if (registration.status !== RegistrationStatus.APPROVED) {
      throw new NotFoundException({
        code: 'not_approved',
        message: 'Регистрация не подтверждена',
      });
    }

    const now = new Date();
    if (registration.event.startDate > now) {
      throw new BadRequestException({
        code: 'event_not_started',
        message: 'Мероприятие ещё не началось',
      });
    }
    if (registration.event.endDate < now) {
      throw new BadRequestException({
        code: 'expired',
        message: 'Мероприятие уже завершилось',
      });
    }

    const slot = await this.checkpointsService.resolveCheckInSlot(
      registration.event.id,
      registration.id,
      now,
    );

    if (slot.existing) {
      throw this.buildSelfCheckInConflict(
        slot.existing.checkInAt,
        registration.id,
        slot.checkpoint,
      );
    }

    const { attendance, created } = await this.checkpointsService.recordCheckIn(
      {
        registrationId: registration.id,
        checkpointId: slot.checkpoint?.id ?? null,
        checkInAt: now,
        checkInDate: slot.checkInDate,
      },
    );

    if (!created) {
      // Параллельный check-in выиграл гонку — отдаём то же 409, что и при повторе.
      throw this.buildSelfCheckInConflict(
        attendance.checkInAt,
        registration.id,
        slot.checkpoint,
      );
    }

    // REG-09: self check-in — тот же тихий пуш-подтверждение (дедуп по дню).
    await this.registrationChain.onCheckIn(registration.id, slot.checkInDate);

    return {
      attendance: {
        id: attendance.id,
        checkInAt: attendance.checkInAt,
        checkInDate: attendance.checkInDate,
      },
      checkpoint: this.toCheckpointSummary(slot.checkpoint),
      event: {
        id: registration.event.id,
        title: registration.event.title,
        slug: registration.event.slug,
        startDate: registration.event.startDate,
        endDate: registration.event.endDate,
      },
    };
  }

  /**
   * Получает отчёт посещаемости события
   */
  async getAttendanceReport(
    eventId: string,
    query: AttendanceQueryDto,
    user: ICurrentUser,
  ): Promise<IAttendanceReport[]> {
    await this.checkEventAccess(eventId, user);

    const where: {
      registration: { eventId: string };
      checkInDate?: Date;
    } = {
      registration: { eventId },
    };

    if (query.date) {
      where.checkInDate = new Date(query.date);
    }

    const attendances = await this.prisma.attendance.findMany({
      where,
      orderBy: { checkInAt: 'asc' },
      include: {
        registration: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    // Группируем по датам. Ось этого отчёта — день, поэтому участник попадает
    // в него один раз за день, даже если прошёл через несколько чекпоинтов:
    // иначе `total` раздувается (10 отметок на 150 человек дают «332 / 150»).
    // Разбивку по окнам отдаёт GET /events/:eventId/checkpoints/attendance.
    const reportMap = new Map<string, IAttendanceReport>();
    const seenPerDate = new Set<string>();

    for (const attendance of attendances) {
      const dateKey = attendance.checkInDate.toISOString().split('T')[0];

      if (!reportMap.has(dateKey)) {
        reportMap.set(dateKey, {
          date: dateKey,
          total: 0,
          attendees: [],
        });
      }

      // attendances отсортированы по checkInAt asc — остаётся первый проход за день.
      const dedupKey = `${dateKey}:${attendance.registrationId}`;
      if (seenPerDate.has(dedupKey)) continue;
      seenPerDate.add(dedupKey);

      const report = reportMap.get(dateKey)!;
      report.total++;
      report.attendees.push({
        userId: attendance.registration.user.id,
        userName:
          `${attendance.registration.user.firstName || ''} ${attendance.registration.user.lastName || ''}`.trim() ||
          'Без имени',
        userEmail: attendance.registration.user.email,
        checkInAt: attendance.checkInAt,
      });
    }

    return Array.from(reportMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date),
    );
  }

  /**
   * Получает статистику посещаемости события
   */
  async getAttendanceStats(
    eventId: string,
    user: ICurrentUser,
  ): Promise<IEventAttendanceStats> {
    await this.checkEventAccess(eventId, user);

    const [totalRegistrations, attendedRegistrations, attendanceByDate] =
      await Promise.all([
        this.prisma.registration.count({
          where: {
            eventId,
            status: RegistrationStatus.APPROVED,
          },
        }),
        this.prisma.attendance.groupBy({
          by: ['registrationId'],
          where: {
            registration: { eventId },
          },
        }),
        // Группируем вместе с registrationId: с чекпоинтами у участника
        // несколько отметок за день, а «сколько людей было в этот день» —
        // это количество РАЗНЫХ участников, а не строк.
        this.prisma.attendance.groupBy({
          by: ['checkInDate', 'registrationId'],
          where: {
            registration: { eventId },
          },
          orderBy: { checkInDate: 'asc' },
        }),
      ]);

    const countByDate = new Map<string, number>();
    for (const item of attendanceByDate) {
      const dateKey = item.checkInDate.toISOString().split('T')[0];
      countByDate.set(dateKey, (countByDate.get(dateKey) ?? 0) + 1);
    }

    return {
      totalRegistrations,
      totalAttended: attendedRegistrations.length,
      attendanceByDate: Array.from(countByDate.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    };
  }

  // === Private methods ===

  private toCheckpointSummary(
    checkpoint: EventCheckpoint | null,
  ): ICheckInCheckpoint | null {
    if (!checkpoint) return null;
    return {
      id: checkpoint.id,
      name: checkpoint.name,
      startsAt: checkpoint.startsAt,
      endsAt: checkpoint.endsAt,
    };
  }

  /** Повторный проход организаторского сканера. */
  private buildCheckInConflict(
    lastCheckInAt: Date,
    registrationId: string,
    checkpoint: EventCheckpoint | null,
  ): ConflictException {
    return new ConflictException({
      code: 'already_used',
      message: checkpoint
        ? `Участник уже отмечен на чекпоинте «${checkpoint.name}»`
        : 'Билет уже использован: участник отмечен сегодня',
      // Верхнеуровневые поля оставлены для обратной совместимости, но наружу
      // AllExceptionsFilter пропускает только message/code/details.
      alreadyCheckedIn: true,
      lastCheckInAt: lastCheckInAt.toISOString(),
      registrationId,
      details: {
        alreadyCheckedIn: true,
        lastCheckInAt: lastCheckInAt.toISOString(),
        registrationId,
        checkpoint: this.toCheckpointSummary(checkpoint),
      },
    });
  }

  private buildSelfCheckInConflict(
    lastCheckInAt: Date,
    registrationId: string,
    checkpoint: EventCheckpoint | null,
  ): ConflictException {
    // Дополнительные поля — только внутри details: глобальный AllExceptionsFilter
    // пропускает в HTTP-ответ лишь message/code/details из payload исключения.
    return new ConflictException({
      code: 'already_used',
      message: checkpoint
        ? `Вы уже отмечены на чекпоинте «${checkpoint.name}»`
        : 'Вы уже отмечены сегодня',
      details: {
        alreadyCheckedIn: true,
        lastCheckInAt: lastCheckInAt.toISOString(),
        registrationId,
        checkpoint: this.toCheckpointSummary(checkpoint),
      },
    });
  }

  private async checkEventAccess(
    eventId: string,
    user: ICurrentUser,
  ): Promise<void> {
    const organizationId = this.getOrganizationId(user);

    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { organizationId: true, status: true },
    });

    if (!event) {
      throw new NotFoundException('Мероприятие не найдено');
    }

    if (event.organizationId !== organizationId) {
      throw new ForbiddenException('Нет доступа к этому мероприятию');
    }
  }

  private getOrganizationId(user: ICurrentUser): string {
    if (user.type === UserType.ORGANIZATION) {
      return user.sub;
    }
    if (user.type === UserType.MEMBER && user.organizationId) {
      return user.organizationId;
    }
    throw new ForbiddenException(
      'Только организаторы могут управлять посещаемостью',
    );
  }
}
