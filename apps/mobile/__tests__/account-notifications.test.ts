/**
 * Инбокс участника: маппинг строк и оптимистичная пометка прочитанным —
 * по образцу `notifications-optimistic.test.ts` (организаторский инбокс).
 *
 * Три группы инвариантов:
 *   1) словарь: у КАЖДОГО типа AccountNotificationType есть фраза notif.acc.*
 *      во всех трёх локалях (зеркало CI-инварианта №5 для in-app ключей);
 *   2) `accountNotificationTarget` — билет vs событие vs сертификат vs «вести
 *      некуда», и его выход проходит через resolvePushTarget без фолбэка;
 *   3) оптимистика: точка гаснет сразу, счётчики честные, rollback точный.
 */
import { QueryClient } from "@tanstack/react-query";

import {
  ACCOUNT_NOTIFICATION_TYPES,
  accountNotificationKeys,
  accountNotificationTarget,
  optimisticAccountRead,
  rollbackAccountRead,
  type AccountNotificationItem,
  type AccountNotificationList,
} from "@entities/account-notifications";
import { STRINGS } from "@shared/i18n/strings";
import { PARTICIPANT_FALLBACK_ROUTE } from "@shared/notifications/known-routes";
import { resolvePushTarget } from "@shared/notifications/resolve-target";

const listKey = accountNotificationKeys.list();
const unreadKey = accountNotificationKeys.unread();

function row(id: string, readAt: string | null = null): AccountNotificationItem {
  return { id, type: "REGISTRATION_APPROVED", readAt, createdAt: "2026-08-02T10:00:00.000Z" };
}

function page(rows: AccountNotificationItem[], unread: number, total = rows.length): AccountNotificationList {
  return { data: rows, total, unread };
}

const clients: QueryClient[] = [];

function client(): QueryClient {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  clients.push(qc);
  return qc;
}

afterEach(() => {
  for (const qc of clients.splice(0)) {
    qc.clear();
    qc.unmount();
  }
});

describe("словарь инбокса участника (uz/ru/en)", () => {
  const strings = STRINGS as Record<string, Record<string, string> | undefined>;

  it.each(ACCOUNT_NOTIFICATION_TYPES.map((t) => [t]))(
    "notif.acc.%s есть во всех трёх локалях",
    (type) => {
      const entry = strings[`notif.acc.${type}`];
      expect(entry).toBeDefined();
      for (const lang of ["uz", "ru", "en"] as const) {
        expect(entry?.[lang]?.trim()).toBeTruthy();
      }
    },
  );

  it("PENDING-вариант REGISTRATION_CREATED имеет собственную фразу", () => {
    const entry = strings["notif.acc.REGISTRATION_CREATED_PENDING"];
    expect(entry).toBeDefined();
    for (const lang of ["uz", "ru", "en"] as const) {
      expect(entry?.[lang]?.trim()).toBeTruthy();
    }
  });

  it("новые организаторские типы каталога тоже покрыты словарём notif.*", () => {
    const orgTypes = [
      "EVENT_SUBMITTED",
      "EVENT_CHANGES_REQUESTED",
      "REGISTRATION_FIRST",
      "CAPACITY_THRESHOLD",
      "TICKET_REFUND",
      "REGISTRATION_CLOSED",
      "EVENT_SUMMARY",
    ];
    for (const type of orgTypes) {
      const entry = strings[`notif.${type}`];
      expect(entry).toBeDefined();
      for (const lang of ["uz", "ru", "en"] as const) {
        expect(entry?.[lang]?.trim()).toBeTruthy();
      }
    }
  });
});

