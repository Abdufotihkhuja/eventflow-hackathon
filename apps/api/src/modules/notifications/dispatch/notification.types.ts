import type { Prisma } from '@prisma/client';

/**
 * Типы ядра диспатчера уведомлений (Батч 2: BL-04/BL-10/BL-06/BL-03/BL-07/BL-22).
 *
 * Семантика dedupKey — NOTIFICATIONS_CATALOG §1: семантический ключ БЕЗ
 * получателя и канала; идемпотентность обеспечивает composite unique
 * (dedupKey, accountId, channel) на NotificationDelivery. Fan-out на N
 * получателей = N строк с одним dedupKey; push→email fallback = легальная
 * вторая строка с channel='email'.
 */

export const NOTIFICATION_CHANNELS = {
  PUSH: 'push',
  EMAIL: 'email',
  IN_APP: 'in_app',
} as const;

export type NotificationChannel =
  (typeof NOTIFICATION_CHANNELS)[keyof typeof NOTIFICATION_CHANNELS];

export type NotificationPriority = 'critical' | 'high' | 'normal';

/** transactional — нельзя отключить, мимо rate limit и quiet hours (кроме normal REM/SUM-сдвига, это дела Батча 6). */
export type NotificationKind = 'transactional' | 'informational';

/** Статусы NotificationDelivery (STATE_MACHINES §6 + sent_unconfirmed из BL-06). */
export const DELIVERY_STATUS = {
  SCHEDULED: 'scheduled',
  ENQUEUED: 'enqueued',
  SENT: 'sent',
  /** Reaper: providerRef есть, подтверждения нет — НЕ переотправлять (BL-06/OQ-24). */
  SENT_UNCONFIRMED: 'sent_unconfirmed',
  DELIVERED: 'delivered',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  SKIPPED: 'skipped',
  SUPPRESSED_RATE_LIMIT: 'suppressed_rate_limit',
  SUPPRESSED_PREFERENCE: 'suppressed_preference',
  SUPPRESSED_UNSUBSCRIBE: 'suppressed_unsubscribe',
} as const;

export type DeliveryStatus =
  (typeof DELIVERY_STATUS)[keyof typeof DELIVERY_STATUS];

/** Статусы ScheduledNotification (DATA_MODEL_DELTA §4). */
export const SCHEDULED_STATUS = {
  SCHEDULED: 'scheduled',
  DISPATCHED: 'dispatched',
  CANCELLED: 'cancelled',
  SKIPPED: 'skipped',
} as const;

/** Терминальный skip-reason для висячих ссылок (BL-07, D-08). */
export const SKIP_REASON_RECIPIENT_GONE = 'recipient_gone';

/** Tenant was archived/suspended after the job was scheduled (OQ-7). */
export const SKIP_REASON_ORGANIZATION_UNAVAILABLE = 'organization_unavailable';

export interface RecipientDevice {
  id: string;
  expoPushToken: string;
  platform: string;
  locale: string;
}

/**
 * Разрезолвленный получатель (BL-04).
 * accountId === null — легитимная ветка OQ-25: участник без Account
 * (не логинился после IAM-rework) — email-only, AccountNotification не пишем.
 */
export interface NotificationRecipient {
  accountId: string | null;
  email: string | null;
  /** DeviceToken.locale → Account.locale → 'ru' (DATA_MODEL_DELTA §6). */
  locale: string;
  /** Активные (disabledAt=null) токены аккаунта; пусто для email-only ветки. */
  devices: RecipientDevice[];
  /** Для персональных цепочек — регистрация-источник (диагностика/ключи). */
  registrationId?: string;
}

export interface IntentEmailContent {
  subject: string;
  template: string;
  context: Record<string, unknown>;
}

/**
 * Контент push-канала (BL-14/BL-05). Текст НЕ хранится: сендер собирает
 * title/body из словаря push.* в локали конкретного устройства (D-04) и
 * прогоняет через контент-контракт (push/push-content.ts).
 */
