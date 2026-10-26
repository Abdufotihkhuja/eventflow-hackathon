import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import IORedis from 'ioredis';

export interface BadgeZipProgress {
  /** Сколько получателей всего в задании. */
  total: number;
  /** Сколько бейджей уже отрисовано. */
  done: number;
}

/**
 * Счётчик прогресса фоновой выгрузки бейджей.
 *
 * Бейджи не персистятся, поэтому, в отличие от сертификатов, прогресс нельзя
 * посчитать по строкам в БД — считаем его отдельно. Redis, а не память
 * процесса: воркер дёргает internal-эндпоинт на одной реплике API, а статус у
 * организатора может спрашивать другая.
 *
 * Счётчик — вспомогательный: без Redis выгрузка всё равно доработает, просто
 * фронт покажет неопределённый прогресс.
 */
@Injectable()
export class BadgeZipProgressService implements OnModuleDestroy {
  private readonly logger = new Logger(BadgeZipProgressService.name);
  private readonly redis?: IORedis;
  /** Задание живёт минуты; час с запасом на медленный опрос вкладки. */
  private readonly ttlSeconds = 60 * 60;

  constructor(private readonly configService: ConfigService) {
    const disabled =
      this.configService.get<string>('OPENAPI_EXPORT_MODE') === 'true' ||
      process.env.OPENAPI_EXPORT_MODE === 'true';
    if (disabled) {
      return;
    }

    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (!redisUrl) {
      return;
    }

    this.redis = new IORedis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis?.quit();
  }

  async start(jobId: string, total: number): Promise<void> {
    await this.write(jobId, { total, done: 0 });
  }

  async advance(jobId: string, done: number, total: number): Promise<void> {
    await this.write(jobId, { total, done });
  }

  async read(jobId: string): Promise<BadgeZipProgress | null> {
    if (!this.redis) {
      return null;
    }
    try {
      const raw = await this.redis.get(this.key(jobId));
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw) as Partial<BadgeZipProgress>;
      if (
        typeof parsed.total !== 'number' ||
        typeof parsed.done !== 'number'
      ) {
        return null;
      }
      return { total: parsed.total, done: parsed.done };
    } catch (error) {
      this.logger.warn(
        `Failed to read badge zip progress ${jobId}: ${
          error instanceof Error ? error.message : 'unknown'
        }`,
      );
      return null;
    }
  }

  async clear(jobId: string): Promise<void> {
    if (!this.redis) {
      return;
    }
    try {
      await this.redis.del(this.key(jobId));
    } catch {
      // Счётчик и сам протухнет по TTL.
    }
  }

  private async write(jobId: string, value: BadgeZipProgress): Promise<void> {
    if (!this.redis) {
      return;
    }
    try {
      await this.redis.set(
        this.key(jobId),
        JSON.stringify(value),
        'EX',
        this.ttlSeconds,
      );
    } catch (error) {
      // Прогресс — не критичный путь: сбой записи не должен ронять выгрузку.
      this.logger.warn(
        `Failed to write badge zip progress ${jobId}: ${
          error instanceof Error ? error.message : 'unknown'
        }`,
      );
    }
  }

  private key(jobId: string): string {
    return `badge-zip:progress:${jobId}`;
  }
}
