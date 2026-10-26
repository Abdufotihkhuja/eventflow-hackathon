/**
 * Org-scoped events data hooks (W6): the organization's OWN events — drafts,
 * pending review, published, cancelled, completed — via GET /events on the
 * workspace session token (sdk-workspace). Distinct from
 * `entities/organization`'s PUBLIC `getByOrganization` (published only).
 */
import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { workspaceSdk } from "@shared/api";

import {
  toOrgEventDetail,
  toOrgEventRow,
  type OrgEventDetail,
  type OrgEventRow,
  type OrgEventStatus,
} from "./model";

export interface OrgEventsListQuery {
  status?: OrgEventStatus;
  page?: number;
  limit?: number;
}

export const orgEventsKeys = {
  all: ["org-events"] as const,
  list: (orgId: string, query?: OrgEventsListQuery) =>
    ["org-events", "list", orgId, query ?? {}] as const,
  detail: (id: string) => ["org-events", "detail", id] as const,
  /** Fuller edit/manage payload — a DISTINCT key from `detail` so the compact
   *  row adapter and the full-detail adapter never overwrite each other's
   *  cached shape (both still sit under the `["org-events"]` prefix, so
   *  `invalidateQueries({ queryKey: all })` refetches both). */
  editable: (id: string) => ["org-events", "editable", id] as const,
};

interface RawList {
  data?: unknown[];
  total?: number;
}

/** The workspace's events. One page of up to `limit` rows (default 100 — the
 *  lifecycle chips bucket client-side, so we want one broad page, not many
 *  narrow ones); `total` reports the true count for an honest footer. */
export function useOrgEventsListQuery(
  orgId: string | undefined,
  query?: OrgEventsListQuery,
) {
  return useQuery({
    queryKey: orgEventsKeys.list(orgId ?? "", query),
    queryFn: async () => {
      const res = (await workspaceSdk.events.getEvents({
        limit: 100,
        ...query,
      } as never)) as unknown as RawList;
      const rows = (res?.data ?? []).map((raw) => toOrgEventRow(raw));
      return { rows, total: res?.total ?? rows.length };
    },
    enabled: Boolean(orgId),
    placeholderData: keepPreviousData,
  });
}

/* ── Paginated list (design 4.4) ──────────────────────────────────────────── */

/** Lifecycle as the SERVER now understands it (`GET /events?lifecycle=`).
 *  Mirrors the UI's `EventLifecycleStatus`, upper-cased. */
export type OrgEventLifecycle = "DRAFT" | "PENDING" | "PUBLISHED" | "LIVE" | "PAST" | "CANCELLED";

export interface OrgEventsFilter {
  /** Undefined = every lifecycle («Все»). */
  lifecycle?: OrgEventLifecycle;
  search?: string;
  type?: "FREE" | "PAID";
  format?: "OFFLINE" | "ONLINE" | "HYBRID";
  city?: string;
  sortBy?: "createdAt" | "startDate" | "title";
  sortOrder?: "asc" | "desc";
}

/** One screenful. Small enough that the first paint is quick, large enough that
 *  a half-empty phone does not fire a second request immediately. */
const PAGE = 20;

/** Drops empty values so a cleared filter does not travel as `""` and get
 *  rejected by the DTO's enum validators. */
function toQuery(filter: OrgEventsFilter, page: number): Record<string, unknown> {
  const q: Record<string, unknown> = { page, limit: PAGE };
  if (filter.lifecycle) q.lifecycle = filter.lifecycle;
  if (filter.search) q.search = filter.search;
  if (filter.type) q.type = filter.type;
  if (filter.format) q.format = filter.format;
  if (filter.city) q.city = filter.city;
  if (filter.sortBy) q.sortBy = filter.sortBy;
  if (filter.sortOrder) q.sortOrder = filter.sortOrder;
  return q;
}

/**
 * The events list, page by page.
 *
 * Everything the list narrows by is now a SERVER parameter. It used to pull one
 * broad page of 100 and filter in the browser, which silently truncated a busy
 * organization at 100 events and — the moment paging was added — would have
 * made every client-side filter lie about a page it had not loaded yet.
 */
export function useOrgEventsInfiniteQuery(orgId: string | undefined, filter: OrgEventsFilter) {
  return useInfiniteQuery({
    queryKey: [...orgEventsKeys.all, "paged", orgId ?? "", filter] as const,
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const res = (await workspaceSdk.events.getEvents(
        toQuery(filter, pageParam) as never,
      )) as unknown as RawList;
      return {
        rows: (res?.data ?? []).map((raw) => toOrgEventRow(raw)),
        total: res?.total ?? 0,
        page: pageParam,
      };
    },
    getNextPageParam: (last, all) => {
      const loaded = all.reduce((n, pg) => n + pg.rows.length, 0);
      return loaded < last.total ? last.page + 1 : undefined;
    },
    enabled: Boolean(orgId),
    placeholderData: keepPreviousData,
  });
}

/**
 * How many events sit in one lifecycle under the CURRENT narrowing — the number
 * on a filter chip.
 *
 * Asks for a single row and reads `total`: the count has to come from the
 * server now that the client no longer holds the whole list, and there is no
 * counts endpoint to ask instead.
 */
export function useOrgEventsCountQuery(
  orgId: string | undefined,
  filter: OrgEventsFilter,
  lifecycle?: OrgEventLifecycle,
) {
  const scoped: OrgEventsFilter = { ...filter, lifecycle, sortBy: undefined, sortOrder: undefined };
  return useQuery({
    queryKey: [...orgEventsKeys.all, "count", orgId ?? "", scoped] as const,
    queryFn: async (): Promise<number> => {
      const res = (await workspaceSdk.events.getEvents({
        ...toQuery(scoped, 1),
        limit: 1,
      } as never)) as unknown as RawList;
      return res?.total ?? 0;
    },
    enabled: Boolean(orgId),
    placeholderData: keepPreviousData,
  });
}

/** One org event as a compact row (org access check server-side). */
export function useOrgEventQuery(id: string | undefined) {
  return useQuery({
    queryKey: orgEventsKeys.detail(id ?? ""),
    queryFn: async (): Promise<OrgEventRow> =>
      toOrgEventRow(await workspaceSdk.events.getEvent(id as string)),
    enabled: Boolean(id),
  });
}

/** One org event with the fuller edit/manage shape (description, slug, price,
 *  categories, format) under its own `editable` key. The W7 mutations
 *  invalidate `orgEventsKeys.all`, which covers this. */
export function useOrgEventDetailQuery(id: string | undefined) {
  return useQuery({
    queryKey: orgEventsKeys.editable(id ?? ""),
    queryFn: async (): Promise<OrgEventDetail> =>
      toOrgEventDetail(await workspaceSdk.events.getEvent(id as string)),
    enabled: Boolean(id),
  });
}
