import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RegistrationStatus, UserType } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import type { ICurrentUser } from '../../../common/interfaces';
import { TicketNumberService } from './ticket-number.service';
import { TicketQrService } from './ticket-qr.service';

/**
 * Ticket statuses returned by the API.
 *
 * Endpoint returns ticket ONLY when the underlying registration is APPROVED. Pending / rejected /
 * cancelled registrations result in 404 (caller's UI should render its own info state).
 *
 * - `active`     — APPROVED, no check-in yet, event not ended → QR live.
 * - `checked_in` — APPROVED, at least one attendance record, event not ended → QR still works for multi-day events.
 * - `used`       — APPROVED, event has ended (or first check-in on a single-day event after which re-scan is rejected by `already_used`).
 */
export type EventTicketViewStatus = 'active' | 'checked_in' | 'used';

export interface EventTicketViewModel {
  organization: {
    id: string;
    name: string;
    logoUrl: string | null;
    brandColor: string | null;
    accentColor: string | null;
  };
  event: {
    id: string;
    title: string;
    slug: string;
    startDate: string; // ISO
    endDate: string; // ISO
    venue: string | null;
    city: string | null;
    format: string;
    coverImage: string | null;
  };
  attendee: {
    id: string;
    fullName: string;
    email: string;
    avatarUrl: string | null;
    role: string;
  };
  ticket: {
    id: string; // registration id
    number: string;
    type: string; // role display
    status: EventTicketViewStatus;
    qrPayload: string | null; // signed payload for QR
    qrCheckInUrl: string | null; // app deep link
    issuedAt: string | null; // ISO
    lastCheckInAt: string | null; // ISO
    securityLabel: string;
  };
}

@Injectable()
export class TicketViewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly ticketNumberService: TicketNumberService,
    private readonly ticketQrService: TicketQrService,
  ) {}

  async getMyTicketViewModel(
    eventId: string,
    user: ICurrentUser,
  ): Promise<EventTicketViewModel> {
    if (user.type !== UserType.USER) {
      throw new ForbiddenException('Доступно только для пользователей');
    }

    const registration = await this.findRegistrationForView(eventId, user.sub);

    if (!registration) {
      throw new NotFoundException({
        code: 'not_registered',
        message: 'Регистрация на это мероприятие не найдена',
      });
    }

    // Билет доступен только при подтверждённой регистрации. Для PENDING/REJECTED/CANCELLED
    // отдаём 404 со структурным `code` — фронтенд использует его для выбора i18n-текста
    // info-состояния ("на рассмотрении" / "отклонена" / "отменена") вместо парсинга сообщения.
    if (registration.status === RegistrationStatus.PENDING) {
      throw new NotFoundException({
        code: 'pending_review',
        message: 'Билет ещё не выпущен: регистрация ожидает подтверждения',
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

    // Idempotent: backfills ticketNumber for legacy registrations on first view.
    const ticketNumber = registration.ticketNumber
      ? registration.ticketNumber
      : await this.ticketNumberService.ensureTicketNumber(registration.id);

    const status = this.deriveTicketStatus(registration);
    const attendee = registration.user;
    const event = registration.event;
    const org = event.organization;

    const fullName =
      `${attendee.firstName ?? ''} ${attendee.lastName ?? ''}`.trim() ||
      attendee.email;

    // QR валиден только пока событие активно. После окончания (status=used) — скрываем QR.
    const showQr = status !== 'used';

    const qrPayload = showQr
      ? this.ticketQrService.encodeQrPayload({
          id: registration.id,
          qrCode: registration.qrCode,
          qrPayloadVersion: registration.qrPayloadVersion,
        })
      : null;

    const appUrl =
      this.configService.get<string>('frontend.appUrl') ?? 'http://app.localhost';
    const qrCheckInUrl = qrPayload
      ? `${appUrl}/check-in?code=${encodeURIComponent(qrPayload)}`
      : null;

    return {
      organization: {
        id: org.id,
        name: org.companyName,
        logoUrl: org.logoUrl,
        brandColor: org.brandColor,
        accentColor: org.accentColor,
      },
      event: {
        id: event.id,
        title: event.title,
        slug: event.slug,
        startDate: event.startDate.toISOString(),
        endDate: event.endDate.toISOString(),
        venue: event.venue,
        city: event.city,
        format: event.format,
        coverImage: event.coverImage,
      },
      attendee: {
        id: attendee.id,
        fullName,
        email: attendee.email,
        avatarUrl: attendee.avatarUrl,
        role: registration.role,
      },
      ticket: {
        id: registration.id,
        number: ticketNumber,
        type: registration.role,
        status,
        qrPayload,
        qrCheckInUrl,
        issuedAt: (registration.ticketIssuedAt ?? registration.createdAt)
          .toISOString(),
        lastCheckInAt:
          registration.attendances[0]?.checkInAt.toISOString() ?? null,
        securityLabel: 'Безопасно · Уникальный билет · Передача невозможна',
      },
    };
  }

  /**
   * Ищет регистрацию пользователя для показа билета.
   *
   * Основной путь — по (eventId, userId): маршрут билета адресуется событием.
   * Но письма, разосланные до этого фикса, вели на `/profile/tickets/<id
   * регистрации>` и упирались в «Билет не выдан», хотя регистрация была
   * подтверждена. Поэтому при промахе пробуем трактовать параметр как id
   * регистрации — строго в пределах того же пользователя, так что чужой билет
   * так не открыть. Ветку можно удалить, когда старые письма протухнут.
   */
  private async findRegistrationForView(eventIdOrRegistrationId: string, userId: string) {
    const include = {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatarUrl: true,
        },
      },
      event: {
        select: {
          id: true,
          title: true,
          slug: true,
          startDate: true,
          endDate: true,
          venue: true,
          city: true,
          format: true,
          coverImage: true,
          organization: {
            select: {
              id: true,
              companyName: true,
              logoUrl: true,
              brandColor: true,
              accentColor: true,
            },
          },
        },
      },
      attendances: {
        orderBy: { checkInAt: 'desc' as const },
        take: 1,
        select: { checkInAt: true },
      },
    };

    const byEvent = await this.prisma.registration.findUnique({
      where: {
        eventId_userId: { eventId: eventIdOrRegistrationId, userId },
      },
      include,
    });
    if (byEvent) {
      return byEvent;
    }

    const byRegistration = await this.prisma.registration.findUnique({
      where: { id: eventIdOrRegistrationId },
      include,
    });
    // Владельца проверяем явно: id регистрации угадать нельзя, но и полагаться
    // на это не будем — чужой билет по прямой ссылке не открывается.
    return byRegistration?.userId === userId ? byRegistration : null;
  }

  private deriveTicketStatus(registration: {
    status: RegistrationStatus;
    attendances: Array<unknown>;
    event: { endDate: Date };
  }): EventTicketViewStatus {
    // Caller has already guaranteed APPROVED — see getMyTicketViewModel.
    const eventEnded = registration.event.endDate.getTime() < Date.now();
    if (eventEnded) {
      return 'used';
    }
    return registration.attendances.length > 0 ? 'checked_in' : 'active';
  }
}
