/**
 * Типы для работы с блогом
 * @module api/services/blog.types
 */

/**
 * Статусы статьи блога
 */
export type BlogPostStatus =
  | "DRAFT" // Черновик
  | "PENDING_REVIEW" // На модерации
  | "APPROVED" // Одобрено
  | "REJECTED" // Отклонено
  | "PUBLISHED"; // Опубликовано

/**
 * Варианты сортировки статей
 */
export type BlogSortBy =
  | "createdAt"
  | "publishedAt"
  | "likesCount"
  | "viewsCount";

/**
 * Порядок сортировки
 */
export type SortOrder = "asc" | "desc";

/**
 * Inline-элемент внутри блока (текст с опциональными стилями)
 */
export interface ContentInline {
  type: "text";
  text: string;
  styles?: { bold?: boolean; italic?: boolean };
}

/**
 * Пропсы блока контента (paragraph и др.)
 */
export interface ContentBlockProps {
  textColor?: string;
  textAlignment?: string;
  backgroundColor?: string;
}

/**
 * Блок контента (Tiptap JSON format, соответствует API)
 */
export interface ContentBlock {
  id: string;
  type: string;
  props?: ContentBlockProps;
  content: ContentInline[];
  children: ContentBlock[];
}

/**
 * Тег статьи
 */
export interface BlogTag {
  id: string;
  name: string;
  slug: string;
  category?: string;
  isSystem?: boolean;
  organizationId?: string;
  createdAt: string;
}

/**
 * Связь поста и тега в ответе API (GET /blog-posts)
 */
export interface BlogPostTagRelation {
  postId: string;
  tagId: string;
  tag: BlogTag;
}

/**
 * Автор статьи (пользователь)
 */
export interface BlogAuthor {
  id: string;
  name: string;
  avatar?: string;
  email?: string;
}

/**
 * Организация (автор статьи)
 */
export interface BlogOrganization {
  id: string;
  name: string;
  logoUrl?: string | null;
  email?: string;
}

/**
 * Статья блога (полная)
 */
export interface BlogPost {
  id: string;
  organizationId: string;
  title: string;
  slug: string;
  content: ContentBlock[];
  shortDescription?: string;
  coverImage?: string;
  status: BlogPostStatus;
  commentsEnabled: boolean;
  readingTime: number;
  viewsCount: number;
  likesCount: number;
  commentsCount: number;
  tags: BlogTag[];
  organization: BlogOrganization;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string | null;
  reviewedAt?: string | null;
  rejectionMessage?: string | null;
  // Флаги для текущего пользователя
  isLiked?: boolean;
  isSaved?: boolean;
}

/**
 * Статья блога (краткая версия для списков)
 */
export interface BlogPostPreview {
  id: string;
  organizationId: string;
  title: string;
  slug: string;
  shortDescription?: string;
  coverImage?: string;
  status: BlogPostStatus;
  commentsEnabled: boolean;
  readingTime: number;
  viewsCount: number;
  likesCount: number;
  commentsCount: number;
  tags: BlogTag[];
  organization: BlogOrganization;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string | null;
  reviewedAt?: string | null;
  rejectionMessage?: string | null;
  isLiked?: boolean;
  isSaved?: boolean;
}

/** Ответ GET /blog-posts/suggest-slug */
export interface SuggestBlogSlugResponse {
  slug: string;
}

/** Ответ GET /blog-posts/check-slug */
export interface CheckBlogSlugResponse {
  available: boolean;
}

/**
 * DTO для создания статьи
 */
export interface CreateBlogPostDto {
  title: string;
  slug?: string;
  content: ContentBlock[];
  shortDescription?: string;
  coverImage?: string;
  commentsEnabled?: boolean;
  tagIds?: string[];
}

/**
 * DTO для обновления статьи
 */
export interface UpdateBlogPostDto {
  title?: string;
  slug?: string;
  content?: ContentBlock[];
  shortDescription?: string;
  coverImage?: string;
  commentsEnabled?: boolean;
  tagIds?: string[];
}

/**
 * Параметры запроса списка статей (для организатора)
 */
export interface GetBlogPostsParams {
  page?: number;
  limit?: number;
  search?: string;
  tagId?: string;
  sortBy?: BlogSortBy;
  sortOrder?: SortOrder;
  status?: BlogPostStatus;
}

/**
 * Параметры запроса списка опубликованных статей
 */
export interface GetPublishedBlogPostsParams {
  page?: number;
  limit?: number;
  search?: string;
  tagId?: string;
  sortBy?: BlogSortBy;
  sortOrder?: SortOrder;
  organizationId?: string;
}

/**
 * Элемент списка статей в ответе API (tags — связь с тегом)
 */
export interface BlogPostListItemApi
  extends Omit<BlogPostPreview, "tags"> {
  tags: BlogPostTagRelation[];
}

/**
 * Сырой ответ GET /blog-posts (до нормализации tags)
 */
export interface BlogPostsResponseApi {
  data: BlogPostListItemApi[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Ответ со списком статей (пагинация, после нормализации)
 */
export interface BlogPostsResponse {
  data: BlogPostPreview[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Комментарий к статье
 */
export interface BlogComment {
  id: string;
  content: string;
  author: BlogAuthor;
  likesCount: number;
  isLiked: boolean;
  createdAt: string;
  updatedAt: string;
  postId: string;
}

/**
 * DTO для создания комментария
 */
export interface CreateCommentDto {
  content: string;
}

/**
 * DTO для обновления комментария
 */
export interface UpdateCommentDto {
  content: string;
}

/**
 * Параметры запроса комментариев
 */
export interface GetCommentsParams {
  page?: number;
  limit?: number;
  sortOrder?: SortOrder;
}

/**
 * Ответ со списком комментариев
 */
export interface CommentsResponse {
  data: BlogComment[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Ответ на проверку лайка
 */
export interface LikeCheckResponse {
  isLiked: boolean;
}

/**
 * Ответ на проверку сохранения
 */
export interface SaveCheckResponse {
  isSaved: boolean;
}
