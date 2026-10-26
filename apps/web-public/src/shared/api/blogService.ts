/**
 * @module shared/api/blogService
 * @description API сервис для работы с блог-статьями
 * Endpoints согласно EventFlow Swagger API v1:
 * - GET /api/v1/blog - список статей
 * - GET /api/v1/blog/{slug} - статья по slug
 * - GET /api/v1/blog/featured - featured статьи
 * - GET /api/v1/blog/categories - категории
 */

/* eslint-disable import/no-restricted-paths */
import type {
  BlogPost,
  BlogFilters,
  BlogListResponse,
  BlogPostCategory,
  BlogCategoryTranslations,
  BlogTag,
  BlogAuthor,
} from "@/entities/blog/model/types";
/* eslint-enable import/no-restricted-paths */

import { apiGet, getAuthToken } from "../lib/apiClient";
import { resolveMediaUrl } from "../lib/utils";

// ============================================================================
// API Types (согласно Swagger)
// ============================================================================

/** Категория блога (из API, динамическая таксономия) */
export interface ApiBlogCategory {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  translations?: BlogCategoryTranslations | null;
  sortOrder?: number;
  isActive?: boolean;
  /** Количество опубликованных статей (поле _count.posts на бэкенде) */
  _count?: { posts: number };
  postsCount?: number;
}

/** Автор статьи (из API) */
export interface ApiBlogAuthor {
  id: string;
  name: string;
  avatarUrl?: string;
  bio?: string;
  position?: string;
  articlesCount?: number;
  socialLinks?: {
    linkedin?: string;
    instagram?: string;
    facebook?: string;
  };
}

/** Статья блога (из API) */
export interface ApiBlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  coverImageUrl?: string;
  category?: ApiBlogPostCategory | null;
  tags?: string[];
  author: ApiBlogAuthor;
  publishedAt: string;
  updatedAt?: string;
  readingTime?: number;
  isFeatured?: boolean;
  isTrending?: boolean;
  viewsCount?: number;
  likesCount?: number;
}

/** Параметры запроса списка статей (документация FRONTEND_BLOG_AND_ARTICLES_API) */
export interface ApiBlogParams {
  page?: number;
  limit?: number;
  search?: string;
  tagId?: string;
  tagIds?: string[];
  sortBy?:
    | "createdAt"
    | "publishedAt"
    | "likesCount"
    | "viewsCount"
    | "readingTime";
  sortOrder?: "asc" | "desc";
  organizationId?: string;
  categoryId?: string;
  publishedAfter?: string;
  publishedBefore?: string;
  minReadingTime?: number;
  maxReadingTime?: number;
  locale?: "ru" | "uz" | "en";
}

