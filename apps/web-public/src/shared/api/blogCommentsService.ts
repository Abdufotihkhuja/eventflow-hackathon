/**
 * API: комментарии к статьям блога (USER)
 * GET/POST /api/v1/blog/:postId/comments
 * PATCH/DELETE /api/v1/blog/:postId/comments/:commentId
 * POST /api/v1/blog/:postId/comments/:commentId/like
 */

import { apiGet, apiPost, apiPatch, apiDelete } from "../lib/apiClient";
import { resolveAvatarUrl } from "../lib/utils";

// ============================================================================
// Types (нормализованные для UI)
// ============================================================================

export interface BlogComment {
  id: string;
  postId: string;
  userId: string;
  user?: { id: string; name: string; avatarUrl?: string };
  content: string;
  parentId?: string | null;
  likesCount?: number;
  dislikesCount?: number;
  isLiked?: boolean;
  createdAt: string;
  updatedAt?: string;
  replies?: BlogComment[];
}

export interface BlogCommentsResponse {
  items: BlogComment[];
  total: number;
  page: number;
  limit: number;
  totalPages?: number;
}

// ============================================================================
// Types (сырой ответ API)
// ============================================================================

export interface BlogCommentRawUser {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
}

/** Формат элемента в data[]: корневые с parentId: null, вложенные — в replies[] (рекурсивно до 4 уровней) */
export interface BlogCommentRaw {
  id: string;
  postId: string;
  userId: string;
  parentId: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
  user?: BlogCommentRawUser;
  replies?: BlogCommentRaw[];
  _count?: { replies?: number; likes?: number };
  likesCount?: number;
  dislikesCount?: number;
  userLike?: { isLike: boolean } | null;
}

export interface BlogCommentsResponseRaw {
  data: BlogCommentRaw[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface BlogCommentsParams {
  page?: number;
  limit?: number;
}

export interface CreateBlogCommentDto {
  content: string;
  parentId?: string;
}

export interface UpdateBlogCommentDto {
  content: string;
}

// ============================================================================
// Endpoints
// ============================================================================

const comments = (postId: string) => `/api/v1/blog/${postId}/comments`;

// ============================================================================
// Query Keys
// ============================================================================

export const BLOG_COMMENTS_QUERY_KEYS = {
  all: ["blog-comments"] as const,
  list: (postId: string, params?: BlogCommentsParams) =>
    [...BLOG_COMMENTS_QUERY_KEYS.all, postId, params] as const,
} as const;

// ============================================================================
// Adapter: сырой ответ API -> нормализованный для UI
// ============================================================================

function adaptBlogComment(raw: BlogCommentRaw): BlogComment {
  const name = raw.user
    ? [raw.user.firstName, raw.user.lastName]
        .filter(Boolean)
        .join(" ")
        .trim() || "Пользователь"
    : "Пользователь";
  return {
    id: raw.id,
    postId: raw.postId,
    userId: raw.userId,
    user: raw.user
      ? {
          id: raw.user.id,
          name,
          avatarUrl: resolveAvatarUrl(raw.user.avatarUrl) ?? undefined,
        }
      : undefined,
    content: raw.content,
    parentId: raw.parentId,
    likesCount: raw.likesCount ?? 0,
    dislikesCount: raw.dislikesCount ?? 0,
    isLiked: raw.userLike?.isLike,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

/** Разворачивает вложенные replies в плоский список с проставленным parentId */
function flattenReplies(
  raw: BlogCommentRaw,
  parentId: string
): BlogCommentRaw[] {
  const list: BlogCommentRaw[] = [{ ...raw, parentId }];
  raw.replies?.forEach((r) => list.push(...flattenReplies(r, raw.id)));
  return list;
}

/** Если API вернул вложенные replies — разворачивает в плоский список; иначе возвращает data как есть */
function toFlatList(data: BlogCommentRaw[]): BlogCommentRaw[] {
  const isFlat = data.some((c) => c.parentId != null);
  if (isFlat) return data;
  const out: BlogCommentRaw[] = [];
  data.forEach((c) => {
    out.push(c);
    c.replies?.forEach((r) => out.push(...flattenReplies(r, c.id)));
  });
  return out;
}

// ============================================================================
// Service
// ============================================================================

export const blogCommentsService = {
  getComments: async (
    postId: string,
    params?: BlogCommentsParams
  ): Promise<BlogCommentsResponse> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    const query = searchParams.toString();
    const url = query ? `${comments(postId)}?${query}` : comments(postId);
    const raw = await apiGet<BlogCommentsResponseRaw>(url, { skipAuth: true });
    const flat = toFlatList(raw.data);
    return {
      items: flat.map(adaptBlogComment),
      total: raw.total,
      page: raw.page,
      limit: raw.limit,
      totalPages: raw.totalPages,
    };
  },

  createComment: async (
    postId: string,
    data: CreateBlogCommentDto
  ): Promise<BlogComment> => {
    return apiPost<BlogComment>(comments(postId), data);
  },

  updateComment: async (
    postId: string,
    commentId: string,
    data: UpdateBlogCommentDto
  ): Promise<BlogComment> => {
    return apiPatch<BlogComment>(`${comments(postId)}/${commentId}`, data);
  },

  deleteComment: async (
    postId: string,
    commentId: string
  ): Promise<{ message?: string }> => {
    return apiDelete(`${comments(postId)}/${commentId}`);
  },

  likeComment: async (
    postId: string,
    commentId: string,
    isLike: boolean
  ): Promise<{ likesCount?: number }> => {
    return apiPost(`${comments(postId)}/${commentId}/like`, {
      isLike,
    });
  },
};
