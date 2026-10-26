import { Injectable } from '@nestjs/common';
import { Prisma, RegistrationStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { TicketQrService } from './ticket-qr.service';
import { EventCheckpointsService } from '../../events/checkpoints/event-checkpoints.service';

/**
 * Machine-readable codes returned to staff/organizer scanner UIs so they can
 * render the right state without parsing free-form messages.
 *
 * - `valid`                     — ticket is good to enter; check-in writer should record attendance.
 * - `already_used`              — same-day attendance already exists; do NOT admit again.
 * - `pending_review`            — registration is PENDING; treat as not yet approved.
 * - `cancelled`                 — registration was cancelled by user.
 * - `rejected`                  — registration was rejected by organizer.
 * - `registration_not_approved` — generic catch-all for non-APPROVED registrations.
 * - `expired`                   — event has already ended.
 * - `event_not_started`         — scan attempt before event start.
 * - `wrong_event`               — caller scoped to a specific event but ticket belongs elsewhere.
 * - `invalid_signature`         — v2 payload tampering / wrong secret / mismatched qrPayloadVersion.
 * - `ticket_not_found`          — payload parses but no matching registration exists.
 */
export type TicketValidationStatus =
  | 'valid'
  | 'already_used'
  | 'pending_review'
  | 'cancelled'
  | 'rejected'
  | 'registration_not_approved'
  | 'expired'
  | 'event_not_started'
  | 'wrong_event'
  | 'invalid_signature'
  | 'ticket_not_found';

export interface TicketValidationAttendee {
  id: string;
  fullName: string;
  email: string;
  role: string;
}

export interface TicketValidationEvent {
  id: string;
  title: string;
}

export interface TicketValidationTicket {
  number: string;
  type: string;
}

/** Активный чекпоинт на момент скана — в него попадёт (или уже попала) отметка. */
export interface TicketValidationCheckpoint {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
}

export interface TicketValidationResult {
  valid: boolean;
  status: TicketValidationStatus;
  message: string;
  attendee?: TicketValidationAttendee;
  event?: TicketValidationEvent;
  ticket?: TicketValidationTicket;
  checkedInAt?: string;
  /**
   * null/отсутствует — скан пришёлся мимо всех окон: отметка засчитывается
   * на день по прежним правилам.
   */
  checkpoint?: TicketValidationCheckpoint | null;
}

const REGISTRATION_INCLUDE = {
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

type LoadedRegistration = Prisma.RegistrationGetPayload<{
  include: typeof REGISTRATION_INCLUDE;
}>;

/**
 * Pure validation: never writes. Used both by the preview endpoint and by the
 * check-in writer (which then performs the atomic Attendance insert).
 */
@Injectable()
export class TicketValidationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ticketQrService: TicketQrService,
    private readonly checkpointsService: EventCheckpointsService,
  ) {}

  async validate(input: {
    qrCode: string;
    eventId?: string;
    now?: Date;
  }): Promise<TicketValidationResult> {
    const verification = this.ticketQrService.verifyQrPayload(input.qrCode);

    if (verification.kind === 'invalid') {
      return {
        valid: false,
        status: 'invalid_signature',
        message: `Невалидный QR-код: ${verification.reason}`,
      };
    }

    let registration: LoadedRegistration | null;
    if (verification.kind === 'v2') {
      registration = await this.prisma.registration.findUnique({
        where: { id: verification.registrationId },
        include: REGISTRATION_INCLUDE,
      });

      if (
        registration &&
        registration.qrPayloadVersion !== verification.version
      ) {
        return {
          valid: false,
          status: 'invalid_signature',
          message:
            'QR-код устарел: билет был перевыпущен. Попросите участника обновить билет.',
        };
      }
    } else {
      registration = await this.prisma.registration.findUnique({
        where: { qrCode: verification.qrCode },
        include: REGISTRATION_INCLUDE,
      });
    }

    if (!registration) {
      return {
        valid: false,
        status: 'ticket_not_found',
        message: 'Билет не найден',
      };
    }

    const baseAttendee: TicketValidationAttendee = {
      id: registration.user.id,
      fullName:
        `${registration.user.firstName ?? ''} ${registration.user.lastName ?? ''}`.trim() ||
        registration.user.email,
      email: registration.user.email,
      role: registration.role,
    };
    const baseEvent: TicketValidationEvent = {
      id: registration.event.id,
      title: registration.event.title,
    };
    const baseTicket: TicketValidationTicket = {
      number: registration.ticketNumber ?? `EVF-${registration.id.slice(0, 6).toUpperCase()}`,
      type: registration.role,
    };

    if (input.eventId && input.eventId !== registration.event.id) {
      return {
        valid: false,
        status: 'wrong_event',
        message: 'Этот билет для другого мероприятия',
        attendee: baseAttendee,
        event: baseEvent,
        ticket: baseTicket,
      };
    }

    if (registration.status === RegistrationStatus.CANCELLED) {
      return {
        valid: false,
        status: 'cancelled',
        message: 'Регистрация отменена',
        attendee: baseAttendee,
        event: baseEvent,
        ticket: baseTicket,
      };
    }

    if (registration.status === RegistrationStatus.REJECTED) {
      return {
        valid: false,
        status: 'rejected',
        message: 'Регистрация отклонена',
        attendee: baseAttendee,
        event: baseEvent,
        ticket: baseTicket,
      };
    }

    if (registration.status === RegistrationStatus.PENDING) {
      return {
        valid: false,
        status: 'pending_review',
        message: 'Регистрация ожидает одобрения',
        attendee: baseAttendee,
        event: baseEvent,
        ticket: baseTicket,
      };
    }

    if (registration.status !== RegistrationStatus.APPROVED) {
      return {
        valid: false,
        status: 'registration_not_approved',
        message: 'Регистрация не одобрена',
        attendee: baseAttendee,
        event: baseEvent,
        ticket: baseTicket,
      };
    }

    const now = input.now ?? new Date();

    if (registration.event.endDate.getTime() < now.getTime()) {
      return {
        valid: false,
        status: 'expired',
        message: 'Мероприятие завершено',
        attendee: baseAttendee,
        event: baseEvent,
        ticket: baseTicket,
      };
    }

    if (registration.event.startDate.getTime() > now.getTime()) {
      return {
        valid: false,
        status: 'event_not_started',
        message: 'Мероприятие ещё не началось',
        attendee: baseAttendee,
        event: baseEvent,
        ticket: baseTicket,
      };
    }

    // Дедупликация привязана к активному чекпоинту: внутри одного окна билет
    // одноразовый. Вне окон — прежнее правило «один раз в сутки».
    const slot = await this.checkpointsService.resolveCheckInSlot(
      registration.event.id,
      registration.id,
      now,
    );
    const checkpoint = this.toCheckpointSummary(slot.checkpoint);

    if (slot.existing) {
      return {
        valid: false,
        status: 'already_used',
        message: checkpoint
          ? `Билет уже использован на чекпоинте «${checkpoint.name}»`
          : 'Билет уже использован сегодня',
        attendee: baseAttendee,
        event: baseEvent,
        ticket: baseTicket,
        checkedInAt: slot.existing.checkInAt.toISOString(),
        checkpoint,
      };
    }

    return {
      valid: true,
      status: 'valid',
      message: 'Билет валиден',
      attendee: baseAttendee,
      event: baseEvent,
      ticket: baseTicket,
      checkpoint,
    };
  }

  private toCheckpointSummary(
    checkpoint: { id: string; name: string; startsAt: Date; endsAt: Date } | null,
  ): TicketValidationCheckpoint | null {
    if (!checkpoint) return null;
    return {
      id: checkpoint.id,
      name: checkpoint.name,
      startsAt: checkpoint.startsAt.toISOString(),
      endsAt: checkpoint.endsAt.toISOString(),
    };
  }

  /**
   * Loads registration solely to authorize the organizer scope, used by the
   * controller before delegating to validate() / check-in writer.
   */
  async loadEventOrganization(
    eventId: string,
  ): Promise<{ organizationId: string } | null> {
    return this.prisma.event.findUnique({
      where: { id: eventId },
      select: { organizationId: true },
    });
  }
}
