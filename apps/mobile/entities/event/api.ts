/**
 * Event data hooks (React Query over the public SDK). The list/detail caches
 * power the Discover and EventDetail screens and their loading/empty/error
 * states (app/states.jsx).
 */
import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { accountSdk, publicSdk } from "@shared/api";
import type { Lang } from "@shared/data/events";

type CreateCommentBody = Parameters<typeof publicSdk.events.postComment>[1];

type SdkEventsQuery = Parameters<typeof publicSdk.events.getPublicEvents>[0];

/**
 * Screen-friendly query. The generated SDK types `locale`/`filter`/`type` as
 * string enums; we expose plain strings here and confine the single boundary
 * cast to this layer so screens never import generated enum names.
 */
export interface EventsQuery {
  locale?: Lang;
  filter?: "upcoming" | "past" | "all";
  type?: "FREE" | "PAID";
  format?: "OFFLINE" | "ONLINE" | "HYBRID";
  featured?: boolean;
  category?: string;
  city?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export const eventKeys = {
  all: ["events"] as const,
  list: (query?: EventsQuery) => ["events", "list", query ?? {}] as const,
  infinite: (query?: EventsQuery) => ["events", "infinite", query ?? {}] as const,
  detail: (id: string) => ["events", "detail", id] as const,
  canRegister: (id: string) => ["events", "can-register", id] as const,
};

export function useEventsQuery(query?: EventsQuery, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: eventKeys.list(query),
    queryFn: () =>
      publicSdk.events.getPublicEvents(query as unknown as SdkEventsQuery),
    enabled: options?.enabled ?? true,
    // Refinements (chips / filters / region / keystrokes) re-key the query;
    // keep showing the previous list instead of tearing down to skeletons.
    placeholderData: keepPreviousData,
  });
}

/**
 * Paged event list (Discover upcoming feed, search results). The envelope is
 * `PublicEventsListDto` — `.items` + `.total`/`.page`/`.totalPages` drive the
 * results count and the next-page cursor. `keepPreviousData` keeps the last
 * pages rendered while a refinement refetches under a new key.
 */
export function useInfiniteEventsQuery(query?: EventsQuery, options?: { enabled?: boolean }) {
  return useInfiniteQuery({
    queryKey: eventKeys.infinite(query),
    queryFn: ({ pageParam }) =>
      publicSdk.events.getPublicEvents({ ...(query ?? {}), page: pageParam } as unknown as SdkEventsQuery),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.totalPages ? last.page + 1 : undefined),
    enabled: options?.enabled ?? true,
    placeholderData: keepPreviousData,
  });
}

export function useEventQuery(id: string | undefined) {
  return useQuery({
    queryKey: eventKeys.detail(id ?? ""),
    queryFn: () => publicSdk.events.getPublicEventById(id as string),
    enabled: Boolean(id),
  });
}

export function useCanRegisterQuery(id: string | undefined) {
  return useQuery({
    queryKey: eventKeys.canRegister(id ?? ""),
    queryFn: () => publicSdk.events.canRegister(id as string),
    enabled: Boolean(id),
  });
}

export const commentKeys = {
  /** Prefix key — every per-limit page cache for this event matches it. */
  list: (eventId: string) => ["events", "comments", eventId] as const,
  page: (eventId: string, limit: number) =>
    ["events", "comments", eventId, limit] as const,
};

type CommentsQueryArg = Parameters<typeof publicSdk.events.getComments>[1];

export function useEventCommentsQuery(
  eventId: string | undefined,
  query?: { limit?: number },
) {
  const limit = query?.limit ?? 50;
  return useQuery({
    // Keyed by (eventId, limit): "load more" grows the limit under a new key
    // while `keepPreviousData` keeps the current thread rendered. Optimistic
    // writes target the `commentKeys.list(eventId)` PREFIX (setQueriesData).
    queryKey: commentKeys.page(eventId ?? "", limit),
    queryFn: () => publicSdk.events.getComments(eventId as string, { limit } as CommentsQueryArg),
    enabled: Boolean(eventId),
    placeholderData: keepPreviousData,
  });
}

export function usePostCommentMutation(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateCommentBody) =>
      publicSdk.events.postComment(eventId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: commentKeys.list(eventId) });
    },
  });
}

// ── comment likes (optimistic toggle over the threaded forest) ────────────────
type LikeBody = Parameters<typeof publicSdk.events.likeComment>[2];

interface ForestNode {
  id: string;
  likesCount?: number;
  userLikeStatus?: boolean | null;
  replies?: ForestNode[];
}

/** Flip THIS comment's like in-place (immutably) anywhere in the reply forest. */
function flipLikeInForest<T extends ForestNode>(nodes: T[], commentId: string): T[] {
  return nodes.map((n) => {
    if (n.id === commentId) {
      const liked = n.userLikeStatus === true;
      const base = n.likesCount ?? 0;
      return { ...n, userLikeStatus: liked ? null : true, likesCount: Math.max(0, base + (liked ? -1 : 1)) };
    }
    if (n.replies && n.replies.length > 0) {
      return { ...n, replies: flipLikeInForest(n.replies, commentId) };
    }
    return n;
  });
}

export function useLikeCommentMutation(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) =>
      publicSdk.events.likeComment(eventId, commentId, { isLike: true } as LikeBody),
    onMutate: async (commentId: string) => {
      await qc.cancelQueries({ queryKey: commentKeys.list(eventId) });
      // Snapshot + patch EVERY cached page size for this event (prefix match),
      // so the optimistic flip lands no matter which limit is on screen.
      const prev = qc.getQueriesData({ queryKey: commentKeys.list(eventId) });
      qc.setQueriesData({ queryKey: commentKeys.list(eventId) }, (old: unknown) => {
        const list = old as { data?: ForestNode[] } | undefined;
        return list?.data ? { ...list, data: flipLikeInForest(list.data, commentId) } : old;
      });
      return { prev };
    },
    onError: (_e, _id, ctx) => {
      for (const [key, data] of ctx?.prev ?? []) qc.setQueryData(key, data);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: commentKeys.list(eventId) });
    },
  });
}

// ── saved events ("like" / bookmark) ─────────────────────────────────────────
export const savedKeys = {
  check: (eventId: string) => ["saved-events", "check", eventId] as const,
};

/** Is THIS event in the participant's saved list? (Bearer required.) */
export function useIsSavedQuery(
  eventId: string | undefined,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: savedKeys.check(eventId ?? ""),
    queryFn: () => accountSdk.savedEvents.checkSavedEvent(eventId as string),
    enabled: Boolean(eventId) && (options?.enabled ?? true),
  });
}

/** Toggle saved/unsaved with an optimistic flip so the heart reacts instantly. */
export function useToggleSaveMutation(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (currentlySaved: boolean) =>
      currentlySaved
        ? accountSdk.savedEvents.unsaveEvent(eventId)
        : accountSdk.savedEvents.saveEvent(eventId),
    onMutate: async (currentlySaved: boolean) => {
      await qc.cancelQueries({ queryKey: savedKeys.check(eventId) });
      const prev = qc.getQueryData(savedKeys.check(eventId));
      qc.setQueryData(savedKeys.check(eventId), { isSaved: !currentlySaved });
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev !== undefined) {
        qc.setQueryData(savedKeys.check(eventId), ctx.prev);
      }
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: savedKeys.check(eventId) });
    },
  });
}
