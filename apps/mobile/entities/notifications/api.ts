/**
 * Центр уведомлений организации (`/notifications`).
 *
 * Сервер отдаёт ТИП и подстановки, а не готовую фразу — текст собирается здесь,
 * на языке интерфейса. Это прямое следствие того, что лента активности на
 * дашборде делает наоборот: хранит русскую строку, и клиенту приходится её
 * выбрасывать, чтобы узбекский интерфейс не показывал русский.
 *
 * Запросы идут через `workspaceSdk.notifications.*` (модуль попал в
 * сгенерированный SDK — прямой `apiTransport` больше не нужен). Контрактный
 * enum типов ШИРЕ локального `NotificationType`: новые значения каталога
 * (EVENT_SUBMITTED, REGISTRATION_FIRST, …) добавляются аддитивно, а UI и так
 * держит фолбэк на неизвестный тип (META/`t()` в org/notifications) — поэтому
 * ответы приводятся к локальным типам структурно, без сужения enum'а руками.
 */
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { workspaceSdk } from "@shared/api";

export type NotificationType =
  | "REGISTRATION_CREATED"
  | "REGISTRATION_APPROVED"
  | "REGISTRATION_REJECTED"
  | "EVENT_PUBLISHED"
  | "EVENT_REJECTED"
  | "MEMBER_JOINED"
  | "ORG_VERIFIED"
  | "ORG_VERIFICATION_REJECTED"
  // Программа уведомлений (CONTRACT_DIFF §5, аддитивно):
  | "EVENT_SUBMITTED"
  | "EVENT_CHANGES_REQUESTED"
  | "REGISTRATION_FIRST"
  | "CAPACITY_THRESHOLD"
  | "TICKET_REFUND"
  | "REGISTRATION_CLOSED"
  | "EVENT_SUMMARY";

export interface NotificationItem {
  id: string;
  type: NotificationType;
  entityType?: string | null;
  entityId?: string | null;
  payload?: Record<string, unknown> | null;
  readAt?: string | null;
  createdAt: string;
}

export interface NotificationList {
  data: NotificationItem[];
  total: number;
  unread: number;
}

const PAGE = 20;

export const notificationKeys = {
  all: ["notifications"] as const,
  list: (orgId: string) => ["notifications", "list", orgId] as const,
  unread: (orgId: string) => ["notifications", "unread", orgId] as const,
};

export function useNotificationsQuery(orgId: string | undefined) {
  return useInfiniteQuery({
    queryKey: notificationKeys.list(orgId ?? ""),
    initialPageParam: 1,
    queryFn: async ({ pageParam }): Promise<NotificationList> =>
      (await workspaceSdk.notifications.list({
        page: pageParam,
        limit: PAGE,
      })) as unknown as NotificationList,
    getNextPageParam: (last, all) => {
      const loaded = all.reduce((n, pg) => n + pg.data.length, 0);
      return loaded < last.total ? all.length + 1 : undefined;
    },
    enabled: Boolean(orgId),
  });
}

/**
 * Счётчик для значка в шапке. Отдельный дешёвый запрос — тянуть ради числа всю
 * ленту незачем. `retry: false`: сотрудник без доступа получит ошибку один раз,
 * и значок просто не появится.
 */
export function useUnreadCountQuery(orgId: string | undefined) {
  return useQuery({
    queryKey: notificationKeys.unread(orgId ?? ""),
    queryFn: async (): Promise<number> => {
      const res = (await workspaceSdk.notifications.unreadCount()) as { count?: number };
      return res?.count ?? 0;
    },
    enabled: Boolean(orgId),
    retry: false,
  });
}

/**
 * Оптимистичная пометка прочитанным (BL-36): точка на строке и цифра на
 * колокольчике гаснут СРАЗУ по тапу, не дожидаясь сервера. Паттерн тот же, что
 * у модерации заявок (`entities/registration`): снимок → правка кэша →
 * rollback при ошибке. Покрыто `__tests__/notifications-optimistic.test.ts`.
 *
 * Уменьшаем счётчики только на строки, которые РЕАЛЬНО были непрочитанными:
 * повторный тап по уже прочитанной строке не должен трогать цифру.
 */
type NotificationCacheEntry = [readonly unknown[], unknown];

export async function optimisticRead(
  qc: ReturnType<typeof useQueryClient>,
  orgId: string,
  ids?: string[],
): Promise<NotificationCacheEntry[]> {
  // Остановить летящие refetch'и — иначе один из них перезапишет правку.
  await qc.cancelQueries({ queryKey: notificationKeys.all });
  const snapshot = qc.getQueriesData({ queryKey: notificationKeys.all }) as NotificationCacheEntry[];

  // Пустой список = «прочитать всё» (контракт PATCH /notifications/read).
  const target = ids && ids.length > 0 ? new Set(ids) : null;
  const now = new Date().toISOString();
  const isHit = (r: NotificationItem): boolean => !r.readAt && (!target || target.has(r.id));

  let newlyRead = 0;
  qc.setQueryData(notificationKeys.list(orgId), (old: unknown) => {
    const paged = old as { pages?: NotificationList[]; pageParams?: unknown[] } | undefined;
    if (!paged?.pages) return old;
    newlyRead = paged.pages.reduce((n, pg) => n + (pg.data ?? []).filter(isHit).length, 0);
    if (newlyRead === 0 && target) return old;
    return {
      ...paged,
      pages: paged.pages.map((pg) => ({
        ...pg,
        data: (pg.data ?? []).map((r) => (isHit(r) ? { ...r, readAt: now } : r)),
        // «Всё» обнуляет счётчик даже за незагруженные страницы: сервер
        // пометит и их, кэш не должен показывать больше.
        unread: target ? Math.max(0, (pg.unread ?? 0) - newlyRead) : 0,
      })),
    };
  });

  qc.setQueryData(notificationKeys.unread(orgId), (old: unknown) => {
    if (!target) return 0;
    return typeof old === "number" ? Math.max(0, old - newlyRead) : old;
  });

  return snapshot;
}

/** Вернуть кэш ровно в состояние до правки — сервер отказал. */
export function rollbackRead(
  qc: ReturnType<typeof useQueryClient>,
  snapshot?: NotificationCacheEntry[],
): void {
  for (const [key, data] of snapshot ?? []) qc.setQueryData(key, data);
}

/** Отметить прочитанным: список id или всю ленту, если список пуст. */
export function useMarkReadMutation(orgId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    // Пустой список = «прочитать всё»: SDK сам подставляет `{}` без ids.
    mutationFn: async (ids?: string[]) =>
      (await workspaceSdk.notifications.markRead(
        ids && ids.length > 0 ? { ids } : undefined,
      )) as { count?: number },
    onMutate: (ids?: string[]) => optimisticRead(qc, orgId ?? "", ids),
    // Эндпоинт возвращает свежий unread-count — он и есть правда: пока летел
    // запрос, коллега мог нагенерировать новых строк.
    onSuccess: (res) => {
      if (typeof res?.count === "number") {
        qc.setQueryData(notificationKeys.unread(orgId ?? ""), res.count);
      }
    },
    // Сеть отвалилась — и список, и счётчик должны вернуться к правде,
    // а не остаться «прочитанными».
    onError: (_e, _ids, snapshot) => {
      rollbackRead(qc, snapshot);
      void qc.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}
