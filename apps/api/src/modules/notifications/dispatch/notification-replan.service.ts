import { Injectable, Logger } from '@nestjs/common';
import { NotificationDispatchRepository } from './notification-dispatch.repository';
import { NotificationDispatcherService } from './notification-dispatcher.service';

export type EventDateKind = 'startDate' | 'endDate' | 'registrationDeadline';

/**
 * Гранулярность инвалидации по типу изменённой даты (BL-03/D-05):
 * перенос startDate НЕ гасит CLS (ключ от deadlineEpoch) и SUM (от endDate).
 */
export const DATE_KIND_CATALOG_PREFIXES: Record<EventDateKind, string[]> = {
  startDate: ['REM'],
  endDate: ['SUM'],
  registrationDeadline: ['CLS'],
};

/** Снапшот события для пересоздания плановых строк цепочкой. */
export interface ReplanEventSnapshot {
  id: string;
  status: string;
  startDate: Date;
  endDate: Date;
  registrationDeadline: Date | null;
  timezone: string | null;
  organizationId: string;
}

export type ReplanHandler = (event: ReplanEventSnapshot) => Promise<void>;

/**
 * Синхронное пере-планирование при смене дат события (BL-03).
 *
 * Механизм: events.service.update при изменении
 * startDate/endDate/registrationDeadline синхронно вызывает
 * onEventDatesChanged — cancelBy с гранулярностью по типу изменённой даты +
 * пересоздание строк зарегистрированными replan-функциями. Сами генераторы
 * цепочек (REM/CLS/SUM) появятся в Батче 6 и зарегистрируются здесь через
 * registerReplanHandler; до тех пор пересоздание — no-op (каркас и вызовы на
 * месте). Суточный reconcile-свип — только страховка, не основной путь (D-05).
 */
@Injectable()
export class NotificationReplanService {
  private readonly logger = new Logger(NotificationReplanService.name);
  /** Реестр «префикс каталога ('REM'|'CLS'|'SUM') → replan(event)». */
  private readonly handlers = new Map<string, ReplanHandler>();

  constructor(
    private readonly dispatcher: NotificationDispatcherService,
    private readonly repository: NotificationDispatchRepository,
  ) {}

  registerReplanHandler(catalogPrefix: string, handler: ReplanHandler): void {
    this.handlers.set(catalogPrefix, handler);
  }

  /**
   * Вызывается синхронно из update-пути события. Никогда не бросает наружу:
   * сбой подсистемы уведомлений не должен отменять сохранение события
   * (философия NotificationsService.emit); страховка — reconcile-свип.
   */
  async onEventDatesChanged(
    eventId: string,
    changed: Partial<Record<EventDateKind, boolean>>,
  ): Promise<void> {
    try {
      const prefixes = [
        ...new Set(
          (Object.keys(changed) as EventDateKind[])
            .filter((kind) => changed[kind])
            .flatMap((kind) => DATE_KIND_CATALOG_PREFIXES[kind]),
        ),
      ];
      if (prefixes.length === 0) {
        return;
      }

      await this.dispatcher.cancelBy({
        eventId,
        types: prefixes,
        reason: 'event_dates_changed',
      });

      const event = await this.repository.getEventById(eventId);
      if (!event) {
        return;
      }
      for (const prefix of prefixes) {
        const handler = this.handlers.get(prefix);
        if (handler) {
          await handler(event);
        }
      }
    } catch (error) {
      this.logger.error(
        `Пере-планирование уведомлений события ${eventId} не удалось`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
