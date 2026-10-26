/**
 * Кабинетный биллинг (C-1): тонкая обёртка над workspaceSdk.billing.
 *
 * Все типы ВЫВОДЯТСЯ из SDK (который типизирован контрактами OpenAPI), поэтому
 * у кабинета нет собственной копии биллинг-моделей — дрейфа быть не может.
 * Деньги приходят строками в минорных единицах (D-3): тийины UZS / центы USD.
 */

import { workspaceSdk } from '../sdk'

export const billingService = {
  /** Полный каталог тарифов и SKU (включая неактивные строки). */
  getPlans: () => workspaceSdk.billing.getPlans(),
  /** Статус тарифа: живой пакет со снапшот-значениями (M-3). */
  getStatus: () => workspaceSdk.billing.getStatus(),
  /** Эффективные энтайтлменты + счётчики окон (E-14, display-only). */
  getEntitlements: () => workspaceSdk.billing.getEntitlements(),
  /** Заявка managed-фазы: тариф / монеты / реклама (M-13, billing:manage). */
  createRequest: (body: CreateBillingRequestInput) => workspaceSdk.billing.createRequest(body),
  /** История биллинг-заказов организации (C-5/C-8). */
  listRequests: () => workspaceSdk.billing.listRequests(),
  /** Кошелёк монет: балансы + последние проводки леджера (C-6). */
  getWallet: (): Promise<BillingWallet> => workspaceSdk.billing.getWallet(),
} as const

// ================================
// Кошелёк монет (C-6)
// ================================

/**
 * ИСКЛЮЧЕНИЕ из правила «все типы выводятся из SDK»: у GET /billing/wallet в
 * закоммиченном OpenAPI пока нет схемы ответа (регенерация контрактов
 * отложена — нужна инфраструктура), поэтому SDK-тип этого эндпоинта пуст.
 * Типы ниже — ручное зеркало пейлоада контроллера; держать 1:1 с
 * apps/api/src/modules/billing/workspace-billing.controller.ts#getWallet и
 * удалить при регенерации контрактов.
 */

/** Метрика монет (CR-26: AI хранится в секундах — в UI делить на 60). */
export type BillingCoinMetric = 'AI_SECONDS' | 'GENERATION_UNITS'

/** Вид проводки append-only леджера (D-8). */
export type BillingCoinLedgerKind = 'PURCHASE' | 'COMP_GRANT' | 'CONSUMPTION' | 'REVERSAL'

export interface BillingWalletEntry {
  id: string
  metric: BillingCoinMetric
  /** Знаковое изменение баланса в единицах метрики (AI — секунды). */
  delta: number
  /** Баланс метрики ПОСЛЕ проводки (инвариант леджера, CR-14). */
  balanceAfter: number
  kind: BillingCoinLedgerKind
  reason: string | null
  createdAt: string
}

export interface BillingWallet {
  balances: {
    /** Остаток AI-монет в секундах. */
    aiSeconds: number
    /** Остаток монет генераций (штуки). */
    generationUnits: number
  }
  /** Последние проводки, новые сверху (сервер отдаёт до 50). */
  entries: BillingWalletEntry[]
}

type WorkspaceBillingSdk = typeof workspaceSdk.billing

export type BillingCatalog = Awaited<ReturnType<WorkspaceBillingSdk['getPlans']>>
export type BillingPlan = BillingCatalog['plans'][number]
export type BillingAddonSku = BillingCatalog['addons'][number]

export type BillingStatus = Awaited<ReturnType<WorkspaceBillingSdk['getStatus']>>
export type ActivePlanPurchase = NonNullable<BillingStatus['activePurchase']>

export type BillingEntitlements = Awaited<ReturnType<WorkspaceBillingSdk['getEntitlements']>>
export type BillingUsageMeter = BillingEntitlements['generations']
export type BillingEventCredits = NonNullable<BillingEntitlements['eventCredits']>

export type CreateBillingRequestInput = Parameters<WorkspaceBillingSdk['createRequest']>[0]
export type BillingOrder = Awaited<ReturnType<WorkspaceBillingSdk['listRequests']>>[number]

export type BillingPlanKey = BillingPlan['key']
export type BillingOrderKind = BillingOrder['kind']
export type BillingOrderStatus = BillingOrder['status']