export interface IntentPushContent {
  /** Ключ словаря push.*; дефолт — pushKey записи каталога (BL-16). */
  key?: string;
  /** Подстановки шаблона; счётчики плюрализуются словарём (BL-11). */
  params?: Record<string, string | number>;
  /**
   * Deep link route в параметрической нотации Expo Router; дефолт — первый
   * route записи каталога. Вариантные строки (REG-01 билет/заявка, SUM-01
   * сертификат/событие) задают route явно.
   */
  route?: string;
  /** Значения плейсхолдеров route: {id: registrationId}. */
  routeParams?: Record<string, string>;
  /** Дополнительные data-поля (необязательные — усечение при >4KB, BL-05). */
  payload: Record<string, unknown>;
}

/** Участнический in-app (AccountNotification): type+payload, без готовых фраз. */
export interface IntentAccountInAppContent {
  type: string;
  entityType?: string;
  entityId?: string;
  payload?: Record<string, unknown>;
}

/** Организаторская in-app лента (существующая Notification). */
export interface IntentOrgInAppContent {
  organizationId: string;
  /** Значение Prisma-enum NotificationType (строкой, чтобы не тащить enum в интент). */
  type: string;
  memberId?: string | null;
  entityType?: string;
  entityId?: string;
  payload?: Record<string, unknown>;
}

/**
 * Интент — «что отправить». Всё канальное/цепочечное идёт через
 * NotificationDispatcherService (кросс-цепочный инвариант №2).
 */
export interface NotificationIntent {
  /** ID строки каталога ('REM-01', 'REG-06', …). */
  catalogId: string;
  /** Семантический dedupKey БЕЗ получателя и канала (легенда каталога §1). */
  dedupKey: string;
  /**
   * Политика (kind/priority/channels/preferenceKey/emailFallback) по умолчанию
   * читается из машинного каталога по catalogId (BL-16, единый источник);
   * явные значения интента побеждают (вариантные строки, тесты).
   */
  kind?: NotificationKind;
  priority?: NotificationPriority;
  /** Ключ матрицы NotificationPreference; enforcement — Батч 4 (BL-23). */
  preferenceKey?: string;
  /** Каналы, запрошенные для каждого получателя. */
  channels?: NotificationChannel[];
  /**
   * push→email fallback per-account (D-03б): email вместо push, ТОЛЬКО если у
   * аккаунта нет ни одного активного DeviceToken. Требует intent.email.
   */
  emailFallback?: boolean;
  /** Денормализованные ссылки для каскадной инвалидации (инвариант №3). */
  eventId?: string;
  registrationId?: string;
  orderId?: string;
  organizationId?: string;
  recipients: NotificationRecipient[];
  push?: IntentPushContent;
  email?: IntentEmailContent;
  inApp?: IntentAccountInAppContent;
  /** Одна организационная in-app строка (accountId=null, адрес — организация). */
  orgInApp?: IntentOrgInAppContent;
}

/** Снапшот в NotificationDelivery.payload — достаточно для ресенда reaper-ом. */
export interface DeliveryPayloadSnapshot {
  to?: string;
  locale?: string;
  mail?: IntentEmailContent;
  inApp?: IntentAccountInAppContent;
  orgInApp?: IntentOrgInAppContent;
  push?: IntentPushContent;
  /**
   * Снапшот email-fallback'а push-строки (D-03б): по нему сендер создаёт
   * legal-вторую delivery-строку channel='email' с тем же dedupKey, когда push
   * не доставлен ни на одно устройство аккаунта.
   */
  fallbackEmail?: { to: string; mail: IntentEmailContent };
  /** Результат send: per-device Expo ticket'ы (BL-14, сверка receipts). */
  pushTickets?: PushTicketSnapshot[];
  [key: string]: unknown;
}

/** Per-device результат Expo send в payload push-доставки. */
export interface PushTicketSnapshot {
  /** DeviceToken.id — для деактивации по receipt'у DeviceNotRegistered. */
  deviceId: string;
  ticketId?: string;
  error?: string;
}

export interface CreatedDelivery {
  id: string;
  dedupKey: string;
  catalogId: string;
  channel: NotificationChannel;
  accountId: string | null;
  organizationId: string | null;
  status: DeliveryStatus;
  payload: DeliveryPayloadSnapshot;
}

