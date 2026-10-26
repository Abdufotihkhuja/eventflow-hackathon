import { Injectable } from '@nestjs/common';
import { EntitlementKey } from '@prisma/client';
import { CapExceededException } from '../errors/billing-errors';
import { EntitlementsService } from './entitlements.service';
import { MaxEventsRepository } from './max-events.repository';

/**
 * Override-only лимит на общее число созданных событий (MAX_EVENTS).
 * Тарифного дефолта нет — по умолчанию безлимит; ограничение включается
 * только per-org оверрайдом (D-6) супер-админом. Счёт — «всего созданных»
 * (решение пользователя): архивация слот НЕ освобождает, поэтому в счёт
 * входят все живые (не удалённые) события организации любого статуса.
 * Проверка на СОЗДАНИИ события, до записи.
 */
@Injectable()
export class MaxEventsService {
  constructor(
    private readonly entitlements: EntitlementsService,
    private readonly maxEventsRepository: MaxEventsRepository,
  ) {}

  async assertCanCreateEvent(organizationId: string): Promise<void> {
    const ent =
      await this.entitlements.getEffectiveEntitlements(organizationId);
    if (!ent.enforcementEnabled || ent.maxEvents === null) return;
    if (ent.suspended) return; // блок записи при приостановке — зона E-17

    const current =
      await this.maxEventsRepository.countCreatedEvents(organizationId);
    if (current >= ent.maxEvents) {
      throw new CapExceededException({
        cap: EntitlementKey.MAX_EVENTS,
        limit: ent.maxEvents,
        current,
        tierKey: ent.tierKey,
        upgrade: true,
      });
    }
  }
}
