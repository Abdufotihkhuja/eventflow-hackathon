/**
 * API: комментарии к событиям (USER)
 * GET/POST /api/v1/events/:eventId/comments
 * PATCH/DELETE /api/v1/events/:eventId/comments/:id
 * POST /api/v1/events/:eventId/comments/:id/like
 */

import { apiGet, apiPost, apiPatch, apiDelete } from "../lib/apiClient";

// ============================================================================
// Types
// ============================================================================

export interface EventComment {
  id: string;
  eventId: string;
  userId: string | null;
  user?: { id: string; name: string; avatarUrl?: string };
  /** Когда комментарий оставлен от лица организации (ответ организатора события) */
  authorOrganization?: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  /** Сокращение: оставил ли комментарий организатор события */
  isOrganizerReply?: boolean;
  content: string;
  parentId?: string | null;
  likesCount?: number;
  dislikesCount?: number;
  isLiked?: boolean;
  createdAt: string;
  updatedAt?: string;
  replies?: EventComment[];
}

/** Ответ API: список в поле data */
export interface EventCommentsResponse {
  items: EventComment[];
  total: number;
  page: number;
  limit: number;
  totalPages?: number;
}

/** Сырой комментарий с бэкенда (data[].user: firstName/lastName, userLikeStatus) */
interface RawEventComment {
  id: string;
  eventId: string;
  userId: string | null;
  user?: {
    id: string;
    firstName?: string;
    lastName?: string;
    avatarUrl?: string | null;
  } | null;
  authorOrganizationId?: string | null;
  authorOrganization?: {
    id: string;
    companyName?: string;
    logoUrl?: string | null;
  } | null;
  content: string;
  parentId?: string | null;
  likesCount?: number;
  dislikesCount?: number;
  userLikeStatus?: "LIKED" | "DISLIKED" | null;
  createdAt: string;
  updatedAt?: string;
  replies?: RawEventComment[];
}

interface RawEventCommentsResponse {
  data: RawEventComment[];
  total: number;
  page: number;
  limit: number;
  totalPages?: number;
}

function normalizeComment(raw: RawEventComment): EventComment {
  const name = [raw.user?.firstName, raw.user?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  const isOrganizerReply = Boolean(raw.authorOrganizationId);
  return {
    id: raw.id,
    eventId: raw.eventId,
    userId: raw.userId ?? null,
    user: raw.user
      ? {
          id: raw.user.id,
          name: name || "Пользователь",
          avatarUrl: raw.user.avatarUrl ?? undefined,
        }
      : undefined,
    authorOrganization: raw.authorOrganization
      ? {
          id: raw.authorOrganization.id,
          name: raw.authorOrganization.companyName ?? "",
          avatarUrl: raw.authorOrganization.logoUrl ?? undefined,
        }
      : undefined,
    isOrganizerReply,
    content: raw.content,
    parentId: raw.parentId ?? undefined,
    likesCount: raw.likesCount ?? 0,
    dislikesCount: raw.dislikesCount ?? 0,
    isLiked:
      raw.userLikeStatus === "LIKED"
        ? true
        : raw.userLikeStatus === "DISLIKED"
          ? false
          : undefined,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    replies: raw.replies?.map(normalizeComment),
  };
}

function flattenReplies(
  raw: RawEventComment,
  parentId: string
): RawEventComment[] {
  const list: RawEventComment[] = [{ ...raw, parentId }];
  raw.replies?.forEach((reply) => {
    list.push(...flattenReplies(reply, raw.id));
  });
  return list;
}

function toFlatList(data: RawEventComment[]): RawEventComment[] {
  const isFlat = data.some((comment) => comment.parentId != null);
  if (isFlat) return data;

  const out: RawEventComment[] = [];
  data.forEach((comment) => {
    out.push(comment);
    comment.replies?.forEach((reply) => {
      out.push(...flattenReplies(reply, comment.id));
    });
  });

  return out;
}

export interface EventCommentsParams {
  page?: number;
  limit?: number;
}

export interface CreateEventCommentDto {
  content: string;
  parentId?: string;
}

export interface UpdateEventCommentDto {
  content: string;
}

export interface LikeCommentBody {
  isLike: boolean;
}

// ============================================================================
// Endpoints
// ============================================================================

const comments = (eventId: string) => `/api/v1/events/${eventId}/comments`;

// ============================================================================
// Query Keys
// ============================================================================

export const EVENT_COMMENTS_QUERY_KEYS = {
  all: ["event-comments"] as const,
  list: (eventId: string, params?: EventCommentsParams) =>
    [...EVENT_COMMENTS_QUERY_KEYS.all, eventId, params] as const,
} as const;

// ============================================================================
// Service
// ============================================================================

export const eventCommentsService = {
  getComments: async (
    eventId: string,
    params?: EventCommentsParams
  ): Promise<EventCommentsResponse> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    const query = searchParams.toString();
    const url = query ? `${comments(eventId)}?${query}` : comments(eventId);
    const raw = await apiGet<RawEventCommentsResponse>(url);
    const flat = toFlatList(raw.data);
    return {
      items: flat.map(normalizeComment),
      total: raw.total,
      page: raw.page,
      limit: raw.limit,
      totalPages: raw.totalPages,
    };
  },

  createComment: async (
    eventId: string,
    data: CreateEventCommentDto
  ): Promise<EventComment> => {
    return apiPost<EventComment>(comments(eventId), data);
  },

  updateComment: async (
    eventId: string,
    commentId: string,
    data: UpdateEventCommentDto
  ): Promise<EventComment> => {
    return apiPatch<EventComment>(`${comments(eventId)}/${commentId}`, data);
  },

  deleteComment: async (
    eventId: string,
    commentId: string
  ): Promise<{ message?: string }> => {
    return apiDelete(`${comments(eventId)}/${commentId}`);
  },

  likeComment: async (
    eventId: string,
    commentId: string,
    isLike: boolean
  ): Promise<{ likesCount?: number }> => {
    return apiPost(`${comments(eventId)}/${commentId}/like`, {
      isLike,
    });
  },
};
