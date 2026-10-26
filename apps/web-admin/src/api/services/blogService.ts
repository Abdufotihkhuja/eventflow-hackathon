/**
 * API сервис для работы с блогом
 * @module api/services/blogService
 */

import { apiClient } from "@api/apiClient";
import type {
  BlogPost,
  BlogPostsResponse,
  BlogPostsResponseApi,
  CheckBlogSlugResponse,
  CreateBlogPostDto,
  UpdateBlogPostDto,
  GetBlogPostsParams,
  GetPublishedBlogPostsParams,
  SuggestBlogSlugResponse,
  BlogComment,
  CommentsResponse,
  CreateCommentDto,
  UpdateCommentDto,
  GetCommentsParams,
  LikeCheckResponse,
  SaveCheckResponse,
} from "./blog.types";

/**
 * Сервис для управления статьями блога (для организаторов)
 */
export const blogPostsService = {
  /**
   * Создать новую статью блога
   */
  create: (data: CreateBlogPostDto) =>
    apiClient.post<BlogPost>("/api/v1/blog-posts", data),

  /**
   * Получить список статей организации (нормализует tags в плоский массив)
   */
  getAll: async (params?: GetBlogPostsParams) => {
    const res = await apiClient.get<BlogPostsResponseApi>("/api/v1/blog-posts", {
      params,
    });
    return {
      ...res,
      data: res.data.map((p) => ({
        ...p,
        tags: p.tags.map((t) => t.tag),
      })),
    } as BlogPostsResponse;
  },

  /**
   * Получить статью по ID
   */
  getById: (id: string) => apiClient.get<BlogPost>(`/api/v1/blog-posts/${id}`),

  /**
   * Обновить статью
   */
  update: (id: string, data: UpdateBlogPostDto) =>
    apiClient.patch<BlogPost>(`/api/v1/blog-posts/${id}`, data),

  /**
   * Удалить статью
   */
  delete: (id: string) => apiClient.delete(`/api/v1/blog-posts/${id}`),

  /**
   * Отправить статью на модерацию
   */
  submit: (id: string) =>
    apiClient.post<BlogPost>(`/api/v1/blog-posts/${id}/submit`),

  /**
   * Опубликовать одобренную статью
   */
  publish: (id: string) =>
    apiClient.post<BlogPost>(`/api/v1/blog-posts/${id}/publish`),

  /**
   * Снять статью с публикации
   */
  unpublish: (id: string) =>
    apiClient.post<BlogPost>(`/api/v1/blog-posts/${id}/unpublish`),

  /**
   * Предложить slug по заголовку (JWT, BLOG_READ). title до 500 символов, excludeId при редактировании.
   */
  suggestSlug: (params: { title: string; excludeId?: string }) =>
    apiClient.get<SuggestBlogSlugResponse>("/api/v1/blog-posts/suggest-slug", {
      params: {
        title: params.title.slice(0, 500),
        excludeId: params.excludeId,
      },
    }),

  /**
   * Проверить доступность slug (JWT, BLOG_READ). excludeId при редактировании.
   */
  checkSlug: (params: { slug: string; excludeId?: string }) =>
    apiClient.get<CheckBlogSlugResponse>("/api/v1/blog-posts/check-slug", {
      params: { slug: params.slug, excludeId: params.excludeId },
    }),
};

/**
 * Сервис для работы с опубликованными статьями (публичный доступ)
 */
export const publicBlogService = {
  /**
   * Получить список опубликованных статей
   */
  getAll: (params?: GetPublishedBlogPostsParams) =>
    apiClient.get<BlogPostsResponse>("/api/v1/blog", { params }),

  /**
   * Получить статью по slug (публично, без авторизации; увеличивает счётчик просмотров)
   */
  getBySlug: (slug: string) =>
    apiClient.get<BlogPost>(`/api/v1/blog/by-slug/${slug}`, { skipAuth: true }),

  /**
   * Получить статью по ID
   */
  getById: (id: string) => apiClient.get<BlogPost>(`/api/v1/blog/${id}`),
};

/**
 * Сервис для работы с комментариями
 */
export const blogCommentsService = {
  /**
   * Создать комментарий к статье
   */
  create: (postId: string, data: CreateCommentDto) =>
    apiClient.post<BlogComment>(`/api/v1/blog/${postId}/comments`, data),

  /**
   * Получить комментарии к статье
   */
  getAll: (postId: string, params?: GetCommentsParams) =>
    apiClient.get<CommentsResponse>(`/api/v1/blog/${postId}/comments`, { params }),

  /**
   * Обновить комментарий
   */
  update: (postId: string, commentId: string, data: UpdateCommentDto) =>
    apiClient.patch<BlogComment>(
      `/api/v1/blog/${postId}/comments/${commentId}`,
      data,
    ),

  /**
   * Удалить комментарий
   */
  delete: (postId: string, commentId: string) =>
    apiClient.delete(`/api/v1/blog/${postId}/comments/${commentId}`),

  /**
   * Лайкнуть/дизлайкнуть комментарий
   */
  toggleLike: (postId: string, commentId: string) =>
    apiClient.post(`/api/v1/blog/${postId}/comments/${commentId}/like`),
};

/**
 * Сервис для работы с лайками статей
 */
export const blogLikesService = {
  /**
   * Поставить лайк статье
   */
  like: (postId: string) => apiClient.post(`/api/v1/blog/${postId}/like`),

  /**
   * Убрать лайк со статьи
   */
  unlike: (postId: string) => apiClient.delete(`/api/v1/blog/${postId}/like`),

  /**
   * Проверить, лайкнул ли пользователь статью
   */
  check: (postId: string) =>
    apiClient.get<LikeCheckResponse>(`/api/v1/blog/${postId}/like/check`),
};

/**
 * Сервис для работы с сохранёнными статьями
 */
export const savedBlogPostsService = {
  /**
   * Получить список сохранённых статей
   */
  getAll: (params?: { page?: number; limit?: number }) =>
    apiClient.get<BlogPostsResponse>("/api/v1/account/me/saved-blog-posts", {
      params,
    }),

  /**
   * Сохранить статью
   */
  save: (postId: string) =>
    apiClient.post(`/api/v1/account/me/saved-blog-posts/${postId}`),

  /**
   * Удалить статью из сохранённых
   */
  unsave: (postId: string) =>
    apiClient.delete(`/api/v1/account/me/saved-blog-posts/${postId}`),

  /**
   * Проверить, сохранена ли статья
   */
  check: (postId: string) =>
    apiClient.get<SaveCheckResponse>(
      `/api/v1/account/me/saved-blog-posts/${postId}/check`,
    ),
};
