import {
  Injectable,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import IORedis from 'ioredis';

@Injectable()
export class JobIdempotencyService implements OnModuleDestroy {
  private readonly logger = new Logger(JobIdempotencyService.name);
  private readonly redis?: IORedis;
  private readonly connectionsDisabled: boolean;
  private readonly ttlSeconds = 60 * 60 * 24 * 7;

  constructor(private readonly configService: ConfigService) {
    this.connectionsDisabled =
      this.configService.get<string>('OPENAPI_EXPORT_MODE') === 'true' ||
      process.env.OPENAPI_EXPORT_MODE === 'true';

    if (this.connectionsDisabled) {
      this.logger.log('Job idempotency Redis is disabled for OpenAPI export mode');
      return;
    }

    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (!redisUrl) {
      throw new Error(
        'REDIS_URL is required when job idempotency is enabled',
      );
    }

    this.redis = new IORedis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.redis) {
      return;
    }

    await this.redis.quit();
  }

  async hasProcessed(scope: string, key: string): Promise<boolean> {
    if (!this.redis) {
      return false;
    }

    const result = await this.redis.get(this.getRedisKey(scope, key));
    return result === 'done';
  }

  async markProcessed(scope: string, key: string): Promise<void> {
    if (!this.redis) {
      return;
    }

    await this.redis.set(
      this.getRedisKey(scope, key),
      'done',
      'EX',
      this.ttlSeconds,
    );
  }

  async reserve(scope: string, key: string): Promise<boolean> {
    if (!this.redis) {
      return true;
    }

    try {
      const result = await this.redis.set(
        this.getRedisKey(scope, key),
        'processing',
        'EX',
        this.ttlSeconds,
        'NX',
      );

      const reserved = result === 'OK';

      if (!reserved) {
        this.logger.warn(
          JSON.stringify({
            type: 'queue_idempotency_conflict',
            scope,
            key,
          }),
        );
      }

      return reserved;
    } catch (error) {
      this.logger.error(
        `Failed to reserve idempotency key ${scope}:${key}`,
        error instanceof Error ? error.message : 'Unknown error',
      );
      return false;
    }
  }

  async clear(scope: string, key: string): Promise<void> {
    if (!this.redis) {
      return;
    }

    await this.redis.del(this.getRedisKey(scope, key));
  }

  private getRedisKey(scope: string, key: string): string {
    return `eventflow:idempotency:${scope}:${key}`;
  }
}
