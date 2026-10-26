import { Injectable, Logger } from '@nestjs/common';
import { BillingConfigService } from '../billing-config.service';
import { EventCreditsRepository } from './event-credits.repository';

/**
 * Кредиты событий (E-16, OQ-A0-6): потребление при ПЕРВОМ переходе события в
 * PUBLISHED, идемпотентно по unique(eventId) — повторная публикация после
 * ре-модерации (PC-10) бесплатна.
 *
 * Семантика принятой модели (M-2/M-3): кредиты определяют ТАРИФ, а не право
 * публиковать — START публикует без кредитов (лимит 50 участников, 12%);
 * у платного пакета списание последнего кредита переводит пакет в EXHAUSTED,
 * и организация продолжает на START-семантике. Публикация никогда не
 * блокируется кредитами.
 *
 * Возврат (B-1): ТОЛЬКО если событие отменено с нулём APPROVED-регистраций —
 * ценность (сбор заявок) не была получена. Возврат оживляет EXHAUSTED-пакет,
 * если тот не истёк по времени.
 */
@Injectable()
export class EventCreditsService {
  private readonly logger = new Logger(EventCreditsService.name);

  constructor(
    private readonly repository: EventCreditsRepository,
    private readonly billingConfig: BillingConfigService,
  ) {}

  /**
   * Вызывается из пути публикации (super-admin approve). Ошибок наружу не
   * бросает по бизнес-причинам — только по инфраструктурным.
   */
  async consumeForEvent(
    organizationId: string,
    eventId: string,
  ): Promise<{ consumed: boolean; exhausted: boolean }> {
    // S-19 ВЫКЛ: события, опубликованные до включения, естественно
    // грандфазерятся — записей не создаём (E-15).
    if (!(await this.billingConfig.isEnforcementEnabled())) {
      return { consumed: false, exhausted: false };
    }

    return this.repository.runInTransaction(async (tx) => {
      const purchase = await this.repository.findActivePurchase(
        tx,
        organizationId,
      );
      // START-семантика (нет живого пакета): публикация бесплатна.
      if (!purchase) return { consumed: false, exhausted: false };

      const consumption = await this.repository.createConsumptionIfAbsent(tx, {
        organizationId,
        planPurchaseId: purchase.id,
        eventId,
      });
      // Уже списано за это событие (ре-модерация) — бесплатно.
      if (!consumption) return { consumed: false, exhausted: false };

      const decremented = await this.repository.decrementRemainingGuarded(
        tx,
        purchase.id,
      );
      if (!decremented) {
        // Гонка: пакет опустел между findActive и декрементом. Потребление
        // не состоялось — откатываем запись, публикация идёт по START.
        throw new RollbackConsumptionSignal();
      }
      await this.repository.markExhaustedIfEmpty(tx, purchase.id);
      const exhausted = purchase.eventCreditsRemaining - 1 === 0;
      return { consumed: true, exhausted };
    }).catch((error) => {
      if (error instanceof RollbackConsumptionSignal) {
        return { consumed: false, exhausted: true };
      }
      throw error;
    });
  }

  /** Возврат по отмене события (B-1). approvedCount считает вызывающий. */
  async refundForCancelledEvent(
    eventId: string,
    approvedCount: number,
  ): Promise<{ refunded: boolean }> {
    if (approvedCount > 0) return { refunded: false };

    return this.repository.runInTransaction(async (tx) => {
      const consumption = await this.repository.findConsumptionByEvent(
        tx,
        eventId,
      );
      if (!consumption || consumption.refundedAt) return { refunded: false };
      await this.repository.refund(tx, consumption, new Date());
      this.logger.log(
        `Кредит события ${eventId} возвращён (отмена с 0 APPROVED, B-1)`,
      );
      return { refunded: true };
    });
  }
}

/** Внутренний сигнал отката транзакции потребления (не бизнес-ошибка). */
class RollbackConsumptionSignal extends Error {
  constructor() {
    super('rollback-consumption');
  }
}
