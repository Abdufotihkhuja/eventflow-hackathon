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

export type BusinessLocale = "ru" | "uz" | "en";

export type BusinessTranslationValues = Record<string, Partial<Record<BusinessLocale, string>>>;

export type BusinessTranslationMeta = Record<
  string,
  Partial<
    Record<
      BusinessLocale,
      {
        status:
          | "empty"
          | "manual"
          | "auto_translated"
          | "edited_after_translation"
          | "outdated"
          | "translation_error";
        sourceLocale?: BusinessLocale;
        sourceHash?: string;
        provider?: "tahrirchi";
        model?: string;
        translatedAt?: string;
        error?: string;
      }
    >
  >
>;

export type RichTranslations = Record<string, Partial<Record<BusinessLocale, ContentBlock[]>>>;

export type RichTranslationMeta = Record<
  string,
  Partial<
    Record<
      BusinessLocale,
      {
        status:
          | "empty"
          | "manual"
          | "auto_translated"
          | "edited_after_translation"
          | "outdated"
          | "translation_error";
        sourceLocale?: BusinessLocale;
        sourceHash?: string;
        structureHash?: string;
        provider?: "tahrirchi";
        model?: string;
        translatedAt?: string;
        error?: string | null;
      }
    >
  >
>;

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
 * Категория блога (глобальная таксономия, управляется супер-админом)
 */
export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  translations?: BusinessTranslationValues | null;
  sortOrder?: number;
  isActive?: boolean;
  /** Количество опубликованных статей (только в публичном ответе) */
  postsCount?: number;
  _count?: { posts: number };
}

/**
 * Категория в составе статьи (GET /blog-posts/:id, GET /blog)
 */
export interface BlogPostCategoryRelation {
  id: string;
  name: string;
  slug: string;
  translations?: BusinessTranslationValues | null;
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
  translations?: BusinessTranslationValues | null;
  translationMeta?: BusinessTranslationMeta | null;
  richTranslations?: RichTranslations | null;
  richTranslationMeta?: RichTranslationMeta | null;
  coverImage?: string;
  categoryId?: string | null;
  category?: BlogPostCategoryRelation | null;
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
  translations?: BusinessTranslationValues | null;
  translationMeta?: BusinessTranslationMeta | null;
  richTranslations?: RichTranslations | null;
  richTranslationMeta?: RichTranslationMeta | null;
  coverImage?: string;
  categoryId?: string | null;
  category?: BlogPostCategoryRelation | null;
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
  translations?: BusinessTranslationValues;
  translationMeta?: BusinessTranslationMeta;
  richTranslations?: RichTranslations;
  richTranslationMeta?: RichTranslationMeta;
  coverImage?: string;
  commentsEnabled?: boolean;
  tagIds?: string[];
  categoryId?: string | null;
}

/**
 * DTO для обновления статьи
 */
export interface UpdateBlogPostDto {
  title?: string;
  slug?: string;
  content?: ContentBlock[];
  shortDescription?: string;
  translations?: BusinessTranslationValues;
  translationMeta?: BusinessTranslationMeta;
  richTranslations?: RichTranslations;
  richTranslationMeta?: RichTranslationMeta;
  coverImage?: string;
  commentsEnabled?: boolean;
  tagIds?: string[];
  categoryId?: string | null;
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
 * Сырой ответ GET /blog-posts/:id (tags — связь с тегом, до нормализации)
 */
export interface BlogPostApi extends Omit<BlogPost, "tags"> {
  tags: BlogPostTagRelation[];
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
