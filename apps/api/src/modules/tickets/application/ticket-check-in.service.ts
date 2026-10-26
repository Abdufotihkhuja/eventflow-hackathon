import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { TicketQrService } from './ticket-qr.service';
import {
  TicketValidationResult,
  TicketValidationService,
} from './ticket-validation.service';
import { EventCheckpointsService } from '../../events/checkpoints/event-checkpoints.service';

@Injectable()
export class TicketCheckInService {
  private readonly logger = new Logger(TicketCheckInService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly validationService: TicketValidationService,
    private readonly ticketQrService: TicketQrService,
    private readonly checkpointsService: EventCheckpointsService,
  ) {}

  /**
   * Atomic validate + write. If validation fails, returns the validation
   * result without touching the database. If validation passes, creates an
   * Attendance row and returns the same result enriched with `checkedInAt`.
   *
   * The attendance is bound to the checkpoint active at scan time, so the
   * ticket is single-use *per checkpoint window*; outside every window it
   * falls back to the historical one-per-UTC-day rule. Race-safe via the
   * partial unique indexes — a duplicate write degrades to `already_used`.
   */
  async checkIn(input: {
    qrCode: string;
    eventId?: string;
    now?: Date;
  }): Promise<TicketValidationResult> {
    const validation = await this.validationService.validate(input);
    if (!validation.valid) return validation;

    const registrationId = await this.resolveRegistrationId(input.qrCode);
    if (!registrationId || !validation.event) {
      return {
        valid: false,
        status: 'ticket_not_found',
        message: 'Билет не найден',
      };
    }

    const now = input.now ?? new Date();
    const slot = await this.checkpointsService.resolveCheckInSlot(
      validation.event.id,
      registrationId,
      now,
    );

    try {
      const { attendance, created } =
        await this.checkpointsService.recordCheckIn({
          registrationId,
          checkpointId: slot.checkpoint?.id ?? null,
          checkInAt: now,
          checkInDate: slot.checkInDate,
        });

      if (!created) {
        // Concurrent scanner won the race — re-validate to surface already_used.
        return this.validationService.validate(input);
      }

      return {
        ...validation,
        checkedInAt: attendance.checkInAt.toISOString(),
      };
    } catch (error) {
      this.logger.error('Check-in write failed', error as Error);
      throw error;
    }
  }

  private async resolveRegistrationId(
    qrCode: string,
  ): Promise<string | null> {
    const verification = this.ticketQrService.verifyQrPayload(qrCode);
    if (verification.kind === 'v2') return verification.registrationId;
    if (verification.kind === 'legacy') {
      const reg = await this.prisma.registration.findUnique({
        where: { qrCode: verification.qrCode },
        select: { id: true },
      });
      return reg?.id ?? null;
    }
    return null;
  }
}
