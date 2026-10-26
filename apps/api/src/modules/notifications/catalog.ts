import {
  NOTIFICATION_CHANNELS,
  NotificationChannel,
  NotificationKind,
  NotificationPriority,
} from './dispatch/notification.types';

/**
 * Машинный каталог уведомлений (BL-16, инварианты №5/№6).
 *
 * ЕДИНСТВЕННЫЙ источник фактов «тип → категория/preferenceKey/каналы/deep
 * link/i18n-ключи» в коде. Диспатчер и сендеры читают отсюда; цепочки (Батч 6)
 * НЕ дублируют эти колонки при построении интентов. Человеческий первоисточник —
 * docs/notifications/NOTIFICATIONS_CATALOG.md §3–7; любое расхождение с ним —
 * баг этого файла.
 *
 * CI-инварианты держит `catalog.spec.ts`:
 *  - №5: каждый pushKey существует в словаре push.* для ru/uz/en;
 *  - №6: каждый route существует в таблице known routes мобилки
 *    (`apps/mobile/shared/notifications/known-routes.ts`), параметрическая
 *    нотация Expo Router, сравнение без нормализации.
 */

/** Ключи матрицы NotificationPreference (CONTRACT_DIFF §2, каталог §9). */
export const PREFERENCE_KEYS = {
  EVENT_REMINDERS: 'event_reminders',
  SAVED_EVENT_ALERTS: 'saved_event_alerts',
  REGISTRATION_STATUS: 'registration_status',
  SUMMARY: 'summary',
  ORGANIZER_REGISTRATIONS: 'organizer_registrations',
  ORGANIZER_BROADCAST: 'organizer_broadcast',
} as const;

export type PreferenceKey =
  (typeof PREFERENCE_KEYS)[keyof typeof PREFERENCE_KEYS];

/**
 * Класс важности пуша = Android-канал мобилки (BL-15,
 * `apps/mobile/shared/notifications/channels.ts`): transactional — HIGH,
 * reminders — HIGH+звук, updates — DEFAULT. Уходит в payload как
 * `data.channel` и в `channelId` Expo-сообщения.
 */
export type PushImportanceChannel = 'transactional' | 'reminders' | 'updates';

export interface NotificationCatalogEntry {
  /** ID строки NOTIFICATIONS_CATALOG.md ('REG-06'). */
  id: string;
  kind: NotificationKind;
  priority: NotificationPriority;
  /** undefined = transactional, отключить нельзя. */
  preferenceKey?: PreferenceKey;
  /** Каналы строки каталога (колонка «Каналы»). */
  channels: NotificationChannel[];
  /** push→email fallback per-account (легенда каталога §1, D-03б). */
  emailFallback?: boolean;
  /** Основной ключ словаря push.* (title+body ×3 локали). */
  pushKey?: string;
  /**
   * Вариантные ключи той же строки (REG-01: билет vs PENDING-заявка,
   * MOD-04: rejected vs changes_requested). Тоже проверяются CI-инвариантом №5.
   */
  altPushKeys?: readonly string[];
  /**
   * Email-шаблон реестра TEMPLATES. Шаблоны, помеченные каталогом «создать»
   * (BL-26, Батч 6), перечислены в PENDING_EMAIL_TEMPLATES.
   */
  emailTemplate?: string;
  /**
   * Deep link route'ы пуша в параметрической нотации Expo Router — ровно как
   * имена файлов `app/**` (первый — основной, остальные — вариантные:
   * SUM-01 ведёт на сертификат ИЛИ событие).
   */
  routes?: readonly string[];
  /** Android-канал/класс важности; по умолчанию — из kind (см. resolvePushImportance). */
  pushImportance?: PushImportanceChannel;
}

const { PUSH, EMAIL, IN_APP } = NOTIFICATION_CHANNELS;

/**
 * Email-шаблоны, обещанные каталогом, но ещё не созданные.
 * CI-тест каталога требует: emailTemplate существует в TEMPLATES ЛИБО
 * перечислен здесь; создание шаблона обязано удалить его отсюда.
 * Шаблоны BL-26 (event-reminder, event-summary-*, moderation-*) созданы —
 * список пуст.
 */
export const PENDING_EMAIL_TEMPLATES: readonly string[] = [];

