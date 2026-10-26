/**
 * Registration/ticket data hooks. The participant's tickets ARE registrations
 * (no separate Ticket entity); the QR is server-issued (never fabricated).
 */
import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { publicSdk } from "@shared/api";

type SdkMyRegistrationsQuery = Parameters<
  typeof publicSdk.registrations.getMyRegistrations
>[0];
type RegisterBody = Parameters<typeof publicSdk.registrations.register>[1];

export interface MyRegistrationsQuery {
  status?: "ALL" | "APPROVED" | "PENDING" | "ATTENDED" | "CANCELLED";
  page?: number;
  limit?: number;
}

export const registrationKeys = {
  all: ["registrations"] as const,
  myList: (query?: MyRegistrationsQuery) =>
    ["registrations", "mine", query ?? {}] as const,
  qr: (id: string) => ["registrations", "qr", id] as const,
};

export function useMyRegistrationsQuery(
  query?: MyRegistrationsQuery,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: registrationKeys.myList(query),
    queryFn: () =>
      publicSdk.registrations.getMyRegistrations(
        query as unknown as SdkMyRegistrationsQuery,
      ),
    enabled: options?.enabled ?? true,
  });
}

export function useTicketQrQuery(id: string | undefined) {
  return useQuery({
    queryKey: registrationKeys.qr(id ?? ""),
    queryFn: () => publicSdk.registrations.getQrCode(id as string),
    enabled: Boolean(id),
    staleTime: 60_000,
  });
}

export function useRegisterMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      eventId: string;
      body: RegisterBody;
      inviteCode?: string;
    }) =>
      publicSdk.registrations.register(
        input.eventId,
        input.body,
        input.inviteCode ? { inviteCode: input.inviteCode } : undefined,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: registrationKeys.all });
    },
  });
}

export function useCancelRegistrationMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => publicSdk.registrations.cancelRegistration(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: registrationKeys.all });
    },
  });
}

// ── Organizer-side attendee management ───────────────────────────────────────
// Real registration statuses (no ATTENDED — check-in lives in a separate table).
export type OrgRegStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

export interface EventRegistrationsQuery {
  status?: OrgRegStatus;
  search?: string;
  page?: number;
  limit?: number;
}

export interface OrgRegistrationItem {
  id: string;
  status: OrgRegStatus;
  role?: string | null;
  qrCode?: string | null;
  ticketNumber?: string | null;
  createdAt?: string;
  user?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    phone?: string | null;
    avatarUrl?: string | null;
  } | null;
}

