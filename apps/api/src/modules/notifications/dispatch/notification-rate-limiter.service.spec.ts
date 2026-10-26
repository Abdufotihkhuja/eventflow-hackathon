import { NotificationRateLimiterService } from './notification-rate-limiter.service';

/**
 * In-memory имитация нужного подмножества Redis sorted-set API.
 * Голые jest.fn()-обёртки не подходят: лимитеру нужна настоящая семантика
 * окна (zremrangebyscore + zcard + zadd).
 */
class FakeRedis {
  private readonly zsets = new Map<string, Map<string, number>>();

  zremrangebyscore(key: string, min: number, max: number): Promise<number> {
    const set = this.zsets.get(key);
    if (!set) return Promise.resolve(0);
    let removed = 0;
    for (const [member, score] of set) {
      if (score >= min && score <= max) {
        set.delete(member);
        removed += 1;
      }
    }
    return Promise.resolve(removed);
  }

  zcard(key: string): Promise<number> {
    return Promise.resolve(this.zsets.get(key)?.size ?? 0);
  }

  zadd(key: string, score: number, member: string): Promise<number> {
    const set = this.zsets.get(key) ?? new Map<string, number>();
    set.set(member, score);
    this.zsets.set(key, set);
    return Promise.resolve(1);
  }

  pexpire(): Promise<number> {
    return Promise.resolve(1);
  }
}

function buildLimiter() {
  // OPENAPI_EXPORT_MODE=true отключает реальный Redis в конструкторе;
  // подменяем клиент in-memory имитацией.
  const service = new NotificationRateLimiterService({
    get: (key: string) => (key === 'OPENAPI_EXPORT_MODE' ? 'true' : undefined),
  } as never);
  const redis = new FakeRedis();
  (service as unknown as { redis: FakeRedis }).redis = redis;
  return { service, redis };
}

describe('NotificationRateLimiterService (BL-22, OQ-16)', () => {
  const ACCOUNT = 'acc-1';

  it('пропускает 4 informational-пуша в час, 5-й подавляет', async () => {
    const { service } = buildLimiter();
    for (let i = 0; i < 4; i += 1) {
      await expect(
        service.tryConsumeInformationalPush(ACCOUNT),
      ).resolves.toBe(true);
    }
    await expect(service.tryConsumeInformationalPush(ACCOUNT)).resolves.toBe(
      false,
    );
  });

  it('лимит per-account: соседний аккаунт не задет', async () => {
    const { service } = buildLimiter();
    for (let i = 0; i < 4; i += 1) {
      await service.tryConsumeInformationalPush(ACCOUNT);
    }
    await expect(
      service.tryConsumeInformationalPush('acc-2'),
    ).resolves.toBe(true);
  });

  it('saved_event_alerts: суточный cap = 1 срабатывает раньше часового', async () => {
    const { service } = buildLimiter();
    await expect(
      service.tryConsumeInformationalPush(ACCOUNT, 'saved_event_alerts'),
    ).resolves.toBe(true);
    // Часовой бюджет ещё не исчерпан (1 из 4), но суточный cap категории = 1.
    await expect(
      service.tryConsumeInformationalPush(ACCOUNT, 'saved_event_alerts'),
    ).resolves.toBe(false);
    // Обычный informational другой категории при этом ещё проходит.
    await expect(service.tryConsumeInformationalPush(ACCOUNT)).resolves.toBe(
      true,
    );
  });

  it('без Redis (fail-open) лимитер не глушит доставку', async () => {
    const service = new NotificationRateLimiterService({
      get: (key: string) =>
        key === 'OPENAPI_EXPORT_MODE' ? 'true' : undefined,
    } as never);
    await expect(service.tryConsumeInformationalPush(ACCOUNT)).resolves.toBe(
      true,
    );
  });
});
