/**
 * Общая перехватка биллинг-ошибок (C-11): типизация E-13 контракта.
 *
 * Сервер (AllExceptionsFilter) кладёт машинный `code` на верхний уровень тела
 * ответа, а структуру — в `details`; наш ApiError хранит ВСЁ тело ответа в
 * `error.details`. Фронтенд ветвится ИСКЛЮЧИТЕЛЬНО по code (CR-13) — копию
 * message можно менять, роутинг не сломается.
 *
 * Матрица: гейты (фича не входит в тариф) и приостановка — 403;
 * капы/квоты (числовой лимит, упёрлись) — 409. `upgrade: true` → deep-link
 * на /settings/billing?tab=plans (C-15a).
 */

import type { ApiError } from '@api/types'

/** Deep-link контракт at-limit подсказок (C-15a). */
export const BILLING_UPGRADE_PATH = '/settings/billing?tab=plans'

export type BillingQuotaMetric = 'AI_SECONDS' | 'GENERATION_UNITS'
export type BillingCap = 'STAFF_SEATS' | 'MAX_PARTICIPANTS_PER_EVENT'
export type BillingGatedFeature = 'TASK_BOARD_ENABLED' | 'STATS_TIER' | 'QR_MODE'

export type BillingLimitError =
  | {
      code: 'BILLING_QUOTA_EXCEEDED'
      metric: BillingQuotaMetric
      limit: number
      used: number
      requested: number
      periodKey: string | null
      tierKey: string
      upgrade: boolean
    }
  | {
      code: 'BILLING_CAP_EXCEEDED'
      cap: BillingCap
      limit: number
      current: number
      tierKey: string
      upgrade: boolean
    }
  | {
      code: 'BILLING_EVENT_CREDITS_EXHAUSTED'
      granted: number
      remaining: number
      tierKey: string
      expiresAt: string | null
      upgrade: boolean
    }
  | {
      code: 'BILLING_FEATURE_GATED'
      feature: BillingGatedFeature
      tierKey: string
      upgrade: boolean
    }
  | { code: 'ORG_SUSPENDED'; suspendedAt: string | null }

type ErrorBody = { code?: unknown; details?: Record<string, unknown> }

function num(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function str(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

/**
 * Типизирует ошибку лимитов из ApiError. Возвращает null для всего, что не
 * является биллинг-ошибкой E-13 — вызывающий код падает в свой обычный путь.
 */
export function mapBillingError(error: unknown): BillingLimitError | null {
  const body = (error as ApiError | null | undefined)?.details as ErrorBody | null | undefined
  const code = body && typeof body.code === 'string' ? body.code : null
  if (!code) return null
  const details = body?.details ?? {}

  switch (code) {
    case 'BILLING_QUOTA_EXCEEDED':
      return {
        code,
        metric: (str(details.metric) as BillingQuotaMetric | null) ?? 'GENERATION_UNITS',
        limit: num(details.limit),
        used: num(details.used),
        requested: num(details.requested, 1),
        periodKey: str(details.periodKey),
        tierKey: str(details.tierKey) ?? 'START',
        upgrade: details.upgrade === true,
      }
    case 'BILLING_CAP_EXCEEDED':
      return {
        code,
        cap: (str(details.cap) as BillingCap | null) ?? 'STAFF_SEATS',
        limit: num(details.limit),
        current: num(details.current),
        tierKey: str(details.tierKey) ?? 'START',
        upgrade: details.upgrade === true,
      }
    case 'BILLING_EVENT_CREDITS_EXHAUSTED':
      return {
        code,
        granted: num(details.granted),
        remaining: num(details.remaining),
        tierKey: str(details.tierKey) ?? 'START',
        expiresAt: str(details.expiresAt),
        upgrade: details.upgrade === true,
      }
    case 'BILLING_FEATURE_GATED':
      return {
        code,
        feature: (str(details.feature) as BillingGatedFeature | null) ?? 'TASK_BOARD_ENABLED',
        tierKey: str(details.tierKey) ?? 'START',
        upgrade: details.upgrade === true,
      }
    case 'ORG_SUSPENDED':
      return { code, suspendedAt: str(details.suspendedAt) }
    default:
      return null
  }
}

/**
 * Blob-ответы (скачивания с responseType:'blob'): при HTTP-ошибке axios кладёт
 * в `details` Blob с JSON-телом. Разворачиваем его в обычный ApiError, чтобы
 * mapBillingError работал и на путях скачивания (бейджи, экспорты).
 */
export async function normalizeBlobApiError(error: unknown): Promise<unknown> {
  const apiError = error as ApiError | null | undefined
  if (!apiError || typeof Blob === 'undefined' || !(apiError.details instanceof Blob)) {
    return error
  }
  try {
    const text = await apiError.details.text()
    const parsed = JSON.parse(text) as Record<string, unknown>
    return {
      ...apiError,
      message: typeof parsed.message === 'string' ? parsed.message : apiError.message,
      details: parsed,
    } satisfies ApiError
  } catch {
    return error
  }
}
