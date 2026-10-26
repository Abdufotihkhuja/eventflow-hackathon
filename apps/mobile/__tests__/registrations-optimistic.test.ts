/**
 * Optimistic moderation of the attendee queue.
 *
 * This is the riskiest cache code in the app: it rewrites lists BEFORE the
 * server agrees. The two things that must hold are that a row leaves a list it
 * no longer belongs to (with the header count following it), and that any
 * failure puts every list back exactly as it was — an approval the server
 * refused must not leave a row looking approved.
 */
import { QueryClient } from "@tanstack/react-query";

import { optimisticStatus, rollback, type EventRegistrationsResult } from "@entities/registration";

const EVENT = "event-1";
const pendingKey = ["registrations", "event", EVENT, { status: "PENDING" }] as const;
const allKey = ["registrations", "event", EVENT, {}] as const;

function page(ids: string[], total = ids.length): EventRegistrationsResult {
  return {
    data: ids.map((id) => ({ id, eventId: EVENT, status: "PENDING" as const })) as never,
    total,
    page: 1,
    limit: 30,
    totalPages: 1,
  };
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

describe("optimisticStatus", () => {
  it("drops an approved row out of the PENDING list and lowers its total", async () => {
    const qc = client();
    qc.setQueryData(pendingKey, { pages: [page(["a", "b", "c"], 3)], pageParams: [1] });

    await optimisticStatus(qc, EVENT, ["b"], "APPROVED");

    const next = qc.getQueryData(pendingKey) as { pages: EventRegistrationsResult[] };
    expect(next.pages[0].data.map((r) => r.id)).toEqual(["a", "c"]);
    // The header reads `total`; leaving it at 3 would disagree with the rows.
    expect(next.pages[0].total).toBe(2);
  });

  it("keeps the row in an unfiltered list and just changes its status", async () => {
    const qc = client();
    qc.setQueryData(allKey, { pages: [page(["a", "b"], 2)], pageParams: [1] });

    await optimisticStatus(qc, EVENT, ["b"], "APPROVED");

    const next = qc.getQueryData(allKey) as { pages: EventRegistrationsResult[] };
    expect(next.pages[0].data.map((r) => r.id)).toEqual(["a", "b"]);
    expect(next.pages[0].data[1].status).toBe("APPROVED");
    expect(next.pages[0].total).toBe(2);
  });

  it("patches every cached list of the event at once", async () => {
    const qc = client();
    qc.setQueryData(pendingKey, { pages: [page(["a"], 1)], pageParams: [1] });
    qc.setQueryData(allKey, { pages: [page(["a"], 1)], pageParams: [1] });

    await optimisticStatus(qc, EVENT, ["a"], "REJECTED");

    const pending = qc.getQueryData(pendingKey) as { pages: EventRegistrationsResult[] };
    const all = qc.getQueryData(allKey) as { pages: EventRegistrationsResult[] };
    expect(pending.pages[0].data).toHaveLength(0);
    expect(all.pages[0].data[0].status).toBe("REJECTED");
  });

  it("moves a whole bulk selection in one pass", async () => {
    const qc = client();
    qc.setQueryData(pendingKey, { pages: [page(["a", "b", "c"], 3)], pageParams: [1] });

    await optimisticStatus(qc, EVENT, ["a", "c"], "APPROVED");

    const next = qc.getQueryData(pendingKey) as { pages: EventRegistrationsResult[] };
    expect(next.pages[0].data.map((r) => r.id)).toEqual(["b"]);
    expect(next.pages[0].total).toBe(1);
  });

  it("leaves a list untouched when it holds none of the ids", async () => {
    const qc = client();
    const before = { pages: [page(["x", "y"], 2)], pageParams: [1] };
    qc.setQueryData(pendingKey, before);

    await optimisticStatus(qc, EVENT, ["zzz"], "APPROVED");

    expect(qc.getQueryData(pendingKey)).toEqual(before);
  });

  it("never lets the total go negative", async () => {
    const qc = client();
    qc.setQueryData(pendingKey, { pages: [page(["a"], 0)], pageParams: [1] });

    await optimisticStatus(qc, EVENT, ["a"], "APPROVED");

    const next = qc.getQueryData(pendingKey) as { pages: EventRegistrationsResult[] };
    expect(next.pages[0].total).toBe(0);
  });
});

describe("rollback", () => {
  it("restores every list exactly as it was when the server refuses", async () => {
    const qc = client();
    const original = { pages: [page(["a", "b"], 2)], pageParams: [1] };
    qc.setQueryData(pendingKey, original);

    const snapshot = await optimisticStatus(qc, EVENT, ["a"], "APPROVED");
    expect((qc.getQueryData(pendingKey) as { pages: EventRegistrationsResult[] }).pages[0].data).toHaveLength(1);

    rollback(qc, snapshot);

    expect(qc.getQueryData(pendingKey)).toEqual(original);
  });

  it("is a no-op when there is nothing to restore", () => {
    const qc = client();
    expect(() => rollback(qc, undefined)).not.toThrow();
  });
});
