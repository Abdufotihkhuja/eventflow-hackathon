/**
 * Машинная таблица маршрутов, которые может нести push (BL-15).
 *
 * Источник — колонка «Deep link route» каталога уведомлений
 * (docs/notifications/NOTIFICATIONS_CATALOG.md, MOBILE_IMPACT §7). Нотация —
 * параметрическая, ровно как имена файлов `app/**` в Expo Router:
 * `/org/attendees/[eventId]` ⇔ `app/org/attendees/[eventId].tsx`.
 *
 * Тест `__tests__/push-routes.test.ts` сверяет каждую строку с фактическими
 * файлами `app/**` — маршрут, которого нет на диске, роняет CI, а не участника
 * в белый экран.
 */

/** Какому шеллу принадлежит экран: участник или организаторский workspace. */
export type PushShell = "participant" | "org";

export interface KnownPushRoute {
  /** Плейсхолдеры, которые payload ОБЯЗАН заполнить строками. */
  params: readonly string[];
  shell: PushShell;
}

export const KNOWN_PUSH_ROUTES = {
  // ── участник ──────────────────────────────────────────────────────────────
  /** REG-01/07/10/11, REG-02/03/05 (до появления /checkout/[orderId] — OQ-05),
   *  REM-03, CLS-01/02, SUM-01 (fallback) */
  "/event/[id]": { params: ["id"], shell: "participant" },
  /** REG-01 (билет) / REG-06/08/09/12, REM-01 */
  "/ticket/[id]": { params: ["id"], shell: "participant" },
  /** SUM-01 (сертификат выдан) */
  "/certificate/[id]": { params: ["id"], shell: "participant" },
  /** REM-01 action-кнопка «Маршрут» */
  "/map": { params: [], shell: "participant" },
  /** Защита: участнический пуш без валидного route → инбокс участника */
  "/notifications": { params: [], shell: "participant" },
  // ── организатор ───────────────────────────────────────────────────────────
  /** MOD-01/04/05, REM-02 */
  "/org/event/[id]": { params: ["id"], shell: "org" },
  /** REG-20/21/22/23, CLS-03 */
  "/org/attendees/[eventId]": { params: ["eventId"], shell: "org" },
  /** SUM-02 */
  "/org/analytics/[eventId]": { params: ["eventId"], shell: "org" },
  /** Защита: организаторский пуш без валидного route */
  "/org/notifications": { params: [], shell: "org" },
} as const satisfies Record<string, KnownPushRoute>;

export type KnownPushRouteName = keyof typeof KNOWN_PUSH_ROUTES;

/** Фолбэк участника — инбокс участника (как хочет каталог §1: пуш без
 *  валидного route ведёт в `/notifications`). */
export const PARTICIPANT_FALLBACK_ROUTE = "/notifications";

/** Фолбэк организатора — центр уведомлений workspace (существует). */
export const ORG_FALLBACK_ROUTE = "/org/notifications";
