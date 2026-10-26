/**
 * Event comments (org session) — the mobile half of the web cabinet's
 * «Комментарии».
 *
 * The organizer's job here is moderation and answering: read the thread, reply
 * as the organization, edit or delete what shouldn't stand. The API returns a
 * tree (`replies` nested inside each comment) and the author is EITHER a user
 * or an organization — `authorOrganizationId` is what marks a reply as coming
 * from the event's own team, and that badge is the whole reason a guest trusts
 * the answer.
 *
 * Comments only exist when the event has them enabled; the screen says so
 * rather than showing an input that would 400.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiTransport } from "@shared/api";

export interface CommentAuthorUser {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
}

export interface CommentAuthorOrg {
  id: string;
  companyName?: string | null;
  name?: string | null;
  logoUrl?: string | null;
}

export interface EventComment {
  id: string;
  content: string;
  eventId: string;
  userId: string | null;
  authorOrganizationId: string | null;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  user?: CommentAuthorUser | null;
  authorOrganization?: CommentAuthorOrg | null;
  likesCount?: number;
  replies?: EventComment[];
}

export const commentKeys = {
  all: ["event-comments"] as const,
  list: (eventId: string) => ["event-comments", eventId] as const,
};

function listOf(raw: unknown): EventComment[] {
  if (Array.isArray(raw)) return raw as EventComment[];
  const data = (raw as { data?: unknown } | null)?.data;
  return Array.isArray(data) ? (data as EventComment[]) : [];
}

/** Shared with the section rail's badge — same cache entry, no second fetch. */
export async function fetchEventComments(eventId: string): Promise<EventComment[]> {
  return listOf(await apiTransport({ method: "GET", url: `/api/v1/events/${eventId}/comments?limit=100` }));
}

export function useEventCommentsQuery(eventId: string | undefined) {
  return useQuery({
    queryKey: commentKeys.list(eventId ?? ""),
    queryFn: () => fetchEventComments(eventId ?? ""),
    enabled: Boolean(eventId),
  });
}

export function useCreateCommentMutation(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { content: string; parentId?: string }) =>
      apiTransport({ method: "POST", url: `/api/v1/events/${eventId}/comments`, data: input }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: commentKeys.list(eventId) }),
  });
}

export function useUpdateCommentMutation(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      apiTransport({ method: "PATCH", url: `/api/v1/events/${eventId}/comments/${id}`, data: { content } }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: commentKeys.list(eventId) }),
  });
}

export function useDeleteCommentMutation(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiTransport({ method: "DELETE", url: `/api/v1/events/${eventId}/comments/${id}` }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: commentKeys.list(eventId) }),
  });
}

export function commentAuthorName(c: EventComment): string {
  if (c.authorOrganization) {
    return (c.authorOrganization.companyName ?? c.authorOrganization.name ?? "").trim() || "—";
  }
  const u = c.user;
  return [u?.firstName, u?.lastName].filter(Boolean).join(" ").trim() || "—";
}

/** Flatten the tree into rows the list can render, keeping reply depth so the
 *  thread still reads as a thread. Depth is capped at 1 — a phone column has no
 *  room for a third indent, and the API does not nest deeper in practice. */
export function flattenThread(comments: EventComment[]): { comment: EventComment; depth: 0 | 1 }[] {
  const out: { comment: EventComment; depth: 0 | 1 }[] = [];
  for (const c of comments) {
    out.push({ comment: c, depth: 0 });
    for (const r of c.replies ?? []) out.push({ comment: r, depth: 1 });
  }
  return out;
}
