import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Currency,
  EventType,
  Order,
  OrderKind,
  OrderStatus,
  RevenueChannel,
  RevenueType,
} from '@prisma/client';
import { mulBpsHalfUp } from '../../../common/money/money';
import { EntitlementsService } from '../entitlements/entitlements.service';
import { RegistrationChainService } from '../../notifications/chains/registration-chain.service';
import { RevenueService } from '../revenue/revenue.service';
import { TicketingRepository } from './ticketing.repository';
import type { ICurrentUser } from '../../../common/interfaces';

/** TTL брони места на время оплаты (M-4). */
const HOLD_MINUTES = 15;

/**
 * Минимальный платный тикетинг (M-4 + M-6, CR-15): checkout поверх УЖЕ
 * созданной PENDING-регистрации (бесплатный поток создаёт её и считает к
 * вместимости — «seat hold considers PENDING», паритет с E-3/OQ-A2-4).
 *
 * Деньги: сумма заказа берётся из витринного Event.price (Decimal мажорных
 * единиц) → тийины; комиссия — СНАПШОТ эффективного bps из E-1 в момент
 * создания заказа (M-6, неизменяемая история; округление half-up).
 * Подтверждение оплаты (провайдер M-5 или оператор) переводит заказ в PAID,
 * регистрацию — в APPROVED и пишет ДВЕ строки выручки не требуется —
 * комиссия платформы = наш доход (COMMISSION); тело билета — деньги
 * организатора (мерчант-оф-рекорд, выплата M-7), в выручку НЕ пишется.
 *
 * ВНЕШНИЙ ГЕЙТ: живые провайдеры (Payme/Click) требуют мерчант-креды и
 * фискализацию (M-16) — до этого работает MANUAL-путь (оператор).
 */
@Injectable()
export class TicketingService {
  constructor(
    private readonly ticketingRepository: TicketingRepository,
    private readonly entitlements: EntitlementsService,
    private readonly revenueService: RevenueService,
    private readonly registrationChain: RegistrationChainService,
  ) {}

  /** Создать заказ на билет для своей PENDING-регистрации. */
  async checkout(
    registrationId: string,
    user: ICurrentUser,
  ): Promise<Order> {
    const now = new Date();
    // BL-06/OQ-27: delivery/schedule-строки цепочки создаются В транзакции
    // чекаута, канальные job'ы — ПОСЛЕ commit (enqueue-замыкание).
    let notifyAfterCommit: (() => Promise<void>) | null = null;
    const order = await this.ticketingRepository.runInTransaction(async (tx) => {
      const registration =
        await this.ticketingRepository.findRegistrationForCheckout(
          tx,
          registrationId,
          user.sub,
        );
      if (!registration) {
        throw new NotFoundException('Регистрация не найдена');
      }
      const event = registration.event;
      if (event.type !== EventType.PAID || !event.price) {
        throw new BadRequestException('Событие не является платным');
      }

      await this.ticketingRepository.expireStaleOrders(tx, registrationId, now);
      const live = await this.ticketingRepository.findLiveOrderForRegistration(
        tx,
        registrationId,
        now,
      );
      if (live) {
        if (live.status === OrderStatus.PAID) {
          throw new ConflictException({
            message: 'Билет уже оплачен',
            code: 'TICKET_ALREADY_PAID',
            details: { orderId: live.id },
          });
        }
        return live; // действующая бронь — тот же заказ (идемпотентный чекаут)
      }

      // Мажорные единицы (Decimal 10,2) → тийины: ×100 без плавающей точки.
      const [units, cents = '00'] = event.price.toFixed(2).split('.');
      const amountMinor = BigInt(units) * 100n + BigInt(cents);

      // M-6: снапшот эффективной комиссии (E-1: оверрайд → пакет → START).
      const ent = await this.entitlements.getEffectiveEntitlements(
        event.organizationId,
      );
      const commissionAmountMinor = mulBpsHalfUp(
        amountMinor,
        ent.commissionBps,
      );

      const created = await this.ticketingRepository.createTicketOrder(tx, {
        organizationId: event.organizationId,
        kind: OrderKind.TICKET_SALE,
        status: OrderStatus.PENDING_PAYMENT,
        eventId: event.id,
        registrationId,
        amountMinor,
        currency: event.currency ?? Currency.UZS,
        commissionBpsSnapshot: ent.commissionBps,
        commissionAmountMinor,
        holdExpiresAt: new Date(now.getTime() + HOLD_MINUTES * 60_000),
      });

      // Цепочка 2, платёжное плечо: REG-02 (слитый с REG-01 пуш платного
      // флоу, OQ-21) + план REG-03 (T+10м) и REG-04 (экспирация hold).
      notifyAfterCommit = await this.registrationChain.onCheckoutCreated(
        created,
        tx,
      );
      return created;
    });

    if (notifyAfterCommit) {
      await (notifyAfterCommit as () => Promise<void>)();
    }
    return order;
  }

  /**
   * Подтверждение оплаты заказа (из адаптера M-5 или MANUAL-пути). Идемпотентно:
   * повторное подтверждение уже PAID-заказа — no-op. Пишет выручку COMMISSION.
   */
  async confirmTicketPaid(
    orderId: string,
    channel: RevenueChannel,
    organizationLabel?: string | null,
  ): Promise<Order | null> {
    const confirmed = await this.ticketingRepository.runInTransaction(
      async (tx) => {
        const order = await this.ticketingRepository.confirmPaid(tx, orderId);
        if (!order) return null; // уже подтверждён или не в ожидании — идемпотентный выход

        if (order.commissionAmountMinor && order.commissionAmountMinor > 0n) {
          await this.revenueService.record(
            {
              organizationRef: order.organizationId,
              organizationLabel: organizationLabel ?? null,
              type: RevenueType.COMMISSION,
              channel,
              amountMinor: order.commissionAmountMinor,
              currency: order.currency,
              sourceRef: order.id,
            },
            tx,
          );
        }
        return order;
      },
    );

    if (confirmed) {
      // Цепочка 2: гасим REG-03/REG-04 брони + REG-06 «оплата подтверждена,
      // билет готов» (после commit; идемпотентно первым переходом confirmPaid).
      await this.registrationChain.onTicketPaid(confirmed);
    }
    return confirmed;
  }
}
