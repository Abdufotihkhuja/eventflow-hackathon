import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  EventType,
  OrderStatus,
  Prisma,
  RegistrationStatus,
} from '@prisma/client';
import { PERMISSIONS } from '../../../common/constants/permissions.constant';
import { NotificationAudienceRepository } from '../dispatch/notification-audience.repository';
import { NotificationDispatcherService } from '../dispatch/notification-dispatcher.service';
import {
  MaterializeResult,
  ScheduledRefs,
  ScheduledRowLike,
} from '../dispatch/notification.types';
import {
  ChainEventSnapshot,
  NotificationChainDataRepository,
} from './chain-data.repository';
import {
  epochSeconds,
  formatDateKeyInZone,
  formatTimeInZone,
  moderationWindow,
  resolveEventTimezone,
} from './chain-shared';
import { ClosingChainService } from './closing-chain.service';
import { ReminderChainService } from './reminder-chain.service';

/** REG-03 — напоминание об оплате за 5 минут до смерти 15-минутной брони. */
const PAY_REMINDER_DELAY_MS = 10 * 60 * 1000;
/** Пороги заполненности REG-21 (каталог §4). */
const CAPACITY_THRESHOLDS = [50, 80, 100] as const;

/** Что произошло с заказом/регистрацией — для текстов и ключей. */
export interface RegistrationCreatedInput {
  registrationId: string;
  eventId: string;
  status: RegistrationStatus;
  ticketNumber?: string | null;
}

/**
 * Цепочка 2 — прогресс регистрации (REG-01..12 участнику, REG-20..23
 * организатору; NOTIFICATIONS_CATALOG §4, BL-24/BL-29).
 *
 * Особые решения (задокументированы в каталоге/OQ):
 * - OQ-21: платный флоу сливает REG-01+REG-02 — push «заявка создана» не
 *   шлётся, его роль играет пуш чекаута «оплатите до HH:mm»;
 * - REG-08 «билет выдан» ВСЕГДА коалесцирован: номер билета выдаётся в той же
 *   операции, что REG-01 (free) или REG-06 (paid) — отдельной точки эмиссии в
 *   домене не существует, тексты REG-01/06 уже говорят про билет;
 * - REG-04 job — триггер фактической экспирации брони (была lazy);
 * - dedup-ключи REG-01/REG-06 дополнены временнЫм квантом/decisionEpoch:
 *   ре-регистрация и revoke→повторный approve переиспользуют ту же строку
 *   Registration — без кванта второй цикл остался бы без уведомления.
 */
@Injectable()
export class RegistrationChainService implements OnModuleInit {
  private readonly logger = new Logger(RegistrationChainService.name);

