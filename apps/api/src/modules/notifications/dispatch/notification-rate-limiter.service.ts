import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import IORedis from 'ioredis';

/**
 * Rate limiter пушей (BL-22, инвариант №4, дефолты OQ-16).
 *
 * Redis sorted-set `push:rl:{accountId}` (score = timestamp), скользящее окно
 * 1 час, cap 4 informational-пуша; transactional и critical/high идут мимо
 * лимита (это решает диспатчер — сюда попадают только informational normal).
 * Плюс cap категории `saved_event_alerts` = 1 за 24 часа
 * (`push:rl:saved:{accountId}`). Превышение → Delivery со статусом
 * suppressed_rate_limit (терминально, без ретраев).
 *
 * Redis flush обнуляет лимитер — осознанно приемлемо (RECONCILIATION C-4).
 * Без Redis (OPENAPI_EXPORT_MODE) — fail-open, как JobIdempotencyService.
 */
@Injectable()
export class NotificationRateLimiterService implements OnModuleDestroy {
  static readonly INFORMATIONAL_HOURLY_CAP = 4;
  static readonly SAVED_EVENT_ALERTS_DAILY_CAP = 1;
  static readonly SAVED_EVENT_ALERTS_KEY = 'saved_event_alerts';

  private static readonly HOUR_MS = 60 * 60 * 1000;
  private static readonly DAY_MS = 24 * 60 * 60 * 1000;

  private readonly logger = new Logger(NotificationRateLimiterService.name);
  private readonly redis?: IORedis;

  constructor(configService: ConfigService) {
    const disabled =
      configService.get<string>('OPENAPI_EXPORT_MODE') === 'true' ||
      process.env.OPENAPI_EXPORT_MODE === 'true';
    if (disabled) {
      return;
    }
    const redisUrl = configService.get<string>('REDIS_URL');
    if (!redisUrl) {
      throw new Error('REDIS_URL is required for notification rate limiting');
    }
    this.redis = new IORedis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis?.quit();
  }

  /**
   * Попытка потратить бюджет informational-пуша аккаунта.
   * true — можно слать; false — превышение (suppressed_rate_limit).
   */
  async tryConsumeInformationalPush(
    accountId: string,
    preferenceKey?: string,
  ): Promise<boolean> {
    if (!this.redis) {
      return true; // fail-open: без Redis лимитер не должен глушить доставку
    }
    const now = Date.now();
    const hourlyKey = `push:rl:${accountId}`;
    const isSavedAlerts =
      preferenceKey === NotificationRateLimiterService.SAVED_EVENT_ALERTS_KEY;
    const dailyKey = `push:rl:saved:${accountId}`;

    try {
      const hourlyCount = await this.countInWindow(
        hourlyKey,
        now,
        NotificationRateLimiterService.HOUR_MS,
      );
      if (
        hourlyCount >= NotificationRateLimiterService.INFORMATIONAL_HOURLY_CAP
      ) {
        return false;
      }

      if (isSavedAlerts) {
        const dailyCount = await this.countInWindow(
          dailyKey,
          now,
          NotificationRateLimiterService.DAY_MS,
        );
        if (
          dailyCount >=
          NotificationRateLimiterService.SAVED_EVENT_ALERTS_DAILY_CAP
        ) {
          return false;
        }
      }

      const member = `${now}:${Math.random().toString(36).slice(2, 10)}`;
      await this.redis.zadd(hourlyKey, now, member);
      await this.redis.pexpire(
        hourlyKey,
        NotificationRateLimiterService.HOUR_MS + 60_000,
      );
      if (isSavedAlerts) {
        await this.redis.zadd(dailyKey, now, member);
        await this.redis.pexpire(
          dailyKey,
          NotificationRateLimiterService.DAY_MS + 60_000,
        );
      }
      return true;
    } catch (error) {
      this.logger.warn(
        `Rate limiter недоступен, пропускаем без лимита: ${
          error instanceof Error ? error.message : 'unknown'
        }`,
      );
      return true;
    }
  }

  private async countInWindow(
    key: string,
    now: number,
    windowMs: number,
  ): Promise<number> {
    if (!this.redis) {
      return 0;
    }
    await this.redis.zremrangebyscore(key, 0, now - windowMs);
    return this.redis.zcard(key);
  }
}