export const NOTIFICATION_CATALOG: readonly NotificationCatalogEntry[] = [
  // ── Цепочка 1 — модерация (MOD-*) ──────────────────────────────────────────
  {
    id: 'MOD-01',
    kind: 'transactional',
    priority: 'normal',
    channels: [IN_APP, PUSH],
    pushKey: 'push.mod.submitted',
    routes: ['/org/event/[id]'],
  },
  {
    id: 'MOD-02',
    kind: 'transactional',
    priority: 'normal',
    channels: [EMAIL],
    emailTemplate: 'moderation-queue-new',
    // адресат — web-admin (OQ-31), мобильного deep link нет
  },
  {
    id: 'MOD-03',
    kind: 'informational',
    priority: 'normal',
    channels: [EMAIL],
    emailTemplate: 'moderation-sla-overdue',
  },
  {
    id: 'MOD-04',
    kind: 'transactional',
    priority: 'high',
    channels: [IN_APP, PUSH, EMAIL],
    pushKey: 'push.mod.rejected',
    altPushKeys: ['push.mod.changesRequested'],
    emailTemplate: 'event-rejected',
    routes: ['/org/event/[id]'],
  },
  {
    id: 'MOD-05',
    kind: 'transactional',
    priority: 'high',
    channels: [IN_APP, PUSH, EMAIL],
    pushKey: 'push.mod.published',
    emailTemplate: 'event-approved',
    routes: ['/org/event/[id]'],
  },
  {
    id: 'MOD-06',
    kind: 'transactional',
    priority: 'normal',
    channels: [EMAIL],
    emailTemplate: 'moderation-queue-resubmit',
  },
  // ── Цепочка 2 — регистрация, участник (REG-01..12) ─────────────────────────
  {
    id: 'REG-01',
    kind: 'transactional',
    priority: 'high',
    channels: [PUSH, EMAIL],
    pushKey: 'push.reg.created',
    altPushKeys: ['push.reg.pending'],
    emailTemplate: 'registration-created',
    routes: ['/ticket/[id]', '/event/[id]'],
  },
  {
    id: 'REG-02',
    kind: 'transactional',
    priority: 'high',
    channels: [PUSH],
    pushKey: 'push.reg.paymentPending',
    // до появления /checkout/[orderId] (OQ-05/BL-49) — страница события
    routes: ['/event/[id]'],
  },
  {
    id: 'REG-03',
    kind: 'transactional',
    priority: 'high',
    channels: [PUSH],
    pushKey: 'push.reg.paymentReminder',
    routes: ['/event/[id]'],
  },
  {
    id: 'REG-04',
    kind: 'transactional',
    priority: 'normal',
    channels: [PUSH],
    emailFallback: true,
    pushKey: 'push.reg.holdExpired',
    routes: ['/event/[id]'],
  },
  {
    id: 'REG-05',
    kind: 'transactional',
    priority: 'high',
    channels: [PUSH],
    pushKey: 'push.reg.paymentFailed',
    routes: ['/event/[id]'],
  },
  {
    id: 'REG-06',
    kind: 'transactional',
    priority: 'high',
    channels: [PUSH, IN_APP, EMAIL],
    pushKey: 'push.reg.approved',
    emailTemplate: 'registration-approved',
    routes: ['/ticket/[id]'],
  },
  {
    id: 'REG-07',
    kind: 'transactional',
    priority: 'high',
    // BL-24: оживший reject шлёт письмо ВСЕГДА (как approve), плюс строка
    // участнического инбокса — не только push→email fallback.
    channels: [PUSH, IN_APP, EMAIL],
    pushKey: 'push.reg.rejected',
    emailTemplate: 'registration-rejected',
    routes: ['/event/[id]'],
  },
  {
    id: 'REG-08',
    kind: 'transactional',
    priority: 'high',
    channels: [PUSH],
    pushKey: 'push.reg.ticketIssued',
    routes: ['/ticket/[id]'],
  },
  {
    id: 'REG-09',
    kind: 'informational',
    priority: 'normal',
    preferenceKey: PREFERENCE_KEYS.REGISTRATION_STATUS,
    channels: [PUSH],
    pushKey: 'push.reg.checkedIn',
    routes: ['/ticket/[id]'],
  },
  {
    id: 'REG-10',
    kind: 'transactional',
    priority: 'critical',
    channels: [PUSH, EMAIL],
    pushKey: 'push.reg.cancelled',
    emailTemplate: 'registration-cancelled',
    routes: ['/event/[id]'],
  },
  {
    id: 'REG-11',
    kind: 'transactional',
    priority: 'high',
    channels: [PUSH, EMAIL],
    pushKey: 'push.reg.revoked',
    emailTemplate: 'registration-revoked',
    routes: ['/event/[id]'],
  },
  {
    id: 'REG-12',
    kind: 'transactional',
    priority: 'high',
    channels: [PUSH],
    emailFallback: true,
    pushKey: 'push.reg.refunded',
    routes: ['/ticket/[id]'],
  },
  // ── Цепочка 2 — регистрация, организатор (REG-20..23) ──────────────────────
  {
    id: 'REG-20',
    kind: 'informational',
    priority: 'high',
    preferenceKey: PREFERENCE_KEYS.ORGANIZER_REGISTRATIONS,
    channels: [PUSH, IN_APP],
    pushKey: 'push.org.firstRegistration',
    routes: ['/org/attendees/[eventId]'],
  },
  {
    id: 'REG-21',
    kind: 'informational',
    priority: 'normal',
    preferenceKey: PREFERENCE_KEYS.ORGANIZER_REGISTRATIONS,
    channels: [PUSH, IN_APP],
    pushKey: 'push.org.capacity50',
    altPushKeys: ['push.org.capacity80', 'push.org.capacity100'],
    routes: ['/org/attendees/[eventId]'],
  },
  {
    id: 'REG-22',
    kind: 'informational',
    priority: 'normal',
    preferenceKey: PREFERENCE_KEYS.ORGANIZER_REGISTRATIONS,
    channels: [PUSH],
    pushKey: 'push.org.dailyDigest',
    // OQ-23: дайджест per-account по ВСЕМ событиям — единого eventId нет;
    // центр уведомлений workspace вместо экрана участников (маршрута /org
    // в known-routes мобилки нет — дашборд добавится следующим батчем).
    routes: ['/org/notifications'],
  },
  {
    id: 'REG-23',
    kind: 'informational',
    priority: 'normal',
    preferenceKey: PREFERENCE_KEYS.ORGANIZER_REGISTRATIONS,
    channels: [IN_APP, PUSH], // push — только при REFUNDED (решает цепочка)
    pushKey: 'push.org.refund',
    routes: ['/org/attendees/[eventId]'],
  },
  // ── Цепочка 3 — напоминания (REM-*) ────────────────────────────────────────
  {
    id: 'REM-01',
    kind: 'informational',
    priority: 'normal',
    preferenceKey: PREFERENCE_KEYS.EVENT_REMINDERS,
    channels: [PUSH],
    emailFallback: true, // email-fallback без push-токена (OQ-17)
    emailTemplate: 'event-reminder',
    pushKey: 'push.rem.event24h',
    routes: ['/ticket/[id]', '/map'], // /map — action-кнопка «Маршрут» (BL-33)
    pushImportance: 'reminders',
  },
  {
    id: 'REM-02',
    kind: 'informational',
    priority: 'normal',
    preferenceKey: PREFERENCE_KEYS.EVENT_REMINDERS,
    channels: [PUSH],
    pushKey: 'push.rem.org24h',
    routes: ['/org/event/[id]'],
    pushImportance: 'reminders',
  },
  {
    id: 'REM-03',
    kind: 'informational',
    priority: 'high',
    preferenceKey: PREFERENCE_KEYS.EVENT_REMINDERS,
    channels: [PUSH],
    pushKey: 'push.rem.online',
    routes: ['/event/[id]'],
    pushImportance: 'reminders',
  },
  // ── Цепочка 4 — закрытие регистрации (CLS-*) ───────────────────────────────
  {
    id: 'CLS-01',
    kind: 'informational',
    priority: 'normal',
    preferenceKey: PREFERENCE_KEYS.SAVED_EVENT_ALERTS,
    channels: [PUSH],
    pushKey: 'push.cls.closing24h',
    routes: ['/event/[id]'],
  },
  {
    id: 'CLS-02',
    kind: 'informational',
    priority: 'normal',
    preferenceKey: PREFERENCE_KEYS.SAVED_EVENT_ALERTS,
    channels: [PUSH],
    pushKey: 'push.cls.fewSeats',
    routes: ['/event/[id]'],
  },
  {
    id: 'CLS-03',
    kind: 'informational',
    priority: 'normal',
    preferenceKey: PREFERENCE_KEYS.ORGANIZER_REGISTRATIONS,
    channels: [PUSH, IN_APP],
    pushKey: 'push.cls.orgSummary',
    routes: ['/org/attendees/[eventId]'],
  },
  // CLS-04 слит в CLS-03 (BL-17е): отдельной строки нет.
  // ── Цепочка 5 — финальная сводка (SUM-*) ───────────────────────────────────
  {
    id: 'SUM-01',
    kind: 'informational',
    priority: 'normal',
    preferenceKey: PREFERENCE_KEYS.SUMMARY,
    channels: [PUSH],
    emailFallback: true,
    emailTemplate: 'event-summary-attendee',
    pushKey: 'push.sum.attendee',
    routes: ['/certificate/[id]', '/event/[id]'],
  },
  {
    id: 'SUM-02',
    kind: 'informational',
    priority: 'normal',
    preferenceKey: PREFERENCE_KEYS.SUMMARY,
    channels: [PUSH, EMAIL],
    emailTemplate: 'event-summary-organizer',
    pushKey: 'push.sum.org',
    routes: ['/org/analytics/[eventId]'],
  },
];

const CATALOG_BY_ID = new Map(
  NOTIFICATION_CATALOG.map((entry) => [entry.id, entry]),
);

export function getCatalogEntry(
  catalogId: string,
): NotificationCatalogEntry | undefined {
  return CATALOG_BY_ID.get(catalogId);
}

/** Все push-ключи записи (основной + вариантные) — для CI-инварианта №5. */
export function catalogPushKeys(entry: NotificationCatalogEntry): string[] {
  return [
    ...(entry.pushKey ? [entry.pushKey] : []),
    ...(entry.altPushKeys ?? []),
  ];
}

/**
 * Android-канал/класс важности пуша: явный `pushImportance` записи, иначе
 * transactional → 'transactional', informational → 'updates'.
 */
export function resolvePushImportance(
  entry: NotificationCatalogEntry,
): PushImportanceChannel {
  return (
    entry.pushImportance ??
    (entry.kind === 'transactional' ? 'transactional' : 'updates')
  );
}