  constructor(
    private readonly dispatcher: NotificationDispatcherService,
    private readonly audience: NotificationAudienceRepository,
    private readonly data: NotificationChainDataRepository,
    private readonly reminderChain: ReminderChainService,
    private readonly closingChain: ClosingChainService,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit(): void {
    this.dispatcher.registerMaterializer(
      'REG-03',
      this.materializePaymentReminder.bind(this),
    );
    this.dispatcher.registerMaterializer(
      'REG-04',
      this.materializeHoldExpiry.bind(this),
    );
  }

  // ── Участник: создание/решения ─────────────────────────────────────────────

  /**
   * Регистрация создана: REG-01 участнику (free/REQUEST; платный флоу — OQ-21,
   * пуш сольётся с чекаутом), REG-20 «первая» + REG-21 пороги организатору,
   * CLS-02 «осталось N мест» заинтересованным.
   */
  async onRegistrationCreated(input: RegistrationCreatedInput): Promise<void> {
    try {
      const event = await this.data.getEventSnapshot(input.eventId);
      if (!event) {
        return;
      }
      const recipient = await this.audience.resolveRegistrationParticipant(
        input.registrationId,
      );
      const isPaid = event.type === EventType.PAID && event.price !== null;
      const isPending = input.status === RegistrationStatus.PENDING;

      if (recipient) {
        await this.dispatcher.dispatch({
          catalogId: 'REG-01',
          // Квант 10 минут: ре-регистрация после отмены живёт в той же строке
          // Registration — без кванта повторный цикл дедупился бы навсегда.
          dedupKey: `reg:created:${input.registrationId}:${moderationWindow(new Date())}`,
          // Email-плечо REG-01 остаётся существующим E-09
          // (sendRegistrationCreated) — здесь только push + участнический
          // инбокс. Платный флоу: push сливается с REG-02 (OQ-21).
          channels: isPaid ? ['in_app'] : ['push', 'in_app'],
          eventId: input.eventId,
          registrationId: input.registrationId,
          recipients: [recipient],
          push: {
            key: isPending ? 'push.reg.pending' : 'push.reg.created',
            params: { eventTitle: event.title },
            route: isPending ? '/event/[id]' : '/ticket/[id]',
            routeParams: isPending
              ? { id: input.eventId }
              : { id: input.registrationId },
            payload: {},
          },
          inApp: {
            type: 'REGISTRATION_CREATED',
            entityType: 'event',
            entityId: input.eventId,
            payload: {
              eventTitle: event.title,
              pending: isPending,
              registrationId: input.registrationId,
            },
          },
        });
      }

      await this.notifyOrganizersOnGrowth(event);
      await this.closingChain.onSeatsChanged(event);
    } catch (error) {
      this.swallow('onRegistrationCreated', input.registrationId, error);
    }
  }

  /**
   * PENDING→APPROVED (организатор или оплата): REG-06 — оживший
   * `registration-approved` + push + участнический инбокс; план REM-01/03.
   */
  async onRegistrationApproved(registrationId: string): Promise<void> {
    try {
      const registration = await this.data.getRegistration(registrationId);
      if (!registration) {
        return;
      }
      const event = await this.data.getEventSnapshot(registration.eventId);
      const recipient = await this.audience.resolveRegistrationParticipant(
        registrationId,
      );
      if (!event || !recipient) {
        return;
      }
      const publicUrl =
        this.configService.get<string>('frontend.publicUrl') ?? '';
      await this.dispatcher.dispatch({
        catalogId: 'REG-06',
        // decisionEpoch: revoke→PENDING→повторный approve обязан прозвучать.
        dedupKey: `reg:approved:${registrationId}:${epochSeconds(new Date())}`,
        eventId: event.id,
        registrationId,
        recipients: [recipient],
        push: {
          params: { eventTitle: event.title },
          routeParams: { id: registrationId },
          payload: {},
        },
        inApp: {
          type: 'REGISTRATION_APPROVED',
          entityType: 'event',
          entityId: event.id,
          payload: { eventTitle: event.title, registrationId },
        },
        email: {
          subject: `Заявка одобрена: «${event.title}»`,
          template: 'registration-approved',
          context: {
            userName: this.userName(registration.user),
            eventTitle: event.title,
            organizationName: event.organizationName,
            ticketNumber: registration.ticketNumber ?? '',
            // /profile/tickets/[eventId] — маршрут ищет билет по СОБЫТИЮ,
            // не по регистрации (см. TicketViewService.getMyTicketViewModel).
            ticketUrl: publicUrl
              ? `${publicUrl}/profile/tickets/${event.id}`
              : '',
          },
        },
      });
      await this.reminderChain.scheduleForRegistration(registrationId, event);
    } catch (error) {
      this.swallow('onRegistrationApproved', registrationId, error);
    }
  }

  /** PENDING→REJECTED: REG-07 (оживший `registration-rejected`). */
  async onRegistrationRejected(
    registrationId: string,
    reason: string | null,
  ): Promise<void> {
    try {
      const registration = await this.data.getRegistration(registrationId);
      if (!registration) {
        return;
      }
      const event = await this.data.getEventSnapshot(registration.eventId);
      const recipient = await this.audience.resolveRegistrationParticipant(
        registrationId,
      );
      if (!event || !recipient) {
        return;
      }
      await this.dispatcher.dispatch({
        catalogId: 'REG-07',
        dedupKey: `reg:rejected:${registrationId}:${epochSeconds(new Date())}`,
        eventId: event.id,
        registrationId,
        recipients: [recipient],
        push: {
          params: { eventTitle: event.title },
          routeParams: { id: event.id },
          payload: {},
        },
        inApp: {
          type: 'REGISTRATION_REJECTED',
          entityType: 'event',
          entityId: event.id,
          payload: {
            eventTitle: event.title,
            reason: reason ?? null,
            registrationId,
          },
        },
        email: {
          subject: `Заявка отклонена: «${event.title}»`,
          template: 'registration-rejected',
          context: {
            userName: this.userName(registration.user),
            eventTitle: event.title,
            reason: reason ?? '',
          },
        },
      });
      await this.dispatcher.cancelBy({
        registrationId,
        reason: 'registration_rejected',
      });
    } catch (error) {
      this.swallow('onRegistrationRejected', registrationId, error);
    }
  }

  /**
   * Отмена организатором (PENDING/APPROVED→CANCELLED): REG-10 c судьбой денег
   * при PAID-заказе. Email — существующий registration-cancelled, теперь через
   * диспатчер (журнал/дедуп вместо прямого MailService).
   */
  async onCancelledByOrganizer(
    registrationId: string,
    reason: string | null,
  ): Promise<void> {
    try {
      const registration = await this.data.getRegistration(registrationId);
      if (!registration) {
        return;
      }
      const event = await this.data.getEventSnapshot(registration.eventId);
      const recipient = await this.audience.resolveRegistrationParticipant(
        registrationId,
      );
      if (!event || !recipient) {
        return;
      }
      const paidOrder = await this.data.getPaidOrderForRegistration(
        registrationId,
      );
      await this.dispatcher.dispatch({
        catalogId: 'REG-10',
        dedupKey: `reg:cancelled:${registrationId}`,
        eventId: event.id,
        registrationId,
        recipients: [recipient],
        push: {
          params: { eventTitle: event.title },
          routeParams: { id: event.id },
          payload: {},
        },
        inApp: {
          type: 'REGISTRATION_CANCELLED',
          entityType: 'event',
          entityId: event.id,
          payload: {
            eventTitle: event.title,
            reason: reason ?? null,
            registrationId,
            // Судьба денег (каталог REG-10): сумма — на экране, не в пуше (OQ-32).
            ...(paidOrder
              ? {
                  refundPending: true,
                  refundAmountMinor: paidOrder.amountMinor.toString(10),
                }
              : {}),
          },
        },
        email: {
          subject: `Участие отменено: «${event.title}»`,
          template: 'registration-cancelled',
          context: {
            userName: this.userName(registration.user),
            eventTitle: event.title,
            organizationName: event.organizationName,
            reason: reason ?? '',
          },
        },
      });
      await this.dispatcher.cancelBy({
        registrationId,
        reason: 'registration_cancelled',
      });
    } catch (error) {
      this.swallow('onCancelledByOrganizer', registrationId, error);
    }
  }

  /** Самоотмена участника: своих пушей не шлём, только гасим план. */
  async onCancelledBySelf(registrationId: string): Promise<void> {
    try {
      await this.dispatcher.cancelBy({
        registrationId,
        reason: 'registration_cancelled_by_participant',
      });
    } catch (error) {
      this.swallow('onCancelledBySelf', registrationId, error);
    }
  }

  /** APPROVED→PENDING (revoke): REG-11 + снятие REM/SUM регистрации. */
  async onApprovalRevoked(
    registrationId: string,
    reason: string | null,
  ): Promise<void> {
    try {
      const registration = await this.data.getRegistration(registrationId);
      if (!registration) {
        return;
      }
      const event = await this.data.getEventSnapshot(registration.eventId);
      const recipient = await this.audience.resolveRegistrationParticipant(
        registrationId,
      );
      if (!event || !recipient) {
        return;
      }
      await this.dispatcher.dispatch({
        catalogId: 'REG-11',
        dedupKey: `reg:revoked:${registrationId}:${epochSeconds(new Date())}`,
        eventId: event.id,
        registrationId,
        recipients: [recipient],
        push: {
          params: { eventTitle: event.title },
          routeParams: { id: event.id },
          payload: {},
        },
        inApp: {
          type: 'REGISTRATION_REVOKED',
          entityType: 'event',
          entityId: event.id,
          payload: {
            eventTitle: event.title,
            reason: reason ?? null,
            registrationId,
          },
        },
        email: {
          subject: `Подтверждение отозвано: «${event.title}»`,
          template: 'registration-revoked',
          context: {
            userName: this.userName(registration.user),
            eventTitle: event.title,
            organizationName: event.organizationName,
            reason: reason ?? '',
          },
        },
      });
      await this.dispatcher.cancelBy({
        registrationId,
        types: ['REM', 'SUM'],
        reason: 'approval_revoked',
      });
    } catch (error) {
      this.swallow('onApprovalRevoked', registrationId, error);
    }
  }

  /**
   * Событие CANCELLED: гасим ВСЕ плановые строки события и шлём REG-10 всем
   * активным (PENDING/APPROVED) — per-registration ключи (у участников без
   * Account общий ключ упёрся бы в партиальный unique email-строк).
   */
  async onEventCancelled(eventId: string): Promise<void> {
    try {
      const event = await this.data.getEventSnapshot(eventId);
      if (!event) {
        return;
      }
      await this.dispatcher.cancelBy({ eventId, reason: 'event_cancelled' });
      const recipients = await this.audience.resolveActiveRegistrations(
        eventId,
      );
      for (const recipient of recipients) {
        if (!recipient.registrationId) {
          continue;
        }
        await this.dispatcher.dispatch({
          catalogId: 'REG-10',
          dedupKey: `reg:cancelled:${recipient.registrationId}`,
          eventId,
          registrationId: recipient.registrationId,
          recipients: [recipient],
          push: {
            params: { eventTitle: event.title },
            routeParams: { id: eventId },
            payload: {},
          },
          inApp: {
            type: 'EVENT_CANCELLED',
            entityType: 'event',
            entityId: eventId,
            payload: {
              eventTitle: event.title,
              registrationId: recipient.registrationId,
            },
          },
          email: {
            subject: `Мероприятие отменено: «${event.title}»`,
            template: 'registration-cancelled',
            context: {
              eventTitle: event.title,
              organizationName: event.organizationName,
              reason: '',
            },
          },
        });
      }
    } catch (error) {
      this.swallow('onEventCancelled', eventId, error);
    }
  }

  // ── Платёжное плечо (Order kind=TICKET_SALE, B-05) ─────────────────────────

  /**
   * Чекаут создан (Order→PENDING_PAYMENT, hold 15м). Вызывается ИЗНУТРИ
   * транзакции чекаута (BL-06): строки создаются в tx, возвращается
   * enqueue-замыкание — вызвать ПОСЛЕ commit.
   */
  async onCheckoutCreated(
    order: {
      id: string;
      registrationId: string | null;
      eventId: string | null;
      holdExpiresAt: Date | null;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<() => Promise<void>> {
    const noop = async (): Promise<void> => undefined;
    try {
      if (!order.registrationId || !order.eventId || !order.holdExpiresAt) {
        return noop;
      }
      const event = await this.data.getEventSnapshot(order.eventId, tx);
      const recipient = await this.audience.resolveRegistrationParticipant(
        order.registrationId,
      );
      if (!event || !recipient) {
        return noop;
      }
      const timezone = resolveEventTimezone(event.timezone);
      // OQ-21: единый пуш платного флоу — «заявка создана, оплатите до HH:mm».
      const result = await this.dispatcher.dispatchNow(
        {
          catalogId: 'REG-02',
          dedupKey: `reg:payhold:${order.id}`,
          channels: ['push', 'in_app'],
          eventId: order.eventId,
          registrationId: order.registrationId,
          orderId: order.id,
          recipients: [recipient],
          push: {
            params: {
              eventTitle: event.title,
              holdUntil: formatTimeInZone(order.holdExpiresAt, timezone),
            },
            routeParams: { id: order.eventId },
            payload: { orderId: order.id },
          },
          inApp: {
            type: 'PAYMENT_PENDING',
            entityType: 'event',
            entityId: order.eventId,
            payload: {
              eventTitle: event.title,
              orderId: order.id,
              holdExpiresAt: order.holdExpiresAt.toISOString(),
            },
          },
        },
        tx,
      );

      const createdAt = Date.now();
      await this.dispatcher.schedule(
        {
          catalogId: 'REG-03',
          dedupKey: `reg:payremind:${order.id}`,
          runAt: new Date(createdAt + PAY_REMINDER_DELAY_MS),
          kind: 'transactional',
          priority: 'high',
          eventId: order.eventId,
          registrationId: order.registrationId,
          orderId: order.id,
        },
        tx,
      );
      // REG-04 = И триггер экспирации, И уведомление о ней (была lazy).
      await this.dispatcher.schedule(
        {
          catalogId: 'REG-04',
          dedupKey: `reg:payexpired:${order.id}`,
          runAt: order.holdExpiresAt,
          kind: 'transactional',
          priority: 'normal',
          eventId: order.eventId,
          registrationId: order.registrationId,
          orderId: order.id,
        },
        tx,
      );
      return result.enqueue;
    } catch (error) {
      this.swallow('onCheckoutCreated', order.id, error);
      return noop;
    }
  }

  /**
   * Оплата подтверждена (Order→PAID, Registration→APPROVED): гасим
   * REG-03/REG-04 заказа; REG-06 с билетом уходит из onRegistrationApproved
   * (вызывается следом — вне транзакции подтверждения).
   */
  async onTicketPaid(order: {
    id: string;
    registrationId: string | null;
  }): Promise<void> {
    try {
      await this.dispatcher.cancelBy({
        orderId: order.id,
        reason: 'order_paid',
      });
      if (order.registrationId) {
        await this.onRegistrationApproved(order.registrationId);
      }
    } catch (error) {
      this.swallow('onTicketPaid', order.id, error);
    }
  }

  /** Платёж отклонён провайдером при живом PENDING_PAYMENT-заказе: REG-05. */
  async onPaymentFailed(orderId: string, txnId: string): Promise<void> {
    try {
      const order = await this.data.getOrder(orderId);
      // B-05: только kind=TICKET_SALE и только пока бронь жива.
      if (
        !order ||
        order.status !== OrderStatus.PENDING_PAYMENT ||
        !order.registrationId ||
        !order.eventId
      ) {
        return;
      }
      const event = await this.data.getEventSnapshot(order.eventId);
      const recipient = await this.audience.resolveRegistrationParticipant(
        order.registrationId,
      );
      if (!event || !recipient) {
        return;
      }
      await this.dispatcher.dispatch({
        catalogId: 'REG-05',
        dedupKey: `reg:payfailed:${orderId}:${txnId}`,
        channels: ['push', 'in_app'],
        eventId: order.eventId,
        registrationId: order.registrationId,
        orderId,
        recipients: [recipient],
        push: {
          params: { eventTitle: event.title },
          routeParams: { id: order.eventId },
          payload: { orderId },
        },
        inApp: {
          type: 'PAYMENT_FAILED',
          entityType: 'event',
          entityId: order.eventId,
          payload: { eventTitle: event.title, orderId },
        },
      });
    } catch (error) {
      this.swallow('onPaymentFailed', orderId, error);
    }
  }

  // ── Check-in ───────────────────────────────────────────────────────────────

  /** Создана Attendance: тихий пуш «вы отмечены» (REG-09, informational). */
  async onCheckIn(registrationId: string, checkInDate: Date): Promise<void> {
    try {
      const registration = await this.data.getRegistration(registrationId);
      if (!registration) {
        return;
      }
      const event = await this.data.getEventSnapshot(registration.eventId);
      const recipient = await this.audience.resolveRegistrationParticipant(
        registrationId,
      );
      if (!event || !recipient) {
        return;
      }
      const dateKey = formatDateKeyInZone(
        checkInDate,
        resolveEventTimezone(event.timezone),
      );
      await this.dispatcher.dispatch({
        catalogId: 'REG-09',
        dedupKey: `reg:checkin:${registrationId}:${dateKey}`,
        channels: ['push', 'in_app'],
        eventId: event.id,
        registrationId,
        recipients: [recipient],
        push: {
          params: { eventTitle: event.title },
          routeParams: { id: registrationId },
          payload: {},
        },
        inApp: {
          type: 'CHECKED_IN',
          entityType: 'event',
          entityId: event.id,
          payload: { eventTitle: event.title, registrationId },
        },
      });
    } catch (error) {
      this.swallow('onCheckIn', registrationId, error);
    }
  }

  // ── Организатор: первая/пороги ─────────────────────────────────────────────

  /**
   * REG-20 «первая регистрация» + REG-21 пороги 50/80/100% (BL-29):
   * 50% — только in-app (спам-бюджет E-(б)); 80/100 — push + in-app.
   * Антифлаппинг — ключ на порог: дребезг вокруг порога не повторяет пуш.
   */
  private async notifyOrganizersOnGrowth(
    event: ChainEventSnapshot,
  ): Promise<void> {
    const totalEver = await this.data.countAllRegistrations(event.id);
    if (totalEver === 1) {
      const organizers = await this.audience.resolveOrganizerAudience(
        event.id,
        PERMISSIONS.REGISTRATIONS_READ,
      );
      if (organizers.length > 0) {
        await this.dispatcher.dispatch({
          catalogId: 'REG-20',
          dedupKey: `reg:first:${event.id}`,
          // In-app на каждую регистрацию уже пишет EXIST-N-01 — здесь только push.
          channels: ['push'],
          eventId: event.id,
          organizationId: event.organizationId,
          recipients: organizers,
          push: {
            params: { eventTitle: event.title },
            routeParams: { eventId: event.id },
            payload: {},
          },
        });
      }
    }

    if (event.maxParticipants === null || event.maxParticipants <= 0) {
      return; // строка REG-21 не генерируется (каталог §0)
    }
    const active = await this.data.countRegistrations(event.id, [
      RegistrationStatus.PENDING,
      RegistrationStatus.APPROVED,
    ]);
    const prev = active - 1;
    for (const threshold of CAPACITY_THRESHOLDS) {
      const needed = Math.ceil((event.maxParticipants * threshold) / 100);
      if (active >= needed && prev < needed) {
        const organizers = await this.audience.resolveOrganizerAudience(
          event.id,
          PERMISSIONS.REGISTRATIONS_READ,
        );
        if (organizers.length === 0) {
          continue;
        }
        await this.dispatcher.dispatch({
          catalogId: 'REG-21',
          dedupKey: `reg:capacity:${event.id}:${threshold}`,
          channels: threshold === 50 ? ['in_app'] : ['push', 'in_app'],
          eventId: event.id,
          organizationId: event.organizationId,
          recipients: organizers,
          push: {
            key: `push.org.capacity${threshold}`,
            params: { eventTitle: event.title },
            routeParams: { eventId: event.id },
            payload: { threshold },
          },
          orgInApp: {
            organizationId: event.organizationId,
            type: 'CAPACITY_THRESHOLD',
            entityType: 'event',
            entityId: event.id,
            payload: { eventTitle: event.title, threshold },
          },
        });
      }
    }
  }

  // ── Материализаторы платёжного плеча ───────────────────────────────────────

  /** REG-03: guard — Order всё ещё PENDING_PAYMENT (иначе бронь решена). */
  private async materializePaymentReminder(
    row: ScheduledRowLike,
    refs: ScheduledRefs,
  ): Promise<MaterializeResult> {
    if (!refs.order || refs.order.status !== OrderStatus.PENDING_PAYMENT) {
      return { action: 'skip', reason: 'order_settled' };
    }
    if (!refs.registration || !refs.event) {
      return { action: 'skip', reason: 'refs_gone' };
    }
    const event = await this.data.getEventSnapshot(row.eventId as string);
    const recipient = await this.audience.resolveRegistrationParticipant(
      row.registrationId as string,
    );
    if (!event || !recipient) {
      return { action: 'skip', reason: 'recipient_gone' };
    }
    return {
      action: 'dispatch',
      intent: {
        catalogId: 'REG-03',
        dedupKey: row.dedupKey,
        eventId: event.id,
        registrationId: row.registrationId ?? undefined,
        orderId: row.orderId ?? undefined,
        recipients: [recipient],
        push: {
          params: { eventTitle: event.title },
          routeParams: { id: event.id },
          payload: { orderId: row.orderId ?? '' },
        },
      },
    };
  }

  /**
   * REG-04: job — триггер экспирации. PAID/CANCELLED успел — тихий выход;
   * PENDING_PAYMENT с истёкшим hold → EXPIRED + пуш→email участнику +
   * REG-23 in-app организатору (EXPIRED-ветка каталога — без пуша).
   */
  private async materializeHoldExpiry(
    row: ScheduledRowLike,
    refs: ScheduledRefs,
  ): Promise<MaterializeResult> {
    if (!refs.order) {
      return { action: 'skip', reason: 'order_gone' };
    }
    if (refs.order.status !== OrderStatus.PENDING_PAYMENT) {
      return { action: 'skip', reason: 'order_settled' };
    }
    const order = await this.data.getOrder(row.orderId as string);
    if (!order || !order.holdExpiresAt) {
      return { action: 'skip', reason: 'order_gone' };
    }
    if (order.holdExpiresAt.getTime() > Date.now()) {
      return { action: 'skip', reason: 'hold_extended' };
    }
    const registrationId = order.registrationId ?? row.registrationId;
    const expired = await this.data.expireOrderIfDue(order.id, new Date());
    if (!expired) {
      return { action: 'skip', reason: 'order_settled' };
    }
    const event = await this.data.getEventSnapshot(row.eventId as string);
    const recipient = registrationId
      ? await this.audience.resolveRegistrationParticipant(registrationId)
      : null;
    if (!event) {
      return { action: 'skip', reason: 'event_gone' };
    }

    // REG-23 организатору (in-app, отказ по платному билету) — параллельная
    // ветка, не связанная с интентом участника.
    const organizers = await this.audience.resolveOrganizerAudience(
      event.id,
      PERMISSIONS.REGISTRATIONS_READ,
    );
    if (organizers.length > 0) {
      await this.dispatcher.dispatch({
        catalogId: 'REG-23',
        dedupKey: `reg:orgrefund:${order.id}`,
        channels: ['in_app'],
        eventId: event.id,
        orderId: order.id,
        organizationId: event.organizationId,
        recipients: organizers,
        orgInApp: {
          organizationId: event.organizationId,
          type: 'TICKET_REFUND',
          entityType: 'event',
          entityId: event.id,
          payload: {
            eventTitle: event.title,
            orderId: order.id,
            kind: 'expired',
          },
        },
      });
    }

    if (!recipient) {
      return { action: 'skip', reason: 'recipient_gone' };
    }
    return {
      action: 'dispatch',
      intent: {
        catalogId: 'REG-04',
        dedupKey: row.dedupKey,
        eventId: event.id,
        registrationId: registrationId ?? undefined,
        orderId: order.id,
        recipients: [recipient],
        push: {
          params: { eventTitle: event.title },
          routeParams: { id: event.id },
          payload: { orderId: order.id },
        },
        inApp: {
          type: 'HOLD_EXPIRED',
          entityType: 'event',
          entityId: event.id,
          payload: { eventTitle: event.title, orderId: order.id },
        },
        // push→email fallback (каталог REG-04): контент письма — общий
        // transactional-шаблон не существует; переиспользуем event-notification?
        // Нет: fallback работает только при наличии intent.email — оставляем
        // push-only + инбокс: у участника без токена остаётся in-app строка.
      },
    };
  }

  private userName(
    user:
      | { firstName: string | null; lastName: string | null; email: string }
      | null
      | undefined,
  ): string {
    if (!user) {
      return '';
    }
    return (
      `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email
    );
  }

  private swallow(method: string, id: string, error: unknown): void {
    this.logger.error(
      `Цепочка регистрации: ${method}(${id}) не выполнена`,
      error instanceof Error ? error.stack : String(error),
    );
  }
}
