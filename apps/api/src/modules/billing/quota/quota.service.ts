import { Injectable } from '@nestjs/common';
import { CoinMetric, DrainSource, GenerationWindow } from '@prisma/client';
import {
  EffectiveEntitlements,
  EntitlementsService,
} from '../entitlements/entitlements.service';
import { QuotaExceededException } from '../errors/billing-errors';
import { QuotaRepository } from './quota.repository';
import { CoinLedgerService } from '../coins/coin-ledger.service';
import { calendarMonthKey, packMonthlyKey, packPeriodKey } from './periods';

export interface ConsumeRequest {
  organizationId: string;
  metric: CoinMetric;
  /** AI — секунды (CR-26), генерации — единицы. */
  quantity: number;
  /**
   * Естественный ключ идемпотентности (E-10): cert:<certificateId>,
   * badge:<eventId>:<recipientId>:<templateId>, ai:<vendorCallId> — ретрай
   * и повторный рендер НЕ списывают повторно (OQ-A2-3).
   */
  idempotencyKey: string;
  eventId?: string;
}

export interface ConsumeResult {
  allowed: true;
  /** true — этот ключ уже был учтён раньше (повтор). */
  deduped: boolean;
  periodKey: string | null;
  drainSource: DrainSource | 'NONE';
}

/**
 * Потребление квот (E-10 + E-2 API): проверка и списание в ОДНОЙ транзакции
 * с guarded-инкрементом — гонка на последней единице безопасна. Порядок
 * списания OQ-5 (E-12): сначала квота тарифа, затем монеты (в той же
 * транзакции, drainSource фиксируется на событии); пусто и там —
 * QuotaExceededException (E-13) с upgrade=true.
 */
@Injectable()
export class QuotaService {
  constructor(
    private readonly entitlements: EntitlementsService,
    private readonly quotaRepository: QuotaRepository,
    private readonly coinLedger: CoinLedgerService,
  ) {}

  async consume(request: ConsumeRequest): Promise<ConsumeResult> {
    const ent = await this.entitlements.getEffectiveEntitlements(
      request.organizationId,
    );

    // S-19 ВЫКЛ — легаси-поведение: не метерим и не ограничиваем.
    if (!ent.enforcementEnabled) {
      return { allowed: true, deduped: false, periodKey: null, drainSource: 'NONE' };
    }

    const limit = this.limitFor(ent, request.metric);
    // null = безлимит (например, оверрайдом) — пропускаем без метеринга.
    if (limit === null) {
      return { allowed: true, deduped: false, periodKey: null, drainSource: 'NONE' };
    }

    const periodKey = this.periodKeyFor(ent, request.metric, new Date());

    return this.quotaRepository.runInTransaction(async (tx) => {
      const event = await this.quotaRepository.createUsageEventIfAbsent(tx, {
        organizationId: request.organizationId,
        metric: request.metric,
        quantity: request.quantity,
        idempotencyKey: request.idempotencyKey,
        periodKey,
        drainSource: DrainSource.PLAN_QUOTA,
        planPurchaseId: ent.activePurchaseId,
        eventId: request.eventId ?? null,
      });
      if (!event) {
        return {
          allowed: true as const,
          deduped: true,
          periodKey,
          drainSource: DrainSource.PLAN_QUOTA,
        };
      }

      const incremented = await this.quotaRepository.incrementCounterGuarded(
        tx,
        {
          organizationId: request.organizationId,
          metric: request.metric,
          periodKey,
          quantity: request.quantity,
          limit,
        },
      );
      if (!incremented) {
        // E-12 (OQ-5): квота исчерпана → пробуем монеты В ТОЙ ЖЕ транзакции.
        const drained = await this.coinLedger.tryDebitInTx(tx, {
          organizationId: request.organizationId,
          metric: request.metric,
          quantity: request.quantity,
          usageEventId: event.id,
        });
        if (drained) {
          await this.quotaRepository.markEventCoinDrained(tx, event.id);
          return {
            allowed: true as const,
            deduped: false,
            periodKey,
            drainSource: DrainSource.COIN,
          };
        }
        const used = await this.quotaRepository.getUsed(
          request.organizationId,
          request.metric,
          periodKey,
        );
        // Транзакция откатится вместе с созданным UsageEvent.
        throw new QuotaExceededException({
          metric: request.metric,
          limit,
          used,
          requested: request.quantity,
          periodKey,
          tierKey: ent.tierKey,
          upgrade: true,
        });
      }

      return {
        allowed: true as const,
        deduped: false,
        periodKey,
        drainSource: DrainSource.PLAN_QUOTA,
      };
    });
  }

  /** Превью остатка без списания (для C-4/E-14). */
  async preview(
    organizationId: string,
    metric: CoinMetric,
  ): Promise<{ limit: number | null; used: number; periodKey: string | null }> {
    const ent = await this.entitlements.getEffectiveEntitlements(organizationId);
    if (!ent.enforcementEnabled) return { limit: null, used: 0, periodKey: null };
    const limit = this.limitFor(ent, metric);
    if (limit === null) return { limit: null, used: 0, periodKey: null };
    const periodKey = this.periodKeyFor(ent, metric, new Date());
    const used = await this.quotaRepository.getUsed(
      organizationId,
      metric,
      periodKey,
    );
    return { limit, used, periodKey };
  }

  private limitFor(
    ent: EffectiveEntitlements,
    metric: CoinMetric,
  ): number | null {
    if (metric === CoinMetric.GENERATION_UNITS) return ent.generationCredits;
    // AI-минуты храним и лимитируем в секундах (CR-26).
    return ent.aiMinutesMonthly === null ? null : ent.aiMinutesMonthly * 60;
  }

  private periodKeyFor(
    ent: EffectiveEntitlements,
    metric: CoinMetric,
    now: Date,
  ): string {
    if (metric === CoinMetric.GENERATION_UNITS) {
      if (
        ent.generationWindow === GenerationWindow.PACK_PERIOD &&
        ent.activePurchaseId
      ) {
        return packPeriodKey(ent.activePurchaseId);
      }
      return calendarMonthKey(now);
    }
    // AI_SECONDS: месячные окна с якорем на активацию пакета; без пакета — календарный месяц.
    if (ent.activePurchaseId && ent.activePurchaseActivatedAt) {
      return packMonthlyKey(ent.activePurchaseId, ent.activePurchaseActivatedAt, now);
    }
    return calendarMonthKey(now);
  }
}
