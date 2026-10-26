import { ConflictException, ForbiddenException } from '@nestjs/common';
import { CoinMetric, EntitlementKey, PlanKey } from '@prisma/client';

/**
 * Машиночитаемый контракт ошибок лимитов (E-13, CR-13).
 *
 * Конвенция статусов: ГЕЙТЫ (фича недоступна тарифу) и приостановка — 403;
 * КАПЫ/КВОТЫ (лимит числом, упёрлись) — 409. Вся структура — ТОЛЬКО в
 * `details` + машинный `code` на верхнем уровне ответа: AllExceptionsFilter
 * пробрасывает `code`/`details` как есть (прецедент 409 self-check-in),
 * фронтенды (C-11 mapQuotaError) ветвятся ИСКЛЮЧИТЕЛЬНО по code.
 *
 * Матрица graceful-degrade (решения OQ-6/B-3):
 *  - users/event, staff seats, event credits → ЖЁСТКИЙ БЛОК + апгрейд-подсказка
 *    (details.upgrade=true → кабинет ведёт на /settings/billing?tab=plans);
 *  - generation/AI-квота → блок с остатком и окном; после E-12 сначала
 *    дренируются монеты, ошибка летит только когда пусто и там;
 *  - Task Board / stats / QR-режимы → 403 гейт, честный locked-UI (C-10);
 *  - приостановка → 403 ORG_SUSPENDED на всех гейт-путях записи (E-17).
 */
export const BILLING_ERROR_CODES = {
  QUOTA_EXCEEDED: 'BILLING_QUOTA_EXCEEDED',
  CAP_EXCEEDED: 'BILLING_CAP_EXCEEDED',
  EVENT_CREDITS_EXHAUSTED: 'BILLING_EVENT_CREDITS_EXHAUSTED',
  FEATURE_GATED: 'BILLING_FEATURE_GATED',
  ORG_SUSPENDED: 'ORG_SUSPENDED',
} as const;

export type BillingErrorCode =
  (typeof BILLING_ERROR_CODES)[keyof typeof BILLING_ERROR_CODES];

/** 409: исчерпана расходуемая квота окна (генерации, AI-секунды). */
export class QuotaExceededException extends ConflictException {
  constructor(details: {
    metric: CoinMetric;
    limit: number;
    used: number;
    requested: number;
    periodKey: string;
    tierKey: PlanKey;
    /** true — апгрейд/докупка монет решает проблему (deep-link в кабинете). */
    upgrade: boolean;
  }) {
    super({
      message: 'Квота тарифа исчерпана',
      code: BILLING_ERROR_CODES.QUOTA_EXCEEDED,
      details,
    });
  }
}

/** Сообщение капа по ключу (RU-фолбэк; клиент рендерит по code+cap). */
const CAP_MESSAGES: Record<
  'MAX_PARTICIPANTS_PER_EVENT' | 'STAFF_SEATS' | 'MAX_EVENTS',
  string
> = {
  STAFF_SEATS: 'Достигнут лимит сотрудников тарифа',
  MAX_PARTICIPANTS_PER_EVENT: 'Достигнут лимит участников тарифа',
  MAX_EVENTS: 'Достигнут лимит событий организации',
};

/**
 * 409: упёрлись в числовой кап (участники события, места сотрудников,
 * общее число событий). MAX_EVENTS — per-org оверрайд (тарифного дефолта нет).
 */
export class CapExceededException extends ConflictException {
  constructor(details: {
    cap: Extract<
      EntitlementKey,
      'MAX_PARTICIPANTS_PER_EVENT' | 'STAFF_SEATS' | 'MAX_EVENTS'
    >;
    limit: number;
    current: number;
    tierKey: PlanKey;
    upgrade: boolean;
  }) {
    super({
      message: CAP_MESSAGES[details.cap],
      code: BILLING_ERROR_CODES.CAP_EXCEEDED,
      details,
    });
  }
}

/** 409: кредиты событий пакета исчерпаны (E-16). */
export class EventCreditsExhaustedException extends ConflictException {
  constructor(details: {
    granted: number;
    remaining: number;
    tierKey: PlanKey;
    expiresAt: string | null;
    upgrade: boolean;
  }) {
    super({
      message: 'Кредиты на публикацию событий исчерпаны',
      code: BILLING_ERROR_CODES.EVENT_CREDITS_EXHAUSTED,
      details,
    });
  }
}

/** 403: фича не входит в тариф (Task Board, тир статистики, QR-режим). */
export class FeatureGatedException extends ForbiddenException {
  constructor(details: {
    feature: Extract<
      EntitlementKey,
      'TASK_BOARD_ENABLED' | 'STATS_TIER' | 'QR_MODE'
    >;
    tierKey: PlanKey;
    upgrade: boolean;
  }) {
    super({
      message: 'Функция недоступна на текущем тарифе',
      code: BILLING_ERROR_CODES.FEATURE_GATED,
      details,
    });
  }
}

/** 403: организация приостановлена оператором (E-17/S-8). */
export class OrgSuspendedException extends ForbiddenException {
  constructor(details: { suspendedAt: string }) {
    super({
      message: 'Организация приостановлена. Обратитесь в support@eventflow.uz',
      code: BILLING_ERROR_CODES.ORG_SUSPENDED,
      details,
    });
  }
}
