/**
 * Матрица преференсов уведомлений (BL-21): маппинг PATCH-изменения на кэш.
 *
 * Тумблер флипается оптимистично, до ответа сервера — хрупкое здесь то же,
 * что у инбокса (notifications-optimistic.test.ts): правка должна коснуться
 * РОВНО одной ячейки {key, channel}, locked-строка (transactional) обязана
 * оставаться нетронутой даже при совпадении ключа, а откат — вернуть кэш
 * бит-в-бит.
 */
import { QueryClient } from "@tanstack/react-query";

import {
  applyPreferenceChange,
  optimisticPreferenceChange,
  preferenceKeys,
  rollbackPreferences,
  type PreferenceRow,
} from "@entities/notifications";

function matrix(): PreferenceRow[] {
  return [
    { key: "transactional", push: true, email: true, locked: true },
    { key: "event_reminders", push: true, email: true, locked: false },
    { key: "summary", push: false, email: true, locked: false },
  ];
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

describe("applyPreferenceChange", () => {
  it("flips exactly the addressed cell and nothing else", () => {
    const next = applyPreferenceChange(matrix(), {
      key: "event_reminders",
      channel: "push",
      enabled: false,
    });

    expect(next[1]).toEqual({ key: "event_reminders", push: false, email: true, locked: false });
    // Сосед по строке и другие строки не тронуты.
    expect(next[0]).toEqual(matrix()[0]);
    expect(next[2]).toEqual(matrix()[2]);
  });

  it("turning a channel back on maps to enabled=true", () => {
    const next = applyPreferenceChange(matrix(), {
      key: "summary",
      channel: "push",
      enabled: true,
    });

    expect(next[2].push).toBe(true);
    expect(next[2].email).toBe(true);
  });

  it("never touches a locked row — the server would answer 400", () => {
    const rows: PreferenceRow[] = [
      { key: "transactional", push: true, email: true, locked: true },
    ];

    const next = applyPreferenceChange(rows, {
      // Клиент такого не шлёт; чистая функция всё равно обязана быть безопасной.
      key: "transactional" as never,
      channel: "push",
      enabled: false,
    });

    expect(next[0].push).toBe(true);
  });
});

describe("optimisticPreferenceChange / rollbackPreferences", () => {
  it("edits the cache immediately and returns the pre-edit snapshot", async () => {
    const qc = client();
    qc.setQueryData(preferenceKeys.matrix, matrix());

    const snapshot = await optimisticPreferenceChange(qc, {
      key: "event_reminders",
      channel: "email",
      enabled: false,
    });

    const next = qc.getQueryData<PreferenceRow[]>(preferenceKeys.matrix);
    expect(next?.[1].email).toBe(false);
    expect(snapshot).toEqual(matrix());
  });

  it("rollback restores the matrix exactly as it was", async () => {
    const qc = client();
    qc.setQueryData(preferenceKeys.matrix, matrix());

    const snapshot = await optimisticPreferenceChange(qc, {
      key: "summary",
      channel: "email",
      enabled: false,
    });
    rollbackPreferences(qc, snapshot);

    expect(qc.getQueryData(preferenceKeys.matrix)).toEqual(matrix());
  });

  it("is a no-op on an empty cache (screen opened offline before the first GET)", async () => {
    const qc = client();

    const snapshot = await optimisticPreferenceChange(qc, {
      key: "summary",
      channel: "push",
      enabled: true,
    });

    expect(snapshot).toBeUndefined();
    expect(() => rollbackPreferences(qc, snapshot)).not.toThrow();
  });
});
