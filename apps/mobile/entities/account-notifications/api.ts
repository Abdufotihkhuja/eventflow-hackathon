/**
 * Инбокс участника (`/notifications`, CONTRACT_DIFF §3).
 *
 * Параллелен организаторскому центру (`entities/notifications`), но живёт на
 * личном Account: источник — `GET /api/v1/me/notifications` через
 * `accountSdk.notifications.*`. Сервер отдаёт ТИП и подстановки, а не готовую
 * фразу — текст собирается на клиенте в языке интерфейса (словарь
 * `notif.acc.*`), по тому же принципу, что и организаторская лента.
 *
 * Ключи кэша НЕ параметризованы организацией: инбокс один на аккаунт и
 * доступен из обоих шеллов (org-scoped JWT тоже несёт accountId).
 */
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { accountSdk } from "@shared/api";

/** Контрактный enum AccountNotificationType (CONTRACT_DIFF §5) — список
 *  нужен рантайму: тест словаря сверяет notif.acc.* по нему. */
export const ACCOUNT_NOTIFICATION_TYPES = [
  "REGISTRATION_CREATED",
  "REGISTRATION_APPROVED",
  "REGISTRATION_REJECTED",
  "REGISTRATION_CANCELLED",
  "REGISTRATION_REVOKED",
  "PAYMENT_PENDING",
  "PAYMENT_FAILED",
  "HOLD_EXPIRED",
  "TICKET_ISSUED",
  "TICKET_REFUNDED",
  "CHECKED_IN",
  "EVENT_REMINDER",
  "EVENT_STARTING",
  "EVENT_CANCELLED",
  "REGISTRATION_CLOSING",
  "FEW_SEATS_LEFT",
  "EVENT_SUMMARY",
  "CERTIFICATE_ISSUED",
] as const;

export type AccountNotificationType = (typeof ACCOUNT_NOTIFICATION_TYPES)[number];

export interface AccountNotificationItem {
  id: string;
  type: AccountNotificationType;
  entityType?: string | null;
  entityId?: string | null;
  payload?: Record<string, unknown> | null;
  readAt?: string | null;
  createdAt: string;
}

export interface AccountNotificationList {
  data: AccountNotificationItem[];
  total: number;
  unread: number;
}

const PAGE = 20;

export const accountNotificationKeys = {
  all: ["account-notifications"] as const,
  list: () => ["account-notifications", "list"] as const,
  unread: () => ["account-notifications", "unread"] as const,
};

/**
 * Куда ведёт строка инбокса: `{route, params}` в параметрической нотации
 * Expo Router — тот же формат, что несёт push (resolve-target), поэтому
 * навигация экрана и навигация по пушу проходят один и тот же парсер.
 * Типы «про билет» ведут на офлайн-доступный экран билета, всё событийное —
 * на страницу события; вести некуда → null (строка не притворяется кнопкой).
 */
export function accountNotificationTarget(
  item: Pick<AccountNotificationItem, "type" | "entityType" | "entityId" | "payload">,
): { route: string; params: Record<string, string> } | null {
  const payload = (item.payload ?? {}) as {
    registrationId?: unknown;
    pending?: unknown;
    certificateId?: unknown;
  };
  const registrationId = typeof payload.registrationId === "string" ? payload.registrationId : null;
  const certificateId = typeof payload.certificateId === "string" ? payload.certificateId : null;
  const eventId = item.entityType === "event" && item.entityId ? item.entityId : null;

  const ticket = registrationId ? { route: "/ticket/[id]", params: { id: registrationId } } : null;
  const event = eventId ? { route: "/event/[id]", params: { id: eventId } } : null;

  switch (item.type) {
    // Билет на руках — ведём на него; PENDING-заявка билета не имеет.
    case "REGISTRATION_CREATED":
      return payload.pending === true ? event : (ticket ?? event);
    case "REGISTRATION_APPROVED":
    case "TICKET_ISSUED":
    case "TICKET_REFUNDED":
    case "CHECKED_IN":
    case "EVENT_REMINDER":
      return ticket ?? event;
    case "EVENT_SUMMARY":
    case "CERTIFICATE_ISSUED":
      return certificateId ? { route: "/certificate/[id]", params: { id: certificateId } } : event;
    default:
      // Отказы/оплата/отмены/закрытие регистрации — контекст живёт на событии.
      return event;
  }
}