/** Ответ списка статей (из API) */
export interface ApiBlogListResponse {
  data: ApiBlogPost[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ---------------------------------------------------------------------------
// Фактический формат ответа API (GET /api/v1/blog) — отличается от Swagger
// ---------------------------------------------------------------------------

/** Блок контента статьи (EditorJS-подобная структура) */
export interface ApiBlogContentBlock {
  id: string;
  type: string;
  props?: Record<string, unknown>;
  content?: Array<{
    text?: string;
    type?: string;
    styles?: Record<string, unknown>;
  }>;
  children?: unknown[];
}

/** Организация в ответе API (вместо author) */
export interface ApiBlogOrganization {
  id: string;
  name: string;
  logoUrl: string | null;
}

/**
 * Explicit byline author (Person). Returned by the public API when the post
 * has `authorId` set on it. When present, the public web app emits
 * `BlogPosting.author = Person` JSON-LD for E-E-A-T; when null/absent it
 * falls back to the Organization byline.
 */
export interface ApiBlogPersonAuthor {
  id: string;
  name: string;
  avatarUrl: string | null;
  bio: string | null;
}

/** Категория в составе статьи (relation на бэкенде) */
export interface ApiBlogPostCategory {
  id: string;
  slug: string;
  name: string;
  translations?: BlogCategoryTranslations | null;
}

/** Элемент списка статей в реальном ответе API */
export interface ApiBlogPostRaw {
  id: string;
  organizationId: string;
  title: string;
  slug: string;
  content: ApiBlogContentBlock[];
  shortDescription: string;
  coverImage: string;
  categoryId?: string | null;
  category?: ApiBlogPostCategory | null;
  status: string;
  commentsEnabled: boolean;
  readingTime: number;
  rejectionMessage: string | null;
  reviewedAt: string | null;
  publishedAt: string;
  likesCount: number;
  commentsCount: number;
  viewsCount: number;
  createdAt: string;
  updatedAt: string;
  organization?: ApiBlogOrganization;
  /** Optional Person byline. Null when post falls back to Organization author. */
  author?: ApiBlogPersonAuthor | null;
  /**
   * Backend returns the Prisma `BlogPostTagAssignment[]` shape
   * (`{ postId, tagId, tag: { id, name, slug } }`). String / `{id,name}`
   * forms are accepted defensively in case the response is flattened.
   */
  tags?:
    | string[]
    | { id: string; name: string; slug?: string }[]
    | {
        postId?: string;
        tagId?: string;
        tag: { id: string; name: string; slug?: string };
      }[];
  /** При JWT для USER приходит с бэкенда */
  saved?: boolean;
}

/** Ответ списка статей в реальном формате API */
export interface ApiBlogListResponseRaw {
  data: ApiBlogPostRaw[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** Категория блога (из API) */
export interface ApiBlogCategoryInfo {
  id: string;
  slug: string;
  name: string;
  description?: string;
  postsCount: number;
}

interface BlogListFetchOptions extends ApiBlogParams {
  limit?: number;
}

// ============================================================================
// Endpoints
// ============================================================================

const BLOG_ENDPOINTS = {
  LIST: "/api/v1/blog",
  /** Статья по slug (публичный URL) */
  BY_SLUG: (slug: string) => `/api/v1/blog/by-slug/${slug}`,
  /** Статья по UUID (для внутренних/админских вызовов) */
  DETAIL: (id: string) => `/api/v1/blog/${id}`,
  /** Динамические категории блога (глобальная таксономия) */
  CATEGORIES: "/api/v1/blog-categories",
} as const;

// ============================================================================
// Query Keys для TanStack Query
// ============================================================================

export const BLOG_QUERY_KEYS = {
  all: ["blog"] as const,
  lists: () => [...BLOG_QUERY_KEYS.all, "list"] as const,
  list: (params?: ApiBlogParams) =>
    [...BLOG_QUERY_KEYS.lists(), params] as const,
  featured: () => [...BLOG_QUERY_KEYS.all, "featured"] as const,
  trending: () => [...BLOG_QUERY_KEYS.all, "trending"] as const,
  details: () => [...BLOG_QUERY_KEYS.all, "detail"] as const,
  detail: (slug: string) => [...BLOG_QUERY_KEYS.details(), slug] as const,
  categories: () => [...BLOG_QUERY_KEYS.all, "categories"] as const,
  related: (postId: string) =>
    [...BLOG_QUERY_KEYS.all, "related", postId] as const,
} as const;

// ============================================================================
// Adapters (API -> UI)
// ============================================================================

/** Адаптер: relation категории API -> UI объект категории */
function adaptPostCategory(
  category: ApiBlogPostCategory | null | undefined,
): BlogPostCategory | null {
  if (!category) return null;
  return {
    id: category.id,
    slug: category.slug,
    name: category.name,
    translations: category.translations ?? null,
  };
}

/** Получить URL обложки статьи */
function getCoverImageUrl(url?: string): string {
  if (!url) return "/images/blog-banner.jpg";
  return resolveMediaUrl(url) ?? "/images/blog-banner.jpg";
}

/** Адаптер: API автор -> UI автор */
function adaptAuthor(apiAuthor: ApiBlogAuthor): BlogAuthor {
  return {
    id: apiAuthor.id,
    name: apiAuthor.name,
    avatar: resolveMediaUrl(apiAuthor.avatarUrl) ?? undefined,
    bio: apiAuthor.bio,
    role: apiAuthor.position,
    articlesCount: apiAuthor.articlesCount,
    socialLinks: apiAuthor.socialLinks,
  };
}

/** Адаптер: API статья -> UI статья */
function adaptPost(apiPost: ApiBlogPost): BlogPost {
  return {
    id: apiPost.id,
    slug: apiPost.slug,
    title: apiPost.title,
    excerpt: apiPost.excerpt,
    content: apiPost.content,
    coverImage: getCoverImageUrl(apiPost.coverImageUrl),
    category: adaptPostCategory(apiPost.category),
    tags: (apiPost.tags || []) as BlogTag[],
    author: adaptAuthor(apiPost.author),
    publishedAt: apiPost.publishedAt,
    updatedAt: apiPost.updatedAt,
    readTime: apiPost.readingTime || 5,
    featured: apiPost.isFeatured,
    trending: apiPost.isTrending,
  };
}

/** Извлечь текст из блоков контента для времени чтения */
function extractTextFromContentBlocks(
  blocks: ApiBlogContentBlock[] | undefined
): string {
  if (!blocks?.length) return "";
  return blocks
    .flatMap((b) => b.content ?? [])
    .map((c) => c.text ?? "")
    .filter(Boolean)
    .join(" ");
}

function resolveCoverImage(coverImage: string | undefined): string {
  if (!coverImage) return "/images/blog-banner.jpg";
  return resolveMediaUrl(coverImage) ?? "/images/blog-banner.jpg";
}

function resolveAuthor(
  org: ApiBlogOrganization | undefined,
  person: ApiBlogPersonAuthor | null | undefined,
): BlogAuthor {
  // Prefer explicit Person byline when set — its presence is what flips the
  // public site from `BlogPosting.author = Organization` to Person JSON-LD.
  if (person) {
    return {
      id: person.id,
      name: person.name,
      avatar: resolveMediaUrl(person.avatarUrl) ?? undefined,
      bio: person.bio ?? undefined,
      type: "Person",
    };
  }
  if (!org) return { id: "", name: "Eventflow", type: "Organization" };
  const avatar = resolveMediaUrl(org.logoUrl) ?? undefined;
  return { id: org.id, name: org.name, avatar, type: "Organization" };
}

function resolveTags(rawTags: ApiBlogPostRaw["tags"]): BlogTag[] {
  if (!Array.isArray(rawTags)) return [];
  const resolved = rawTags
    .map((t): string | null => {
      if (typeof t === "string") return t;
      if (t && typeof t === "object") {
        if ("tag" in t && t.tag) return t.tag.slug ?? t.tag.name ?? null;
        if ("slug" in t && t.slug) return t.slug;
        if ("name" in t && t.name) return t.name;
      }
      return null;
    })
    .filter((t): t is string => Boolean(t));
  return resolved as BlogTag[];
}

/** Адаптер: сырой элемент API (реальный формат) -> UI статья (экспорт для saved-blog-posts) */
export function adaptPostFromRaw(raw: ApiBlogPostRaw): BlogPost {
  const contentText =
    extractTextFromContentBlocks(raw.content) || raw.shortDescription || "";
  return {
    id: raw.id,
    slug: raw.slug,
    title: raw.title,
    excerpt: raw.shortDescription ?? "",
    content: contentText,
    contentBlocks:
      raw.content?.length > 0
        ? (raw.content as BlogPost["contentBlocks"])
        : undefined,
    coverImage: resolveCoverImage(raw.coverImage),
    category: adaptPostCategory(raw.category),
    tags: resolveTags(raw.tags),
    author: resolveAuthor(raw.organization, raw.author),
    publishedAt: raw.publishedAt,
    updatedAt: raw.updatedAt,
    readTime: raw.readingTime ?? 1,
    featured: false,
    trending: false,
    viewsCount: raw.viewsCount,
    commentsCount: raw.commentsCount,
    commentsEnabled: raw.commentsEnabled ?? false,
    organizationId: raw.organizationId || raw.organization?.id,
    saved: raw.saved,
  };
}

/** Адаптер: API ответ списка -> UI ответ (экспорт для тестов/расширения) */
function _adaptListResponse(
  apiResponse: ApiBlogListResponse
): BlogListResponse {
  return {
    posts: apiResponse.data.map(adaptPost),
    total: apiResponse.total,
    page: apiResponse.page,
    pageSize: apiResponse.limit,
  };
}

/** Адаптер: сырой ответ списка API -> UI ответ */
function adaptListResponseFromRaw(
  apiResponse: ApiBlogListResponseRaw
): BlogListResponse {
  return {
    posts: apiResponse.data.map(adaptPostFromRaw),
    total: apiResponse.total,
    page: apiResponse.page,
    pageSize: apiResponse.limit,
  };
}

// ============================================================================
// Helpers
// ============================================================================

/** Формирование query-параметров (документация FRONTEND_BLOG_AND_ARTICLES_API) */
function buildBlogQueryParams(params?: ApiBlogParams): string {
  if (!params) return "";

  const searchParams = new URLSearchParams();

  const addParam = (key: string, value: string | number | undefined): void => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, String(value));
    }
  };

  addParam("page", params.page);
  addParam("limit", params.limit);
  addParam("search", params.search);
  addParam("tagId", params.tagId);
  addParam("sortBy", params.sortBy);
  addParam("sortOrder", params.sortOrder);
  addParam("organizationId", params.organizationId);
  addParam("categoryId", params.categoryId);
  addParam("publishedAfter", params.publishedAfter);
  addParam("publishedBefore", params.publishedBefore);
  addParam("minReadingTime", params.minReadingTime);
  addParam("maxReadingTime", params.maxReadingTime);
  addParam("locale", params.locale);

  if (params.tagIds?.length) {
    params.tagIds.forEach((id) => searchParams.append("tagIds[]", id));
  }

  return searchParams.toString();
}

/** На клиенте при наличии токена не пропускать auth — тогда API вернёт saved */
function shouldSkipAuth(): boolean {
  if (typeof window === "undefined") return true;
  return !getAuthToken();
}

/** Адаптер: категория из API -> UI-инфо о категории для каталога/чипов */
function adaptCategoryInfo(category: ApiBlogCategory): BlogPostCategory {
  return {
    id: category.id,
    slug: category.slug,
    name: category.name,
    description: category.description ?? null,
    translations: category.translations ?? null,
    postsCount: category.postsCount ?? category._count?.posts ?? 0,
  };
}

// ============================================================================
// Blog Service
// ============================================================================

export const blogService = {
  getBlogListRaw: async (
    params: BlogListFetchOptions = {}
  ): Promise<ApiBlogListResponseRaw> => {
    const query = buildBlogQueryParams(params);
    const url = query ? `${BLOG_ENDPOINTS.LIST}?${query}` : BLOG_ENDPOINTS.LIST;

    return apiGet<ApiBlogListResponseRaw>(url, {
      skipAuth: shouldSkipAuth(),
    });
  },

  /**
   * Получить список статей
   * GET /api/v1/public/blog
   */
  getPosts: async (
    filters: BlogFilters = {},
    page = 1,
    pageSize = 9,
    locale?: ApiBlogParams["locale"]
  ): Promise<BlogListResponse> => {
    const params: ApiBlogParams = {
      page,
      limit: pageSize,
      search: filters.search,
      tagId: filters.tag,
      organizationId: filters.organizationId,
      categoryId: filters.categoryId,
      sortBy: "publishedAt",
      sortOrder: "desc",
      locale,
    };

    const response = await blogService.getBlogListRaw(params);

    return adaptListResponseFromRaw(response);
  },

  /**
   * Получить статью по slug
   * GET /api/v1/public/blog/{slug}
   */
  getPostBySlug: async (
    slug: string,
    locale?: ApiBlogParams["locale"]
  ): Promise<BlogPost | null> => {
    try {
      const query = locale ? `?locale=${locale}` : "";
      const response = await apiGet<ApiBlogPostRaw>(
        `${BLOG_ENDPOINTS.BY_SLUG(slug)}${query}`,
        { skipAuth: shouldSkipAuth() }
      );
      return adaptPostFromRaw(response);
    } catch (error) {
      console.error("Blog post not found:", error);
      return null;
    }
  },

  /**
   * Получить статью по ID
   * GET /api/v1/blog/:id (при JWT — с полем saved)
   */
  getPostById: async (
    id: string,
    locale?: ApiBlogParams["locale"]
  ): Promise<BlogPost | null> => {
    try {
      const query = locale ? `?locale=${locale}` : "";
      const response = await apiGet<ApiBlogPostRaw>(
        `${BLOG_ENDPOINTS.DETAIL(id)}${query}`,
        { skipAuth: shouldSkipAuth() }
      );
      return adaptPostFromRaw(response);
    } catch (error) {
      console.error("Blog post not found:", error);
      return null;
    }
  },

  /**
   * Получить featured статьи.
   * Отдельного featured endpoint на backend сейчас нет,
   * поэтому показываем последние опубликованные статьи.
   */
  getFeaturedPosts: async (
    limit = 3,
    locale?: ApiBlogParams["locale"]
  ): Promise<BlogPost[]> => {
    const response = await blogService.getBlogListRaw({
      limit,
      sortBy: "publishedAt",
      sortOrder: "desc",
      locale,
    });
    return response.data.map(adaptPostFromRaw);
  },

  /**
   * Получить trending статьи.
   * Используем сортировку по просмотрам как ближайшую бизнес-эвристику.
   */
  getTrendingPosts: async (
    limit = 5,
    locale?: ApiBlogParams["locale"]
  ): Promise<BlogPost[]> => {
    const response = await blogService.getBlogListRaw({
      limit,
      sortBy: "viewsCount",
      sortOrder: "desc",
      locale,
    });
    return response.data.map(adaptPostFromRaw);
  },

  /**
   * Получить похожие статьи
   */
  getRelatedPosts: async (
    _currentPostId: string,
    _limit = 3
  ): Promise<BlogPost[]> => {
    // API пока не поддерживает related posts
    return [];
  },

  /**
   * Получить динамические категории блога (глобальная таксономия).
   * GET /api/v1/blog-categories — отдаёт только активные, отсортированные.
   * При ошибке возвращаем пустой список (UI просто не покажет чипы категорий).
   */
  getCategories: async (
    locale?: ApiBlogParams["locale"]
  ): Promise<BlogPostCategory[]> => {
    try {
      const query = locale ? `?locale=${locale}` : "";
      const response = await apiGet<ApiBlogCategory[]>(
        `${BLOG_ENDPOINTS.CATEGORIES}${query}`,
        { skipAuth: true }
      );
      return Array.isArray(response) ? response.map(adaptCategoryInfo) : [];
    } catch (error) {
      console.error("Blog categories not available:", error);
      return [];
    }
  },
};
