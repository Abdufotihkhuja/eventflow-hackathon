import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PERMISSIONS } from '../../../common/constants/permissions.constant';
import { PLATFORM_TIMEZONE } from '../dispatch/quiet-hours';
import { NotificationAudienceRepository } from '../dispatch/notification-audience.repository';
import { NotificationDispatcherService } from '../dispatch/notification-dispatcher.service';
import {
  MaterializeResult,
  ScheduledRowLike,
} from '../dispatch/notification.types';
import { NotificationChainDataRepository } from './chain-data.repository';
import { formatDateKeyInZone, nextLocalHour } from './chain-shared';

/** 09:00 Asia/Tashkent (OQ-15); оверрайд — PlatformSetting. */
const DEFAULT_DIGEST_HOUR = 9;
const DIGEST_HOUR_SETTING_KEY = 'notifications.digest_hour';
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * REG-22 — дневной дайджест регистраций организатору (BL-19, OQ-23:
 * PER-ACCOUNT: один пуш на аккаунт со сводкой по всем его событиям — иначе
 * K событий = K пушей в 09:00 и недетерминированный расстрел лимитером, D-13).
 *
 * Механизм рекуррентности: фабрика строк следующего дня живёт в
 * reconcile-свипе (ежесуточно) + самоподдержание — исполненный дайджест
 * планирует свой завтрашний. Строка ScheduledNotification —
 * `reg:digest:{accountId}:{yyyy-mm-dd}` (dedupKey планировщика глобально
 * уникален); семантический ключ ДОСТАВКИ — `reg:digest:{yyyy-mm-dd}`
 * (получатель в composite unique, каталог §4).
 */
@Injectable()
export class RegistrationDigestService implements OnModuleInit {
  private readonly logger = new Logger(RegistrationDigestService.name);

  constructor(
    private readonly dispatcher: NotificationDispatcherService,
    private readonly audience: NotificationAudienceRepository,
    private readonly data: NotificationChainDataRepository,
  ) {}

  onModuleInit(): void {
    this.dispatcher.registerMaterializer(
      'REG-22',
      this.materializeDigest.bind(this),
    );
  }

  /**
   * Фабрика строк ближайшего 09:00 для всех организаторских аккаунтов с
   * живыми PUBLISHED-событиями. Идемпотентна (dedupKey дня); зовётся
   * reconcile-свипом раз в сутки.
   */
  async scheduleUpcoming(now = new Date()): Promise<number> {
    try {
      const accountIds = await this.data.listDigestAccountIds(
        PERMISSIONS.REGISTRATIONS_READ,
      );
      const runAt = await this.nextDigestRunAt(now);
      let created = 0;
      for (const accountId of accountIds) {
        const result = await this.scheduleForAccount(accountId, runAt);
        if (result) {
          created += 1;
        }
      }
      return created;
    } catch (error) {
      this.logger.error(
        'Фабрика дайджест-строк не выполнена',
        error instanceof Error ? error.stack : String(error),
      );
      return 0;
    }
  }

  private async scheduleForAccount(
    accountId: string,
    runAt: Date,
  ): Promise<boolean> {
    const dateKey = formatDateKeyInZone(runAt, PLATFORM_TIMEZONE);
    const { created } = await this.dispatcher.schedule({
      catalogId: 'REG-22',
      dedupKey: `reg:digest:${accountId}:${dateKey}`,
      runAt,
      kind: 'informational',
      priority: 'normal',
      preferenceKey: 'organizer_registrations',
      accountId,
      context: { dateKey },
    });
    return created;
  }

  /**
   * Материализация дайджеста аккаунта: агрегат за 24 часа до runAt по всем
   * организациям, где аккаунт владелец/имеет registrations:read. Пусто или
   * только «first»-события (уже объявлены REG-20) → skip. Исполненный
   * дайджест самоподдерживается — планирует завтрашнюю строку.
   */
  private async materializeDigest(
    row: ScheduledRowLike,
  ): Promise<MaterializeResult> {
    const accountId = row.accountId;
    if (!accountId) {
      return { action: 'skip', reason: 'account_missing' };
    }
    // Самоподдержание рекуррентности (BL-19) — до guard'ов: затишье сегодня
    // не должно оборвать завтрашний дайджест.
    await this.scheduleForAccount(
      accountId,
      await this.nextDigestRunAt(new Date()),
    ).catch(() => undefined);

    const organizationIds = await this.data.listAccountOrganizationIds(
      accountId,
      PERMISSIONS.REGISTRATIONS_READ,
    );
    if (organizationIds.length === 0) {
      return { action: 'skip', reason: 'no_organizations' };
    }
    const windowEnd = row.runAt;
    const windowStart = new Date(windowEnd.getTime() - DAY_MS);
    const stats = await this.data.getDigestStats(
      organizationIds,
      windowStart,
      windowEnd,
    );
    if (stats.newCount + stats.cancelledCount === 0) {
      return { action: 'skip', reason: 'no_activity' };
    }
    const recipients = await this.audience.resolveAccountRecipients([
      accountId,
    ]);
    const recipient = recipients.get(accountId);
    if (!recipient) {
      return { action: 'skip', reason: 'recipient_gone' };
    }
    const dateKey =
      typeof row.context?.dateKey === 'string'
        ? row.context.dateKey
        : formatDateKeyInZone(windowEnd, PLATFORM_TIMEZONE);
    return {
      action: 'dispatch',
      intent: {
        catalogId: 'REG-22',
        // Семантический ключ БЕЗ аккаунта (каталог §4/OQ-23): получатель — в
        // composite unique (dedupKey, accountId, channel).
        dedupKey: `reg:digest:${dateKey}`,
        recipients: [recipient],
        push: {
          params: {
            newCount: stats.newCount,
            cancelledCount: stats.cancelledCount,
            eventsCount: stats.eventsCount,
          },
          payload: { dateKey },
        },
      },
    };
  }

  private async nextDigestRunAt(now: Date): Promise<Date> {
    const raw = await this.data.getPlatformSetting(DIGEST_HOUR_SETTING_KEY);
    const parsed = raw ? Number(raw) : NaN;
    const hour =
      Number.isInteger(parsed) && parsed >= 0 && parsed <= 23
        ? parsed
        : DEFAULT_DIGEST_HOUR;
    return nextLocalHour(now, hour, PLATFORM_TIMEZONE);
  }
}
