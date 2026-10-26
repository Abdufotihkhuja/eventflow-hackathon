import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  NotificationPreferencesDto,
  PREFERENCE_KEY_VALUES,
  PreferenceChangeDto,
  TRANSACTIONAL_MATRIX_KEY,
} from './dto/notification-preferences.dto';

/** Эффективные значения одной строки матрицы (дефолт — всё включено). */
export interface PreferenceChannels {
  push: boolean;
  email: boolean;
}

const DEFAULT_CHANNELS: PreferenceChannels = { push: true, email: true };

/**
 * Матрица NotificationPreference (BL-23, CONTRACT_DIFF §2).
 *
 * Строка в БД существует только при отклонении от дефолта (DATA_MODEL_DELTA
 * §2): GET мёржит строки с дефолтами каталога — клиент никогда не мёржит сам.
 * Transactional-уведомления в БД не представлены вовсе; GET отдаёт для них
 * одну псевдо-строку `transactional` с locked=true (их нельзя отключить,
 * OQ-29: глобального тумблера нет — только per-key матрица + настройки ОС).
 *
 * Enforcement: диспатчер читает эту же матрицу через resolveForAccounts()
 * перед созданием informational-доставок (suppressed_preference).
 */
@Injectable()
export class NotificationPreferencesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Полная матрица аккаунта: transactional-строка + все ключи каталога. */
  async getMatrix(accountId: string): Promise<NotificationPreferencesDto> {
    const overrides = await this.resolveForAccounts([accountId]);
    const channels = (key: string): PreferenceChannels =>
      overrides.get(accountId)?.get(key) ?? DEFAULT_CHANNELS;

    return {
      preferences: [
        { key: TRANSACTIONAL_MATRIX_KEY, push: true, email: true, locked: true },
        ...PREFERENCE_KEY_VALUES.map((key) => ({
          key,
          push: channels(key).push,
          email: channels(key).email,
          locked: false,
        })),
      ],
    };
  }

  /**
   * Частичный upsert (PATCH). Валидация ключей/каналов — в DTO (неизвестный
   * ключ и transactional → 400 до сервиса). Изменения применяются атомарно;
   * ответ — обновлённая полная матрица.
   */
  async applyChanges(
    accountId: string,
    changes: PreferenceChangeDto[],
  ): Promise<NotificationPreferencesDto> {
    // Дубли одного (key, channel) в запросе: последний побеждает — схлопываем
    // per-key, чтобы не гонять лишние upsert'ы по одной строке.
    const byKey = new Map<string, Partial<PreferenceChannels>>();
    for (const change of changes) {
      const patch = byKey.get(change.key) ?? {};
      patch[change.channel] = change.enabled;
      byKey.set(change.key, patch);
    }

    await this.prisma.$transaction(async (tx) => {
      for (const [key, patch] of byKey) {
        await tx.notificationPreference.upsert({
          where: { accountId_key: { accountId, key } },
          create: {
            accountId,
            key,
            push: patch.push ?? DEFAULT_CHANNELS.push,
            email: patch.email ?? DEFAULT_CHANNELS.email,
          },
          update: patch,
        });
      }
    });

    return this.getMatrix(accountId);
  }

  /**
   * Пакетная выборка для enforcement в диспатчере: карта
   * accountId → (key → эффективные значения). Отсутствие строки = дефолт
   * (включено) — вызывающий использует `?? {push: true, email: true}`.
   */
  async resolveForAccounts(
    accountIds: string[],
    key?: string,
  ): Promise<Map<string, Map<string, PreferenceChannels>>> {
    if (accountIds.length === 0) {
      return new Map();
    }
    const rows = await this.prisma.notificationPreference.findMany({
      where: { accountId: { in: accountIds }, ...(key ? { key } : {}) },
      select: { accountId: true, key: true, push: true, email: true },
    });
    const result = new Map<string, Map<string, PreferenceChannels>>();
    for (const row of rows) {
      const perAccount = result.get(row.accountId) ?? new Map();
      perAccount.set(row.key, { push: row.push, email: row.email });
      result.set(row.accountId, perAccount);
    }
    return result;
  }
}