export interface EventRegistrationsResult {
  data: OrgRegistrationItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const eventRegKey = (eventId: string, query?: EventRegistrationsQuery) =>
  ["registrations", "event", eventId, query ?? {}] as const;

export function useEventRegistrationsQuery(
  eventId: string | undefined,
  query?: EventRegistrationsQuery,
) {
  return useQuery({
    queryKey: eventRegKey(eventId ?? "", query),
    queryFn: () =>
      publicSdk.organizerRegistrations.list(
        eventId as string,
        query as never,
      ) as Promise<EventRegistrationsResult>,
    enabled: Boolean(eventId),
  });
}

/** Paginated attendee list (W8): loads pages of `limit` past the first 100.
 *  `placeholderData: keepPreviousData` holds the last list rendered while a new
 *  status/search re-keys the query, so the screen never flashes a spinner on a
 *  tab tap or keystroke. Header count reads the server `total`, not the count
 *  of loaded rows. */
export const ATTENDEES_PAGE_SIZE = 30;

export function useEventRegistrationsInfiniteQuery(
  eventId: string | undefined,
  filter?: { status?: OrgRegStatus; search?: string },
) {
  return useInfiniteQuery({
    queryKey: eventRegKey(eventId ?? "", filter),
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      publicSdk.organizerRegistrations.list(eventId as string, {
        ...filter,
        page: pageParam,
        limit: ATTENDEES_PAGE_SIZE,
      } as never) as Promise<EventRegistrationsResult>,
    getNextPageParam: (last) =>
      last.page < last.totalPages ? last.page + 1 : undefined,
    enabled: Boolean(eventId),
    placeholderData: keepPreviousData,
  });
}

/** Invalidate every cached registration list for this event (any filter). */
function invalidateEvent(qc: ReturnType<typeof useQueryClient>, eventId: string) {
  void qc.invalidateQueries({ queryKey: ["registrations", "event", eventId] });
}

/**
 * Move rows to their new status IN THE CACHE, before the server answers.
 *
 * Moderating a queue is done dozens of times in a row, often on venue wifi. A
 * round-trip per tap makes the screen feel broken, so the row changes now and
 * the request catches up. Two details keep it honest rather than merely fast:
 *
 *  · a row that no longer matches the list it is in (an approved row inside the
 *    PENDING tab) is REMOVED and `total` drops with it — otherwise the header
 *    count and the visible rows disagree;
 *  · the snapshot returned here is the rollback. Any failure puts every cached
 *    list back exactly as it was, so a refused approval never leaves a row
 *    looking approved.
 *
 * `onSettled` still invalidates: the server remains the source of truth, this
 * only removes the wait from in front of the user.
 */
type RegistrationCacheEntry = [readonly unknown[], unknown];

export async function optimisticStatus(
  qc: ReturnType<typeof useQueryClient>,
  eventId: string,
  ids: string[],
  next: OrgRegStatus,
): Promise<RegistrationCacheEntry[]> {
  const prefix = ["registrations", "event", eventId] as const;
  // Stop in-flight refetches, or one landing mid-edit would overwrite the patch.
  await qc.cancelQueries({ queryKey: prefix });
  const snapshot = qc.getQueriesData({ queryKey: prefix }) as RegistrationCacheEntry[];
  const target = new Set(ids);

  for (const [key] of snapshot) {
    // The 4th key segment is the filter this list was fetched with.
    const filter = (key[3] ?? {}) as { status?: OrgRegStatus };
    const dropped = filter.status !== undefined && filter.status !== next;

    const patchPage = (page: EventRegistrationsResult): EventRegistrationsResult => {
      const rows = page.data ?? [];
      const hits = rows.filter((r) => target.has(r.id)).length;
      if (hits === 0) return page;
      return {
        ...page,
        data: dropped
          ? rows.filter((r) => !target.has(r.id))
          : rows.map((r) => (target.has(r.id) ? { ...r, status: next } : r)),
        total: dropped ? Math.max(0, (page.total ?? 0) - hits) : page.total,
      };
    };

    qc.setQueryData(key, (old: unknown) => {
      if (!old) return old;
      // Infinite lists hold pages; the plain query holds one result.
      const paged = old as { pages?: EventRegistrationsResult[]; pageParams?: unknown[] };
      if (Array.isArray(paged.pages)) return { ...paged, pages: paged.pages.map(patchPage) };
      return patchPage(old as EventRegistrationsResult);
    });
  }

  return snapshot;
}

/** Put every list back exactly as it was. */
export function rollback(qc: ReturnType<typeof useQueryClient>, snapshot?: RegistrationCacheEntry[]): void {
  for (const [key, data] of snapshot ?? []) qc.setQueryData(key, data);
}

export function useApproveRegistrationMutation(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => publicSdk.organizerRegistrations.approve(eventId, id),
    onMutate: (id: string) => optimisticStatus(qc, eventId, [id], "APPROVED"),
    onError: (_e, _id, snapshot) => rollback(qc, snapshot),
    onSettled: () => invalidateEvent(qc, eventId),
  });
}

export function useRejectRegistrationMutation(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; reason?: string }) =>
      publicSdk.organizerRegistrations.reject(
        eventId,
        input.id,
        (input.reason ? { reason: input.reason } : undefined) as never,
      ),
    onMutate: (input: { id: string; reason?: string }) =>
      optimisticStatus(qc, eventId, [input.id], "REJECTED"),
    onError: (_e, _input, snapshot) => rollback(qc, snapshot),
    onSettled: () => invalidateEvent(qc, eventId),
  });
}

export function useBulkApproveMutation(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) =>
      publicSdk.organizerRegistrations.bulkApprove(eventId, { ids } as never),
    onMutate: (ids: string[]) => optimisticStatus(qc, eventId, ids, "APPROVED"),
    onError: (_e, _ids, snapshot) => rollback(qc, snapshot),
    onSettled: () => invalidateEvent(qc, eventId),
  });
}

export function useBulkRejectMutation(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { ids: string[]; reason?: string }) =>
      publicSdk.organizerRegistrations.bulkReject(eventId, input as never),
    onMutate: (input: { ids: string[]; reason?: string }) =>
      optimisticStatus(qc, eventId, input.ids, "REJECTED"),
    onError: (_e, _input, snapshot) => rollback(qc, snapshot),
    onSettled: () => invalidateEvent(qc, eventId),
  });
}

// ── Door check-in (scan/enter a ticket QR) ───────────────────────────────────
export interface CheckInResult {
  attendance?: { id: string; checkInAt?: string; checkInDate?: string };
  participant?: { id: string; firstName?: string; lastName?: string; email?: string; role?: string };
  registration?: { id: string; status?: string };
  ticketUrls?: { branded?: string; simple?: string };
}

export function useCheckInMutation() {
  return useMutation({
    mutationFn: (qrCode: string) =>
      publicSdk.attendance.checkIn({ qrCode } as never) as Promise<CheckInResult>,
  });
}
