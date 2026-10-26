/**
 * @module shared/api/blogInteractionsService
 * @description API сервис для взаимодействия с блогом (лайки, сохранения)
 *
 * Endpoints:
 * Blog Likes:
 * - POST /api/v1/blog/{postId}/like - Поставить лайк
 * - DELETE /api/v1/blog/{postId}/like - Убрать лайк
 * - GET /api/v1/blog/{postId}/like/check - Проверить лайк
 *
 * Saved Blog Posts:
 * - GET /api/v1/account/me/saved-blog-posts - Получить сохранённые
 * - POST /api/v1/account/me/saved-blog-posts/{postId} - Сохранить
 * - DELETE /api/v1/account/me/saved-blog-posts/{postId} - Удалить из сохранённых
 * - GET /api/v1/account/me/saved-blog-posts/{postId}/check - Проверить сохранение
 */

/* eslint-disable import/no-restricted-paths */
import type { BlogPost } from "@/entities/blog/model/types";
/* eslint-enable import/no-restricted-paths */

import { apiDelete, apiGet, apiPost } from "../lib/apiClient";
import { accountSdk } from "./sdk";

import { adaptPostFromRaw, type ApiBlogPostRaw } from "./blogService";

// ============================================================================
// Endpoints
// ============================================================================

const BLOG_INTERACTIONS_ENDPOINTS = {
  // Likes
  LIKE: (postId: string) => `/api/v1/blog/${postId}/like`,
  CHECK_LIKE: (postId: string) => `/api/v1/blog/${postId}/like/check`,
} as const;

// ============================================================================
// Types
// ============================================================================

/** Ответ API на проверку лайка (поля бэкенда) */
interface CheckLikeApiResponse {
  liked?: boolean;
  likesCount?: number;
}

/** Ответ на проверку лайка (нормализованный для UI) */
export interface CheckLikeResponse {
  isLiked: boolean;
  likesCount: number;
}

/** Ответ на действие лайка */
export interface LikeResponse {
  success: boolean;
  likesCount: number;
}

/** Ответ API на проверку сохранения (поля бэкенда) */
interface CheckSavedApiResponse {
  saved?: boolean;
}

/** Ответ на проверку сохранения (нормализованный для UI) */
export interface CheckSavedResponse {
  isSaved: boolean;
}

/** Ответ на действие сохранения */
export interface SavePostResponse {
  success: boolean;
  savedAt?: string;
}

/** Элемент списка сохранённых постов (API: data[].post + savedAt) */
export interface SavedBlogPostItem {
  post: BlogPost;
  savedAt: string;
}

/** Сырой элемент ответа GET /api/v1/account/me/saved-blog-posts */
interface ApiSavedBlogPostRow {
  id: string;
  postId: string;
  savedAt: string;
  post: ApiBlogPostRaw;
}

/** Ответ API GET /api/v1/account/me/saved-blog-posts */
interface ApiSavedBlogPostsResponse {
  data: ApiSavedBlogPostRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** Параметры запроса сохранённых статей */
export interface GetSavedPostsParams {
  page?: number;
  limit?: number;
}

/** Ответ списка сохранённых постов блога */
export interface SavedBlogPostsResponse {
  items: SavedBlogPostItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** @deprecated Используйте SavedBlogPostItem */
export type SavedBlogPost = SavedBlogPostItem;

// ============================================================================
// Query Keys
// ============================================================================

export const BLOG_INTERACTIONS_QUERY_KEYS = {
  all: ["blog-interactions"] as const,

  // Likes
  likes: () => [...BLOG_INTERACTIONS_QUERY_KEYS.all, "likes"] as const,
  checkLike: (postId: string) =>
    [...BLOG_INTERACTIONS_QUERY_KEYS.likes(), "check", postId] as const,

  // Saved
  saved: () => [...BLOG_INTERACTIONS_QUERY_KEYS.all, "saved"] as const,
  savedList: (params?: GetSavedPostsParams) =>
    [...BLOG_INTERACTIONS_QUERY_KEYS.saved(), "list", params] as const,
  checkSaved: (postId: string) =>
    [...BLOG_INTERACTIONS_QUERY_KEYS.saved(), "check", postId] as const,
} as const;

// ============================================================================
// Service
// ============================================================================

export const blogInteractionsService = {
  // ========== Likes ==========

  /**
   * Поставить лайк статье
   * POST /api/v1/blog/{postId}/like
   * Требует авторизации
   */
  likePost: async (postId: string): Promise<LikeResponse> => {
    return apiPost<LikeResponse>(BLOG_INTERACTIONS_ENDPOINTS.LIKE(postId));
  },

  /**
   * Убрать лайк со статьи
   * DELETE /api/v1/blog/{postId}/like
   * Требует авторизации
   */
  unlikePost: async (postId: string): Promise<LikeResponse> => {
    return apiDelete<LikeResponse>(BLOG_INTERACTIONS_ENDPOINTS.LIKE(postId));
  },

  /**
   * Проверить, лайкнул ли пользователь статью
   * GET /api/v1/blog/{postId}/like/check
   * API возвращает { liked: boolean, likesCount?: number }
   */
  checkLike: async (postId: string): Promise<CheckLikeResponse> => {
    const raw = await apiGet<CheckLikeApiResponse>(
      BLOG_INTERACTIONS_ENDPOINTS.CHECK_LIKE(postId)
    );
    let likesCount: number;
    if (typeof raw.likesCount === "number") {
      likesCount = raw.likesCount;
    } else if (raw.liked) {
      likesCount = 1;
    } else {
      likesCount = 0;
    }
    return { isLiked: raw.liked ?? false, likesCount };
  },

  // ========== Saved Posts ==========

  /**
   * Получить сохранённые статьи
   * GET /api/v1/account/me/saved-blog-posts
   * Требует авторизации
   */
  getSavedPosts: async (
    params?: GetSavedPostsParams
  ): Promise<SavedBlogPostsResponse> => {
    const raw = (await accountSdk.savedBlogPosts.getSavedPosts(
      params
    )) as ApiSavedBlogPostsResponse;
    return {
      items: raw.data.map((row) => ({
        post: adaptPostFromRaw(row.post),
        savedAt: row.savedAt,
      })),
      total: raw.total,
      page: raw.page,
      limit: raw.limit,
      totalPages: raw.totalPages,
    };
  },

  /**
   * Сохранить статью
   * POST /api/v1/account/me/saved-blog-posts/{postId}
   * Требует авторизации
   */
  savePost: async (postId: string): Promise<SavePostResponse> => {
    return accountSdk.savedBlogPosts.savePost(
      postId
    ) as Promise<SavePostResponse>;
  },

  /**
   * Удалить статью из сохранённых
   * DELETE /api/v1/account/me/saved-blog-posts/{postId}
   * Требует авторизации
   */
  unsavePost: async (postId: string): Promise<SavePostResponse> => {
    return accountSdk.savedBlogPosts.unsavePost(
      postId
    ) as Promise<SavePostResponse>;
  },

  /**
   * Проверить, сохранена ли статья
   * GET /api/v1/account/me/saved-blog-posts/{postId}/check
   * API возвращает { saved: boolean }
   */
  checkSaved: async (postId: string): Promise<CheckSavedResponse> => {
    const raw = (await accountSdk.savedBlogPosts.checkSavedPost(
      postId
    )) as CheckSavedApiResponse;
    return { isSaved: raw.saved ?? false };
  },
};
