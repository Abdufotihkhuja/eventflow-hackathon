import { Injectable, Logger } from '@nestjs/common';
import { EventStatus } from '@prisma/client';
import { NotificationDispatcherService } from '../dispatch/notification-dispatcher.service';
import { NotificationChainDataRepository } from './chain-data.repository';
import { ClosingChainService } from './closing-chain.service';
import { RegistrationDigestService } from './registration-digest.service';
import { ReminderChainService } from './reminder-chain.service';
import { SummaryChainService } from './summary-chain.service';

export interface ReconcileResult {
  eventsExamined: number;
  orphanedCancelled: number;
  digestScheduled: number;
}

/**
 * Суточный reconcile-свип (страховка инварианта №3, D-05): основной путь
 * пере-планирования — синхронный (BL-03), свип лишь ДОСОЗДАЁТ недостающие
 * плановые строки живых событий, гасит осиротевшие (событие
 * CANCELLED/удалено) и служит фабрикой digest-строк следующего дня (BL-19).
 * Идемпотентен: планирование — upsert по dedupKey (resurrect для строк,
 * отменённых каскадом ошибочно/устаревшим переносом).
 */
@Injectable()
export class NotificationReconcileService {
  private readonly logger = new Logger(NotificationReconcileService.name);

  constructor(
    private readonly dispatcher: NotificationDispatcherService,
    private readonly data: NotificationChainDataRepository,
    private readonly reminderChain: ReminderChainService,
    private readonly closingChain: ClosingChainService,
    private readonly summaryChain: SummaryChainService,
    private readonly digest: RegistrationDigestService,
  ) {}

  async run(now = new Date()): Promise<ReconcileResult> {
    const result: ReconcileResult = {
      eventsExamined: 0,
      orphanedCancelled: 0,
      digestScheduled: 0,
    };

    // 1. Досоздать недостающие строки живых событий (идемпотентно).
    const events = await this.data.listEventsForReconcile(now);
    for (const { id } of events) {
      try {
        const snapshot = await this.data.getEventSnapshot(id);
        if (!snapshot) {
          continue;
        }
        result.eventsExamined += 1;
        if (snapshot.status === EventStatus.PUBLISHED) {
          await this.reminderChain.scheduleForEvent(snapshot, {
            resurrect: true,
          });
          await this.closingChain.scheduleForEvent(snapshot, {
            resurrect: true,
          });
        }
        // SUM живёт и у COMPLETED (T_end+24h ещё впереди).
        await this.summaryChain.scheduleForEvent(snapshot, {
          resurrect: true,
        });
      } catch (error) {
        this.logger.error(
          `Reconcile: событие ${id} не обработано`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }

    // 2. Погасить осиротевшие строки: событие исчезло/отменено/удалено.
    const scheduledEventIds = await this.data.listScheduledEventIds();
    const states = await this.data.getEventStates(scheduledEventIds);
    for (const eventId of scheduledEventIds) {
      const state = states.get(eventId);
      const orphaned =
        !state || state.deletedAt !== null ||
        state.status === EventStatus.CANCELLED;
      if (!orphaned) {
        continue;
      }
      const { scheduled } = await this.dispatcher.cancelBy({
        eventId,
        reason: 'reconcile_event_gone',
      });
      result.orphanedCancelled += scheduled;
    }

    // 3. Фабрика digest-строк ближайшего 09:00 (BL-19).
    result.digestScheduled = await this.digest.scheduleUpcoming(now);

    this.logger.log(
      JSON.stringify({ type: 'notification.reconcile', ...result }),
    );
    return result;
  }
}
