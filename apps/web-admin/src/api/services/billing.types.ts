/**
 * Типы операторского биллинга (S-2/S-3/S-4/S-19).
 *
 * Зеркалят DTO бэкенда (apps/api/src/modules/billing/admin/admin-billing.dto.ts
 * + dto/billing-status.dto.ts + dto/entitlements.dto.ts + dto/billing-request.dto.ts)
 * как строковые юнионы: сгенерированные контрактами TS-enum'ы неудобны в UI
 * (сравнение с литералами — ошибка типов), поэтому кастуем на границе SDK —
 * тот же приём, что и blogCategories/hard-delete в sdk-admin.
 *
 * Деньги — ВСЕГДА строки минорных единиц (тийины, D-3). Никогда не парсить
 * в number для арифметики; форматирование — shared/lib/money.ts (BigInt).
 */

export type PlanKey = 'START' | 'PRO' | 'EXCLUSIVE'
export type BillingSource = 'PURCHASE' | 'DEFAULT'
export type PlanPurchaseStatus =
  | 'PENDING_PAYMENT'
  | 'ACTIVE'
  | 'EXHAUSTED'
  | 'EXPIRED'
  | 'SUPERSEDED'
export type OrderKind = 'PLAN' | 'COIN_PACK' | 'ADVERTISING' | 'TICKET_SALE'
export type OrderStatus =
  | 'REQUESTED'
  | 'PENDING_PAYMENT'
  | 'PAID'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'REFUNDED'
export type BillingCurrency = 'UZS' | 'USD' | 'EUR' | 'RUB'
export type PaymentProvider = 'MANUAL' | 'PAYME' | 'CLICK' | 'STRIPE'
export type PaymentTxStatus = 'CREATED' | 'CONFIRMED' | 'FAILED' | 'REVERSED'
export type EntitlementKey =
  | 'COMMISSION_BPS'
  | 'STAFF_SEATS'
  | 'MAX_PARTICIPANTS_PER_EVENT'
  | 'GENERATION_CREDITS'
  | 'AI_MINUTES_MONTHLY'
  | 'TASK_BOARD_ENABLED'
  | 'STATS_TIER'
  | 'QR_MODE'
  | 'EVENT_CREDITS'
  | 'MAX_EVENTS'
  | 'VIA_PAYMENTS'
export type GenerationWindow = 'CALENDAR_MONTH' | 'PACK_PERIOD'
export type StatsTier = 'BASIC' | 'FORECASTING' | 'FORECASTING_SLA'
export type QrCheckInMode = 'ARRIVAL_ONLY' | 'EXTENDED'
/** Судьба остатка кредитов при смене тарифа (§2.4 — выбор ОБЯЗАТЕЛЕН). */
export type CreditMode = 'RESET' | 'CARRY_OVER'
export type RevenueType = 'PLAN_FEE' | 'COIN_PACK' | 'ADVERTISING'

/** Счётчик окна потребления (E-14). AI-метрика приходит в СЕКУНДАХ (CR-26). */
export interface UsageMeter {
  limit: number | null
  used: number
  periodKey: string | null
}

export interface EventCredits {
  granted: number
  remaining: number
}

/** Живой пакет организации (снапшот-значения на момент покупки). */
export interface ActivePlanPurchase {
  id: string
  planKey: PlanKey
  status: PlanPurchaseStatus
  activatedAt: string | null
  expiresAt: string | null
  eventCreditsGranted: number
  eventCreditsRemaining: number
  commissionBpsSnapshot: number
  aiMinutesMonthly: number
  generationCredits: number
  generationWindow: GenerationWindow
  staffSeats: number
  maxParticipantsPerEvent: number | null
  taskBoardEnabled: boolean
  statsTier: StatsTier
  qrMode: QrCheckInMode
}

export interface OrgBillingStatus {
  tierKey: PlanKey
  source: BillingSource
  activePurchase: ActivePlanPurchase | null
}

/** Эффективные энтайтлменты (E-14): display-only, энфорсмент серверный. */
export interface OrgEntitlements {
  tierKey: PlanKey
  source: BillingSource
  enforcementEnabled: boolean
  suspended: boolean
  commissionBps: number
  staffSeats: number | null
  maxParticipantsPerEvent: number | null
  /** Override-лимит на число событий; null = безлимит. */
  maxEvents: number | null
  taskBoardEnabled: boolean
  statsTier: StatsTier
  qrMode: QrCheckInMode
  generationWindow: GenerationWindow
  eventCredits: EventCredits | null
  generations: UsageMeter
  /** AI-минуты в СЕКУНДАХ — фронт делит на 60 для отображения. */
  aiSeconds: UsageMeter
  overridesApplied: EntitlementKey[]
}

export interface BillingOverride {
  key: EntitlementKey
  valueInt: number | null
  valueBool: boolean | null
  valueString: string | null
  reason: string
  expiresAt: string | null
}

