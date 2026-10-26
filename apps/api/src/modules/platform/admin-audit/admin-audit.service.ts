import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  AdminAuditAction,
  AdminAuditTargetType,
  AuditSnapshot,
  AuditSnapshotValue,
} from './admin-audit.types';

/**
 * Общий сервис аудита действий платформенных операторов (S-12).
 *
 * Обобщает прецедент super-admin.service.ts#writeAuditLog: неизменяемая,
 * FK-less запись в `AdminAuditLog`, создаваемая В ТОЙ ЖЕ транзакции, что и
 * сама мутация (передавайте `tx`). Снапшоты «до/после» — только вайтлист
 * примитивных полей, PII в metadata не допускается (инвариант №7).
 */
@Injectable()
export class AdminAuditService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Пишет запись аудита. Для атомарности с мутацией передавайте `tx`
   * (Prisma.TransactionClient); без него запись идёт отдельным запросом —
   * допустимо только для действий, не меняющих данные (например, тумблер
   * конфигурации, у которого мутация и есть эта запись).
   */
  async record(
    entry: {
      action: AdminAuditAction;
      actorId: string;
      actorEmail?: string | null;
      targetType: AdminAuditTargetType;
      /** Для PLATFORM-целей используйте фиксированный id '00000000-0000-0000-0000-000000000000'. */
      targetId: string;
      targetLabel?: string | null;
      /** Обязателен для действий с политикой mandatory-reason (оверрайды, приостановка). */
      reason?: string | null;
      before?: AuditSnapshot;
      after?: AuditSnapshot;
      /**
       * Прочий контекст; раскладывается на верхний уровень metadata
       * (legacy-совместимо, НЕ санитизируется — новые денежные записи должны
       * использовать before/after/reason, а не extra).
       */
      extra?: Record<string, Prisma.InputJsonValue | null>;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const db = tx ?? this.prisma;
    const metadata: Prisma.InputJsonValue = {
      ...(entry.extra ?? {}),
      ...(entry.reason !== undefined ? { reason: entry.reason } : {}),
      ...(entry.before ? { before: sanitizeSnapshot(entry.before) } : {}),
      ...(entry.after ? { after: sanitizeSnapshot(entry.after) } : {}),
    };
    await db.adminAuditLog.create({
      data: {
        action: entry.action,
        actorId: entry.actorId,
        actorEmail: entry.actorEmail ?? null,
        targetType: entry.targetType,
        targetId: entry.targetId,
        targetLabel: entry.targetLabel ?? null,
        metadata,
      },
    });
  }
}

/** Id-заглушка для платформенных целей (нет конкретной сущности). */
export const PLATFORM_TARGET_ID = '00000000-0000-0000-0000-000000000000';

/**
 * Ключи, которые никогда не попадают в снапшоты — страховка от случайного
 * прокидывания PII/секретов через before/after.
 */
const SNAPSHOT_DENYLIST = /(email|phone|password|token|secret|firstname|lastname|fullname|name$)/i;

/**
 * Вайтлист-санитайзер снапшота: оставляет только примитивные значения и
 * выбрасывает ключи из денайлиста. Объекты/массивы отбрасываются — снапшот
 * описывает скалярное состояние (тариф, bps, капы, статус), не документы.
 */
export function sanitizeSnapshot(snapshot: AuditSnapshot): AuditSnapshot {
  const clean: AuditSnapshot = {};
  for (const [key, value] of Object.entries(snapshot)) {
    if (SNAPSHOT_DENYLIST.test(key)) continue;
    if (
      value === null ||
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      clean[key] = value as AuditSnapshotValue;
    }
  }
  return clean;
}