/**
 * Результат dispatchNow: строки созданы (в транзакции домена, если передан tx),
 * а канальные job'ы ставит ТОЛЬКО enqueue() — вызывающий обязан вызвать его
 * ПОСЛЕ commit (OQ-27/BL-06). Хелпер dispatch() делает оба шага для
 * не-транзакционных путей.
 */
export interface DispatchResult {
  /** Созданные строки (без дедупнутых P2002-ом). */
  created: CreatedDelivery[];
  /** Сколько строк уже существовало (P2002 → noop, лог notification.deduplicated). */
  deduplicated: number;
  /** Терминально подавленные на этапе создания (rate limit). */
  suppressed: number;
  /** Ставит канальные job'ы для созданных строк. Вызывать ПОСЛЕ commit. */
  enqueue: () => Promise<void>;
}

export interface ScheduleInput {
  catalogId: string;
  dedupKey: string;
  /** Желаемый UTC-момент; informational сдвигается из quiet hours (OQ-12). */
  runAt: Date;
  kind: NotificationKind;
  priority: NotificationPriority;
  preferenceKey?: string;
  eventId?: string;
  registrationId?: string;
  orderId?: string;
  accountId?: string;
  organizationId?: string;
  /** Контекст guard-проверки и построения текста в момент исполнения. */
  context?: Record<string, unknown>;
  /** IANA-таймзона quiet-hours математики; дефолт — Asia/Tashkent. */
  timezone?: string;
  /**
   * Политика при конфликте dedupKey: 'keep' (дефолт) — молча noop;
   * 'updateRunAt' — обновить runAt ещё-не-исполненной строки;
   * 'resurrect' — как updateRunAt, но воскрешает и cancelled-строку
   * (ручное переоткрытие регистрации/reconcile: dedupKey тот же, отмена
   * была каскадной, guard при исполнении всё равно перечитает домен).
   */
  onConflict?: 'keep' | 'updateRunAt' | 'resurrect';
}

export interface CancelByInput {
  eventId?: string;
  registrationId?: string;
  orderId?: string;
  accountId?: string;
  /**
   * Гранулярность по типу (BL-03/D-05): префиксы catalogId ('REM', 'CLS',
   * 'SUM') или полные ID ('REM-01'). Без types — все типы по ссылке.
   */
  types?: string[];
  reason: string;
  tx?: Prisma.TransactionClient;
}

/** Снапшот перечитанных доменных ссылок для guard'ов исполнения. */
export interface ScheduledRefs {
  event?: { id: string; status: string; startDate: Date; endDate: Date } | null;
  registration?: {
    id: string;
    status: string;
    eventId: string;
    userId: string;
  } | null;
  /** Только kind=TICKET_SALE (B-05): биллинговые заказы цепочка не видит. */
  order?: { id: string; status: string; kind: string } | null;
  account?: { id: string } | null;
  organization?: { id: string } | null;
}

export interface ScheduledRowLike {
  id: string;
  catalogId: string;
  dedupKey: string;
  runAt: Date;
  eventId: string | null;
  registrationId: string | null;
  orderId: string | null;
  accountId: string | null;
  organizationId: string | null;
  context: Record<string, unknown> | null;
}

export type MaterializeResult =
  | { action: 'dispatch'; intent: NotificationIntent }
  /**
   * Fan-out с per-получательными dedupKey (SUM-01: у получателей без Account
   * общий ключ упёрся бы в партиальный unique (dedup_key, channel) — ключи
   * обязаны быть per-registration, значит интентов несколько).
   */
  | { action: 'dispatchMany'; intents: NotificationIntent[] }
  | { action: 'skip'; reason: string };

/**
 * Материализатор плановой строки: перечитывает актуальное состояние домена
 * (guard) и строит интент. Регистрируются цепочками (Батч 6) по префиксу
 * catalogId; для незарегистрированного типа тик терминально скипает строку.
 */
export type ScheduledMaterializer = (
  row: ScheduledRowLike,
  refs: ScheduledRefs,
) => Promise<MaterializeResult>;

/** Префикс каталога: 'REM-01' → 'REM'. */
export function catalogPrefix(catalogId: string): string {
  const dash = catalogId.indexOf('-');
  return dash === -1 ? catalogId : catalogId.slice(0, dash);
}
