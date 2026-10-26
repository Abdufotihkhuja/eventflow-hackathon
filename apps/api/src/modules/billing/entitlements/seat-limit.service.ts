import { Injectable } from '@nestjs/common';
import { EntitlementKey } from '@prisma/client';
import { CapExceededException } from '../errors/billing-errors';
import { EntitlementsService } from './entitlements.service';
import { SeatLimitRepository } from './seat-limit.repository';

/**
 * Лимит мест сотрудников (E-4): 1/3/10 по тарифу (или оверрайд D-6, включая
 * GRANDFATHER-гранты D-14). Проверка на СОЗДАНИИ инвайта/сотрудника —
 * принятие существующего инвайта место не добавляет (оно занято с момента
 * инвайта, CR-10) и потому не проверяется: «блокируем новое, не отнимаем
 * обещанное» (E-15).
 */
@Injectable()
export class SeatLimitService {
  constructor(
    private readonly entitlements: EntitlementsService,
    private readonly seatRepository: SeatLimitRepository,
  ) {}

  async assertSeatAvailable(organizationId: string): Promise<void> {
    const ent = await this.entitlements.getEffectiveEntitlements(organizationId);
    if (!ent.enforcementEnabled || ent.staffSeats === null) return;
    if (ent.suspended) return; // блок записи при приостановке — зона E-17

    const occupied = await this.seatRepository.countOccupiedSeats(
      organizationId,
      new Date(),
    );
    if (occupied >= ent.staffSeats) {
      throw new CapExceededException({
        cap: EntitlementKey.STAFF_SEATS,
        limit: ent.staffSeats,
        current: occupied,
        tierKey: ent.tierKey,
        upgrade: true,
      });
    }
  }
}