/**
 * POST /super-admin/billing/organizations/:orgId/overrides (S-5/S-6).
 * Ровно одно value*-поле по типу ключа: числовые → valueInt, флаги →
 * valueBool, енумы → valueString. Причина обязательна (OQ-7).
 */
export interface SetOverrideRequest {
  key: EntitlementKey
  valueInt?: number
  valueBool?: boolean
  valueString?: string
  reason: string
  expiresAt?: string
}

export interface RevokeOverrideRequest {
  reason: string
}

/** POST /super-admin/billing/organizations/:orgId/suspend (S-8/E-17). */
export interface SuspendOrgRequest {
  reason: string
}

/** POST /super-admin/billing/organizations/:orgId/comp (S-7). AI — в СЕКУНДАХ. */
export interface CompGrantRequest {
  metric: CoinMetric
  quantity: number
  reason: string
}

export interface BillingOrder {
  id: string
  kind: OrderKind
  status: OrderStatus
  /** Сумма в минорных единицах строкой (D-3). */
  amountMinor: string
  currency: BillingCurrency
  createdAt: string
}

/** GET /super-admin/billing/organizations/:orgId */
export interface AdminOrgBilling {
  status: OrgBillingStatus
  entitlements: OrgEntitlements
  overrides: BillingOverride[]
  orders: BillingOrder[]
}

export interface PaymentTransaction {
  id: string
  orderId: string
  provider: PaymentProvider
  providerTxnId: string
  status: PaymentTxStatus
  amountMinor: string
  currency: BillingCurrency
  createdAt: string
}

export interface ActivatePlanRequest {
  planKey: PlanKey
  /** ОБЯЗАТЕЛЕН при смене тарифа с живым пакетом (§2.4). */
  creditMode?: CreditMode
  /** Заказ-основание (заявка M-13 или ручная продажа). */
  orderId?: string
}

export interface ExtendPlanRequest {
  days: number
  reason?: string
}

export interface ExpirePlanRequest {
  reason: string
}

export interface AdjustCreditsRequest {
  delta: number
  reason: string
}

export interface RecordPaymentRequest {
  orderId?: string
  /** Сумма в тийинах строкой (D-3). */
  amountMinor: string
  currency?: BillingCurrency
  /** Внешний референс — ОБЯЗАТЕЛЕН (D-5). */
  externalRef: string
  revenueType: RevenueType
}

export interface ReversePaymentRequest {
  reason: string
}

/** POST /super-admin/billing/enforcement (S-19). */
export interface SetEnforcementResult {
  enabled: boolean
  enabledAt: string | null
  grandfathersStamped: number
}

/** M-7/S-18: строка сводки «к выплате». */
export interface PayoutOwedRow {
  organizationId: string
  grossMinor: string
  commissionMinor: string
  paidOutMinor: string
  owedMinor: string
}

export interface RecordPayoutRequest {
  amountMinor: string
  externalRef: string
}

export interface PayoutRecord {
  id: string
  amountMinor: string
  currency: string
  status: 'PENDING' | 'PAID'
  externalRef: string | null
  createdAt: string
}

/** S-19: состояние мастер-переключателя. */
export interface EnforcementState {
  enabled: boolean
  enabledAt: string | null
}

/** VIA: состояние глобального тумблера провайдера + пилотные организации. */
export interface ViaState {
  enabled: boolean
  enabledAt: string | null
  /** Число организаций с активным оверрайдом VIA_PAYMENTS=true. */
  pilotOrgCount: number
}

/** POST /super-admin/billing/via. */
export interface SetViaResult {
  enabled: boolean
  enabledAt: string | null
}

/** S-9: живой пакет с истечением ≤14 дней (сигнал к продлению). */
export interface ExpiringPack {
  organizationId: string
  planKey: PlanKey
  expiresAt: string | null
  eventCreditsRemaining: number
}

/** GET /super-admin/billing/overview (S-9): обзор монетизации платформы. */
export interface MonetizationOverview {
  enforcement: EnforcementState
  totalOrganizations: number
  suspendedOrganizations: number
  /** START = организации без живого платного пакета (тариф по умолчанию). */
  planDistribution: Record<PlanKey, number>
  pendingRequests: number
  expiringSoon: ExpiringPack[]
}

/**
 * Полный тип строки выручки (D-16/M-15). Шире, чем `RevenueType` выше:
 * тот — подмножество, разрешённое при ручной записи платежа (S-4).
 */
export type RevenueEntryType =
  | 'PLAN_FEE'
  | 'COMMISSION'
  | 'COIN_PACK'
  | 'ADVERTISING'
  | 'REFUND'
  | 'ADJUSTMENT'

/** Канал поступления (managed-фаза = только MANUAL; провайдеры — по мере запуска). */
export type RevenueChannel = 'MANUAL' | 'PAYME' | 'CLICK' | 'STRIPE'

export interface RevenueTypeRow {
  type: RevenueEntryType
  /** Сумма в тийинах строкой (D-3); REFUND/ADJUSTMENT могут быть отрицательными. */
  amountMinor: string
  entries: number
}

