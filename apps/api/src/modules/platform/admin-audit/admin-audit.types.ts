/**
 * Таксономия аудируемых действий платформенных операторов (S-12).
 *
 * Единый источник имён действий для журнала `AdminAuditLog`: старые действия
 * из архива/удаления + денежные/энтайтлмент-действия программы монетизации.
 * Строки в БД (колонка `action` — String), поэтому добавление действия —
 * правка ТОЛЬКО этого файла, без миграции.
 */

/** Унаследованные действия (super-admin.service.ts, до монетизации). */
export type LegacyAdminAuditAction =
  | 'USER_HARD_DELETE'
  | 'ORGANIZATION_HARD_DELETE'
  | 'ARCHIVE_USER'
  | 'RESTORE_USER'
  | 'ARCHIVE_ORGANIZATION'
  | 'RESTORE_ORGANIZATION'
  // Выгрузка персональных данных пользователей в XLSX (кто, когда, сколько строк)
  | 'USERS_EXPORT'
  // Маска доступа организации (тонкое управление правами; причина обязательна)
  | 'ACCESS_MASK_SET'
  | 'EVENT_STATUS_OVERRIDE'
  | 'ORGANIZATION_PROVISIONED'
  | 'PLATFORM_ELEVATION_REQUESTED'
  | 'PLATFORM_ELEVATION_APPROVED';

/**
 * Денежные и энтайтлмент-действия (монетизация). Каждое действие пишется
 * в той же транзакции, что и сама мутация; для действий с обязательной
 * причиной (`reason`) — комиссия, капы, приостановка — причина кладётся
 * в metadata.reason.
 */
export type MoneyAdminAuditAction =
  // Тарифы (S-2/S-3, решение §2.4 — PLAN_SWITCH с creditMode)
  | 'PLAN_ASSIGN'
  | 'PLAN_SWITCH'
  | 'PLAN_EXTEND'
  | 'PLAN_EXPIRE'
  | 'PLAN_CREDIT_ADJUST'
  // Платежи, записанные вручную (S-4; исправления только реверсом)
  | 'PAYMENT_RECORD'
  | 'PAYMENT_REVERSAL'
  // Оверрайды (S-5/S-6, OQ-7: причина обязательна)
  | 'COMMISSION_OVERRIDE_SET'
  | 'COMMISSION_OVERRIDE_REVOKE'
  | 'CAP_OVERRIDE_SET'
  | 'CAP_OVERRIDE_REVOKE'
  // Comp-гранты монет/минут/генераций (S-7)
  | 'COMP_GRANT'
  // Приостановка организации (S-8)
  | 'ORG_SUSPEND'
  | 'ORG_REACTIVATE'
  // Каталог и цены (S-16, D-15)
  | 'PRICE_SET'
  | 'SKU_SET'
  // Реклама (S-11)
  | 'AD_ORDER_STATUS'
  | 'FEATURED_GRANDFATHER'
  // Выплаты организаторам (M-7/S-18)
  | 'PAYOUT_RECORD'
  // Мастер-переключатель тарифной системы (S-19)
  | 'BILLING_SWITCH_TOGGLE'
  // Глобальный тумблер VIA-платежей (per-org пилот — через CAP_OVERRIDE_SET VIA_PAYMENTS)
  | 'VIA_SWITCH_TOGGLE';

export type AdminAuditAction = LegacyAdminAuditAction | MoneyAdminAuditAction;

/** Типы целей записи. PLATFORM — для платформенных настроек без конкретной цели. */
export type AdminAuditTargetType =
  | 'USER'
  | 'ORGANIZATION'
  | 'EVENT'
  | 'PLAN'
  | 'SKU'
  | 'ORDER'
  | 'PLATFORM';

/**
 * Снапшот «до/после» — только примитивы, только вайтлист полей.
 * PII (email, телефон, имена участников) в снапшоты не попадает —
 * идентификация цели идёт через targetId/targetLabel записи.
 */
export type AuditSnapshotValue = string | number | boolean | null;
export type AuditSnapshot = Record<string, AuditSnapshotValue>;