export function useAccountNotificationsQuery(enabled = true) {
  return useInfiniteQuery({
    queryKey: accountNotificationKeys.list(),
    initialPageParam: 1,
    queryFn: async ({ pageParam }): Promise<AccountNotificationList> =>
      (await accountSdk.notifications.list({
        page: pageParam,
        limit: PAGE,
      })) as unknown as AccountNotificationList,
    getNextPageParam: (last, all) => {
      const loaded = all.reduce((n, pg) => n + pg.data.length, 0);
      return loaded < last.total ? all.length + 1 : undefined;
    },
    enabled,
  });
}

/**
 * Счётчик для колокольчика и badge иконки приложения. `retry: false` — как у
 * организаторского собрата: ошибка один раз, значок просто не появляется.
 */
export function useAccountUnreadCountQuery(enabled = true) {
  return useQuery({
    queryKey: accountNotificationKeys.unread(),
    queryFn: async (): Promise<number> => {
      const res = (await accountSdk.notifications.unreadCount()) as { count?: number };
      return res?.count ?? 0;
    },
    enabled,
    retry: false,
  });
}

/**
 * Оптимистичная пометка прочитанным — точная копия механики организаторского
 * инбокса (BL-36): снимок → правка кэша → rollback при ошибке; счётчики
 * уменьшаются только на строки, которые РЕАЛЬНО были непрочитанными.
 * Покрыто `__tests__/account-notifications.test.ts`.
 */
type AccountNotificationCacheEntry = [readonly unknown[], unknown];

export async function optimisticAccountRead(
  qc: ReturnType<typeof useQueryClient>,
  ids?: string[],
): Promise<AccountNotificationCacheEntry[]> {
  await qc.cancelQueries({ queryKey: accountNotificationKeys.all });
  const snapshot = qc.getQueriesData({
    queryKey: accountNotificationKeys.all,
  }) as AccountNotificationCacheEntry[];

  // Пустой список = «прочитать всё» (контракт PATCH /me/notifications/read).
  const target = ids && ids.length > 0 ? new Set(ids) : null;
  const now = new Date().toISOString();
  const isHit = (r: AccountNotificationItem): boolean => !r.readAt && (!target || target.has(r.id));

  let newlyRead = 0;
  qc.setQueryData(accountNotificationKeys.list(), (old: unknown) => {
    const paged = old as { pages?: AccountNotificationList[]; pageParams?: unknown[] } | undefined;
    if (!paged?.pages) return old;
    newlyRead = paged.pages.reduce((n, pg) => n + (pg.data ?? []).filter(isHit).length, 0);
    if (newlyRead === 0 && target) return old;
    return {
      ...paged,
      pages: paged.pages.map((pg) => ({
        ...pg,
        data: (pg.data ?? []).map((r) => (isHit(r) ? { ...r, readAt: now } : r)),
        // «Всё» обнуляет счётчик и за незагруженные страницы: сервер пометит
        // и их, кэш не должен показывать больше.
        unread: target ? Math.max(0, (pg.unread ?? 0) - newlyRead) : 0,
      })),
    };
  });

  qc.setQueryData(accountNotificationKeys.unread(), (old: unknown) => {
    if (!target) return 0;
    return typeof old === "number" ? Math.max(0, old - newlyRead) : old;
  });

  return snapshot;
}

/** Вернуть кэш ровно в состояние до правки — сервер отказал. */
export function rollbackAccountRead(
  qc: ReturnType<typeof useQueryClient>,
  snapshot?: AccountNotificationCacheEntry[],
): void {
  for (const [key, data] of snapshot ?? []) qc.setQueryData(key, data);
}

/** Отметить прочитанным: список id или весь инбокс, если список пуст. */
export function useAccountMarkReadMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids?: string[]) =>
      (await accountSdk.notifications.markRead(
        ids && ids.length > 0 ? { ids } : undefined,
      )) as { count?: number },
    onMutate: (ids?: string[]) => optimisticAccountRead(qc, ids),
    // Эндпоинт возвращает свежий unread-count — он и есть правда: пока летел
    // запрос, могли приехать новые строки.
    onSuccess: (res) => {
      if (typeof res?.count === "number") {
        qc.setQueryData(accountNotificationKeys.unread(), res.count);
      }
    },
    onError: (_e, _ids, snapshot) => {
      rollbackAccountRead(qc, snapshot);
      void qc.invalidateQueries({ queryKey: accountNotificationKeys.all });
    },
  });
}
