/**
 * Optimistic mark-as-read in the notification inbox (BL-36).
 *
 * Same risk class as the attendee-queue moderation cache: lists are rewritten
 * BEFORE the server agrees. What must hold: a tapped row's dot goes out and
 * every counter (page `unread` + the bell's unread-count query) drops by the
 * number of rows that were ACTUALLY unread; "mark all" zeroes the counters
 * even past the loaded pages; a failure restores everything exactly.
 */
import { QueryClient } from "@tanstack/react-query";

import {
  notificationKeys,
  optimisticRead,
  rollbackRead,
  type NotificationItem,
  type NotificationList,
} from "@entities/notifications";

const ORG = "org-1";
const listKey = notificationKeys.list(ORG);
const unreadKey = notificationKeys.unread(ORG);

function row(id: string, readAt: string | null = null): NotificationItem {
  return { id, type: "REGISTRATION_CREATED", readAt, createdAt: "2026-08-01T10:00:00.000Z" };
}

function page(rows: NotificationItem[], unread: number, total = rows.length): NotificationList {
  return { data: rows, total, unread };
}

/** Every client made here is torn down in `afterEach`: react-query keeps a
 *  garbage-collection timer alive, and a leaked one makes Jest warn about open
 *  handles — noise that hides a real leak later. */
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

describe("optimisticRead", () => {
  it("marks the tapped row read and drops both counters by one", async () => {
    const qc = client();
    qc.setQueryData(listKey, { pages: [page([row("a"), row("b")], 2)], pageParams: [1] });
    qc.setQueryData(unreadKey, 2);

    await optimisticRead(qc, ORG, ["a"]);

    const next = qc.getQueryData(listKey) as { pages: NotificationList[] };
    expect(next.pages[0].data[0].readAt).not.toBeNull();
    expect(next.pages[0].data[1].readAt).toBeNull();
    expect(next.pages[0].unread).toBe(1);
    expect(qc.getQueryData(unreadKey)).toBe(1);
  });

  it("does not touch the counters for an already-read row", async () => {
    const qc = client();
    qc.setQueryData(listKey, { pages: [page([row("a", "2026-08-01T09:00:00.000Z"), row("b")], 1)], pageParams: [1] });
    qc.setQueryData(unreadKey, 1);

    await optimisticRead(qc, ORG, ["a"]);

    const next = qc.getQueryData(listKey) as { pages: NotificationList[] };
    expect(next.pages[0].data[0].readAt).toBe("2026-08-01T09:00:00.000Z");
    expect(next.pages[0].unread).toBe(1);
    expect(qc.getQueryData(unreadKey)).toBe(1);
  });

  it("counts hits across every loaded page", async () => {
    const qc = client();
    qc.setQueryData(listKey, {
      pages: [page([row("a")], 3, 4), page([row("b"), row("c", "2026-08-01T09:00:00.000Z")], 3, 4)],
      pageParams: [1, 2],
    });
    qc.setQueryData(unreadKey, 3);

    await optimisticRead(qc, ORG, ["a", "b", "c"]);

    const next = qc.getQueryData(listKey) as { pages: NotificationList[] };
    // Two rows were actually unread; the third was read already.
    expect(next.pages[0].unread).toBe(1);
    expect(next.pages[1].data[0].readAt).not.toBeNull();
    expect(qc.getQueryData(unreadKey)).toBe(1);
  });

  it("mark-all zeroes the counters even beyond the loaded pages", async () => {
    const qc = client();
    // 5 unread on the server, only 1 unread row loaded.
    qc.setQueryData(listKey, { pages: [page([row("a")], 5, 40)], pageParams: [1] });
    qc.setQueryData(unreadKey, 5);

    await optimisticRead(qc, ORG, undefined);

    const next = qc.getQueryData(listKey) as { pages: NotificationList[] };
    expect(next.pages[0].data[0].readAt).not.toBeNull();
    expect(next.pages[0].unread).toBe(0);
    expect(qc.getQueryData(unreadKey)).toBe(0);
  });

  it("never lets a counter go negative", async () => {
    const qc = client();
    qc.setQueryData(listKey, { pages: [page([row("a")], 0)], pageParams: [1] });
    qc.setQueryData(unreadKey, 0);

    await optimisticRead(qc, ORG, ["a"]);

    const next = qc.getQueryData(listKey) as { pages: NotificationList[] };
    expect(next.pages[0].unread).toBe(0);
    expect(qc.getQueryData(unreadKey)).toBe(0);
  });
});

describe("rollbackRead", () => {
  it("restores the list and the counter exactly as they were", async () => {
    const qc = client();
    const originalList = { pages: [page([row("a"), row("b")], 2)], pageParams: [1] };
    qc.setQueryData(listKey, originalList);
    qc.setQueryData(unreadKey, 2);

    const snapshot = await optimisticRead(qc, ORG, ["a"]);
    expect(qc.getQueryData(unreadKey)).toBe(1);

    rollbackRead(qc, snapshot);

    expect(qc.getQueryData(listKey)).toEqual(originalList);
    expect(qc.getQueryData(unreadKey)).toBe(2);
  });

  it("is a no-op when there is nothing to restore", () => {
    const qc = client();
    expect(() => rollbackRead(qc, undefined)).not.toThrow();
  });
});
