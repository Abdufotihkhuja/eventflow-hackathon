import { Injectable, Logger } from '@nestjs/common';
import { MailService } from '../../mail/mail.service';
import { AdOrdersService } from '../ads/ad-orders.service';
import { ViaPaymentsService } from '../payments/via-payments.service';
import { BillingSweepRepository } from './billing-sweep.repository';

/**
 * Гигиенический свип биллинга (E-11b, CR-6). КОРРЕКТНОСТЬ сбросов/истечений
 * обеспечивается лениво (periodKey E-11a + read-time expiry M-3) — свип лишь:
 *  1) массово фиксирует EXPIRED для просроченных ACTIVE-пакетов (чтобы
 *     статусы в админ-выборках не ждали первого чтения организацией);
 *  2) шлёт напоминания о продлении (§2.1) за ≤14 и ≤3 дня до истечения —
 *     идемпотентно через дедуп почтовой очереди (plan-expiry:purchase:window).
 * Запускается BullMQ-повторяемым заданием через воркер (internal/jobs).
 */
@Injectable()
export class BillingSweepService {
  private readonly logger = new Logger(BillingSweepService.name);

  constructor(
    private readonly sweepRepository: BillingSweepRepository,
    private readonly mailService: MailService,
    private readonly adOrdersService: AdOrdersService,
    private readonly viaPayments: ViaPaymentsService,
  ) {}

  async run(): Promise<{ expired: number; reminders: number; adPlacementsExpired: number }> {
    const now = new Date();

    // S-11-auto: снятие истёкших featured-размещений.
    const adPlacementsExpired =
      await this.adOrdersService.expireDuePlacements(now);

    // VIA: добор оплат, где покупатель закрыл вкладку до возврата, и
    // закрытие просроченных инвойсов (подтверждение — только опросом VIA).
    await this.viaPayments.reconcilePending(now);

    // 1) Массовый expiry-флип (lazy-корректность уже есть — это гигиена).
    const expiredCount = await this.sweepRepository.expireDue(now);

    // 2) Напоминания: живые пакеты, истекающие в ближайшие 14 дней.
    const horizon = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const expiring = await this.sweepRepository.findExpiringWithin(now, horizon);

    let reminders = 0;
    for (const purchase of expiring) {
      if (!purchase.expiresAt || !purchase.organization.email) continue;
      const daysLeft = Math.ceil(
        (purchase.expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
      );
      // Два окна (§2.1): ≤3 дня — срочное, иначе ≤14 — раннее. Дедуп по окну.
      const window = daysLeft <= 3 ? '3d' : '14d';
      await this.mailService.sendPlanExpiryReminder(
        purchase.organization.email,
        {
          purchaseId: purchase.id,
          planKey: purchase.planKeySnapshot,
          expiresAtFormatted: purchase.expiresAt.toISOString().slice(0, 10),
          daysLeft,
          window,
        },
      );
      reminders += 1;
    }

    if (expiredCount > 0 || reminders > 0) {
      this.logger.log(
        `Свип биллинга: EXPIRED=${expiredCount}, напоминаний=${reminders}`,
      );
    }
    return { expired: expiredCount, reminders, adPlacementsExpired };
  }
}
