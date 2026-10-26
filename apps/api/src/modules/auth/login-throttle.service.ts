import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import IORedis from 'ioredis';

/**
 * Пер-аккаунтная защита от брутфорса/пароль-спрея на входе.
 *
 * ThrottlerGuard ограничивает только по IP — ботнет/ротация прокси обходят это,
 * получая свежий лимит на каждый IP против любого аккаунта (включая
 * superadmin/login). Здесь считаем неудачи по НОРМАЛИЗОВАННОМУ идентификатору
 * аккаунта (email или inn:email) в Redis и временно блокируем после порога,
 * независимо от IP.
 *
 * Fail-open: если Redis недоступен/не настроен, вход НЕ блокируется (иначе
 * падение Redis заблокировало бы всех) — только пишем предупреждение в лог.
 */
@Injectable()
export class LoginThrottleService implements OnModuleDestroy {
  private readonly logger = new Logger(LoginThrottleService.name);
  private readonly redis?: IORedis;

  // Порог/окна. Подобраны так, чтобы не мешать обычным опечаткам пароля, но
  // резать автоматизированный перебор.
  private readonly maxFailures = 10;
  private readonly windowSeconds = 15 * 60;
  private readonly lockoutSeconds = 15 * 60;

  constructor(private readonly configService: ConfigService) {
    const disabled =
      this.configService.get<string>('OPENAPI_EXPORT_MODE') === 'true' ||
      process.env.OPENAPI_EXPORT_MODE === 'true';
    if (disabled) {
      return;
    }

    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (!redisUrl) {
      this.logger.warn(
        'REDIS_URL not set — per-account login lockout is disabled (fail-open).',
      );
      return;
    }

    this.redis = new IORedis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
    this.redis.on('error', (error: Error) => {
      this.logger.warn(`login-throttle redis error: ${error.message}`);
    });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
    }
  }

  /**
   * Бросает 429, если аккаунт сейчас заблокирован. Вызывать ДО проверки пароля.
   */
  async assertNotLocked(identifier: string): Promise<void> {
    if (!this.redis) {
      return;
    }
    try {
      const lockKey = this.lockKey(identifier);
      const locked = await this.redis.get(lockKey);
      if (!locked) {
        return;
      }
      const ttl = await this.redis.ttl(lockKey);
      const minutes = Math.max(1, Math.ceil((ttl > 0 ? ttl : this.lockoutSeconds) / 60));
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `Слишком много неудачных попыток входа. Повторите через ${minutes} мин.`,
          error: 'Too Many Requests',
          code: 'ACCOUNT_TEMPORARILY_LOCKED',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      // Ошибка Redis — не блокируем вход (fail-open).
      this.logger.warn(
        `login-throttle assertNotLocked failed (allowing): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * Регистрирует неудачную попытку входа. При достижении порога — временная
   * блокировка аккаунта.
   */
  async registerFailure(identifier: string): Promise<void> {
    if (!this.redis) {
      return;
    }
    try {
      const failKey = this.failKey(identifier);
      const count = await this.redis.incr(failKey);
      if (count === 1) {
        await this.redis.expire(failKey, this.windowSeconds);
      }
      if (count >= this.maxFailures) {
        await this.redis.set(
          this.lockKey(identifier),
          '1',
          'EX',
          this.lockoutSeconds,
        );
        await this.redis.del(failKey);
        this.logger.warn(
          JSON.stringify({
            type: 'login_account_locked',
            identifier: this.normalize(identifier),
            lockoutSeconds: this.lockoutSeconds,
          }),
        );
      }
    } catch (error) {
      this.logger.warn(
        `login-throttle registerFailure failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * Сбрасывает счётчик/блокировку после успешного входа.
   */
  async reset(identifier: string): Promise<void> {
    if (!this.redis) {
      return;
    }
    try {
      await this.redis.del(this.failKey(identifier), this.lockKey(identifier));
    } catch {
      // Не критично.
    }
  }

  private normalize(identifier: string): string {
    return identifier.trim().toLowerCase();
  }

  private failKey(identifier: string): string {
    return `eventflow:login-fail:${this.normalize(identifier)}`;
  }

  private lockKey(identifier: string): string {
    return `eventflow:login-lock:${this.normalize(identifier)}`;
  }
}