describe("accountNotificationTarget — маппинг строки в маршрут", () => {
  const base = { entityType: "event", entityId: "ev-1" };

  it("билет на руках — ведём на офлайн-доступный экран билета", () => {
    for (const type of ["REGISTRATION_APPROVED", "TICKET_ISSUED", "CHECKED_IN", "EVENT_REMINDER"] as const) {
      expect(
        accountNotificationTarget({ ...base, type, payload: { registrationId: "reg-1" } }),
      ).toEqual({ route: "/ticket/[id]", params: { id: "reg-1" } });
    }
  });

  it("REGISTRATION_CREATED: билет — на билет, PENDING-заявка — на событие", () => {
    expect(
      accountNotificationTarget({
        ...base,
        type: "REGISTRATION_CREATED",
        payload: { registrationId: "reg-1", pending: false },
      }),
    ).toEqual({ route: "/ticket/[id]", params: { id: "reg-1" } });
    expect(
      accountNotificationTarget({
        ...base,
        type: "REGISTRATION_CREATED",
        payload: { registrationId: "reg-1", pending: true },
      }),
    ).toEqual({ route: "/event/[id]", params: { id: "ev-1" } });
  });

  it("отказы, оплата и отмены ведут на событие", () => {
    for (const type of ["REGISTRATION_REJECTED", "PAYMENT_PENDING", "PAYMENT_FAILED", "HOLD_EXPIRED", "EVENT_CANCELLED"] as const) {
      expect(accountNotificationTarget({ ...base, type, payload: {} })).toEqual({
        route: "/event/[id]",
        params: { id: "ev-1" },
      });
    }
  });

  it("сертификат в payload побеждает событие (SUM-01)", () => {
    expect(
      accountNotificationTarget({ ...base, type: "EVENT_SUMMARY", payload: { certificateId: "cert-1" } }),
    ).toEqual({ route: "/certificate/[id]", params: { id: "cert-1" } });
    expect(accountNotificationTarget({ ...base, type: "EVENT_SUMMARY", payload: {} })).toEqual({
      route: "/event/[id]",
      params: { id: "ev-1" },
    });
  });

  it("вести некуда → null: строка не притворяется кнопкой", () => {
    expect(
      accountNotificationTarget({ type: "PAYMENT_FAILED", entityType: null, entityId: null, payload: {} }),
    ).toBeNull();
  });

  it("каждый выдаваемый маршрут исполним парсером пуша (не падает в фолбэк)", () => {
    const samples: AccountNotificationItem[] = [
      { id: "1", type: "REGISTRATION_APPROVED", ...base, payload: { registrationId: "r1" }, createdAt: "" },
      { id: "2", type: "PAYMENT_PENDING", ...base, payload: {}, createdAt: "" },
      { id: "3", type: "CERTIFICATE_ISSUED", ...base, payload: { certificateId: "c1" }, createdAt: "" },
    ];
    for (const item of samples) {
      const link = accountNotificationTarget(item);
      expect(link).not.toBeNull();
      if (!link) continue;
      const target = resolvePushTarget({ route: link.route, params: link.params }, { shell: "participant" });
      expect(target.pathname).not.toBe(PARTICIPANT_FALLBACK_ROUTE);
      expect(target.pathname).toBe(link.route);
    }
  });
});

describe("optimisticAccountRead", () => {
  it("помечает тапнутую строку и уменьшает оба счётчика на единицу", async () => {
    const qc = client();
    qc.setQueryData(listKey, { pages: [page([row("a"), row("b")], 2)], pageParams: [1] });
    qc.setQueryData(unreadKey, 2);

    await optimisticAccountRead(qc, ["a"]);

    const next = qc.getQueryData(listKey) as { pages: AccountNotificationList[] };
    expect(next.pages[0].data[0].readAt).not.toBeNull();
    expect(next.pages[0].data[1].readAt).toBeNull();
    expect(next.pages[0].unread).toBe(1);
    expect(qc.getQueryData(unreadKey)).toBe(1);
  });

  it("уже прочитанная строка не трогает счётчики", async () => {
    const qc = client();
    qc.setQueryData(listKey, { pages: [page([row("a", "2026-08-02T09:00:00.000Z"), row("b")], 1)], pageParams: [1] });
    qc.setQueryData(unreadKey, 1);

    await optimisticAccountRead(qc, ["a"]);

    const next = qc.getQueryData(listKey) as { pages: AccountNotificationList[] };
    expect(next.pages[0].data[0].readAt).toBe("2026-08-02T09:00:00.000Z");
    expect(next.pages[0].unread).toBe(1);
    expect(qc.getQueryData(unreadKey)).toBe(1);
  });

  it("«прочитать всё» обнуляет счётчики даже за незагруженные страницы", async () => {
    const qc = client();
    qc.setQueryData(listKey, { pages: [page([row("a")], 5, 40)], pageParams: [1] });
    qc.setQueryData(unreadKey, 5);

    await optimisticAccountRead(qc, undefined);

    const next = qc.getQueryData(listKey) as { pages: AccountNotificationList[] };
    expect(next.pages[0].data[0].readAt).not.toBeNull();
    expect(next.pages[0].unread).toBe(0);
    expect(qc.getQueryData(unreadKey)).toBe(0);
  });

  it("счётчик никогда не уходит в минус", async () => {
    const qc = client();
    qc.setQueryData(listKey, { pages: [page([row("a")], 0)], pageParams: [1] });
    qc.setQueryData(unreadKey, 0);

    await optimisticAccountRead(qc, ["a"]);

    expect((qc.getQueryData(listKey) as { pages: AccountNotificationList[] }).pages[0].unread).toBe(0);
    expect(qc.getQueryData(unreadKey)).toBe(0);
  });
});

describe("rollbackAccountRead", () => {
  it("возвращает список и счётчик ровно в исходное состояние", async () => {
    const qc = client();
    const originalList = { pages: [page([row("a"), row("b")], 2)], pageParams: [1] };
    qc.setQueryData(listKey, originalList);
    qc.setQueryData(unreadKey, 2);

    const snapshot = await optimisticAccountRead(qc, ["a"]);
    expect(qc.getQueryData(unreadKey)).toBe(1);

    rollbackAccountRead(qc, snapshot);

    expect(qc.getQueryData(listKey)).toEqual(originalList);
    expect(qc.getQueryData(unreadKey)).toBe(2);
  });

  it("no-op, когда восстанавливать нечего", () => {
    const qc = client();
    expect(() => rollbackAccountRead(qc, undefined)).not.toThrow();
  });
});