export interface RevenueChannelRow {
  channel: RevenueChannel
  amountMinor: string
  entries: number
}

/** GET /super-admin/billing/revenue/summary (S-10). Суммы — тийины строками. */
export interface RevenueSummary {
  from: string
  to: string
  totalMinor: string
  entries: number
  byType: RevenueTypeRow[]
  byChannel: RevenueChannelRow[]
}

/** Период сводки: без границ бэкенд берёт последние 30 дней. */
export interface RevenuePeriodQuery {
  from?: string
  to?: string
}

/**
 * Действия аудит-ленты (S-12/S-13): денежные/энтайтлмент-действия монетизации
 * + унаследованные архив/удаление. Зеркалит AdminAuditAction бэкенда
 * (apps/api/src/modules/platform/admin-audit/admin-audit.types.ts).
 */
export type BillingAuditAction =
  | 'PLAN_ASSIGN'
  | 'PLAN_SWITCH'
  | 'PLAN_EXTEND'
  | 'PLAN_EXPIRE'
  | 'PLAN_CREDIT_ADJUST'
  | 'PAYMENT_RECORD'
  | 'PAYMENT_REVERSAL'
  | 'COMMISSION_OVERRIDE_SET'
  | 'COMMISSION_OVERRIDE_REVOKE'
  | 'CAP_OVERRIDE_SET'
  | 'CAP_OVERRIDE_REVOKE'
  | 'COMP_GRANT'
  | 'ORG_SUSPEND'
  | 'ORG_REACTIVATE'
  | 'PRICE_SET'
  | 'SKU_SET'
  | 'AD_ORDER_STATUS'
  | 'FEATURED_GRANDFATHER'
  | 'PAYOUT_RECORD'
  | 'BILLING_SWITCH_TOGGLE'
  // унаследованные действия до монетизации
  | 'ARCHIVE_USER'
  | 'RESTORE_USER'
  | 'ARCHIVE_ORGANIZATION'
  | 'RESTORE_ORGANIZATION'
  | 'USER_HARD_DELETE'
  | 'ORGANIZATION_HARD_DELETE'

/** Запись AdminAuditLog. metadata — PII-safe by construction (вайтлист S-12). */
export interface BillingAuditEntry {
  id: string
  action: string
  actorId: string
  actorEmail: string | null
  targetType: string
  targetId: string
  targetLabel: string | null
  metadata: Record<string, unknown>
  createdAt: string
}

export interface BillingAuditQuery {
  action?: string
  targetId?: string
  page?: number
  limit?: number
}

/** GET /super-admin/billing/audit (S-13): страница ленты. */
export interface BillingAuditPage {
  data: BillingAuditEntry[]
  total: number
  page: number
  limit: number
}

export type AddonSkuKind = 'COIN_PACK' | 'AD_PRODUCT'
export type CoinMetric = 'AI_SECONDS' | 'GENERATION_UNITS'
export type AdBillingUnit = 'PER_WEEK' | 'PER_CAMPAIGN' | 'PER_MESSAGE'

/** Строка каталога тарифов (PlanDto, M-1). Цены — тийины строками или null. */
export interface CatalogPlan {
  key: PlanKey
  priceAmountMinor: string | null
  usdAnchorCents: number | null
  isPurchasable: boolean
  isActive: boolean
  eventCredits: number
  validityDays: number | null
  commissionBps: number
  aiMinutesMonthly: number
  generationCredits: number
  generationWindow: GenerationWindow
  staffSeats: number
  maxParticipantsPerEvent: number | null
  taskBoardEnabled: boolean
  statsTier: StatsTier
  qrMode: QrCheckInMode
  sortOrder: number
}

/** Строка каталога add-on SKU (AddonSkuDto, M-1). */
export interface CatalogAddonSku {
  code: string
  kind: AddonSkuKind
  priceAmountMinor: string | null
  usdAnchorCents: number | null
  isActive: boolean
  coinMetric: CoinMetric | null
  coinQuantity: number | null
  adBillingUnit: AdBillingUnit | null
  sortOrder: number
}

/** GET /billing/plans (кабинетная выборка): ВЕСЬ каталог с флагами. */
export interface BillingCatalog {
  plans: CatalogPlan[]
  addons: CatalogAddonSku[]
}

/**
 * POST /super-admin/billing/plans/:key/pricing и /addon-skus/:code/pricing
 * (S-16). Отправляются только изменённые поля; isPurchasable сервер учитывает
 * только для тарифов. Правки НЕ трогают уже проданные пакеты (снапшоты, CR-1).
 */
export interface UpdatePricingRequest {
  /** Цена в тийинах строкой (D-3). */
  priceAmountMinor?: string
  /** Информационный $-якорь в центах США (не продажная цена). */
  usdAnchorCents?: number
  isActive?: boolean
  isPurchasable?: boolean
}
