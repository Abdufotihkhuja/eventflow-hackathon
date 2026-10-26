/**
 * API-сервис для работы с избранными статьями пользователя
 * Endpoints: /api/v1/account/me/articles
 */

import { toUtcIsoString } from "../lib/date";
import { accountSdk } from "./sdk";

// ============================================================================
// Типы
// ============================================================================

/**
 * Избранная статья пользователя (SavedArticleResponseDto)
 * GET /api/v1/account/me/articles — поле articles[]
 */
export interface SavedArticle {
  id: string;
  slug?: string;
  articleUrl: string;
  title?: string;
  excerpt?: string;
  coverImage?: string;
  category?: string;
  publishedAt?: string;
  readingTime?: number;
  authorName?: string;
  savedAt: string;
  /** Алиас для articleUrl (обратная совместимость UI) */
  url?: string;
  description?: string;
  imageUrl?: string;
  source?: string;
}

/**
 * Параметры для получения списка статей (API_USER GET me/articles)
 */
export interface GetArticlesParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
}

/** Сырой ответ API GET /api/v1/account/me/articles */
interface ApiSavedArticlesResponse {
  total: number;
  page: number;
  limit: number;
  articles: Array<{
    id: string;
    slug?: string;
    articleUrl: string;
    title?: string;
    excerpt?: string;
    coverImage?: string;
    category?: string;
    publishedAt?: string;
    readingTime?: number;
    authorName?: string;
    savedAt: string;
  }>;
}

/**
 * Ответ со списком избранных статей
 */
export interface SavedArticlesResponse {
  articles: SavedArticle[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Данные для сохранения статьи (API_USER SaveArticleDto)
 * Обязательно: (articleUrl или url). title рекомендуется.
 */
export interface SaveArticleDto {
  /** Ссылка на статью (обязательно с articleUrl или url) */
  articleUrl?: string;
  title?: string;
  excerpt?: string;
  coverImage?: string;
  category?: string;
  publishedAt?: string;
  readingTime?: number;
  authorName?: string;
  /** Алиас для articleUrl */
  url?: string;
  description?: string;
  imageUrl?: string;
  source?: string;
}

/**
 * Данные для удаления статьи по URL
 */
export interface DeleteArticleByUrlDto {
  url: string;
}

/**
 * Ответ проверки сохранена ли статья
 */
export interface CheckArticleResponse {
  isSaved: boolean;
  articleId?: string;
}

/**
 * Ответ при сохранении статьи
 */
export interface SaveArticleResponse {
  article: SavedArticle;
  message: string;
}

/**
 * Ответ при удалении статьи
 */
export interface DeleteArticleResponse {
  message: string;
  success: boolean;
}

// ============================================================================
// Endpoints
// ============================================================================

export const ARTICLES_QUERY_KEYS = {
  all: ["articles"] as const,
  list: (params?: GetArticlesParams) =>
    [...ARTICLES_QUERY_KEYS.all, "list", params] as const,
  check: (url: string) => [...ARTICLES_QUERY_KEYS.all, "check", url] as const,
} as const;

export const articlesService = {
  /**
   * Получить избранные статьи пользователя
   * GET /api/v1/account/me/articles
   */
  getArticles: async (
    params?: GetArticlesParams
  ): Promise<SavedArticlesResponse> => {
    const raw = (await accountSdk.articles.getArticles(
      params as never
    )) as unknown as ApiSavedArticlesResponse;
    return {
      articles: raw.articles.map((a) => ({
        ...a,
        url: a.articleUrl,
        description: a.excerpt,
        imageUrl: a.coverImage,
      })),
      total: raw.total,
      page: raw.page,
      limit: raw.limit,
    };
  },

  /**
   * Сохранить статью в избранное
   * POST /api/v1/account/me/articles (API_USER SaveArticleDto)
   */
  saveArticle: async (data: SaveArticleDto): Promise<SaveArticleResponse> => {
    const articleUrl = data.articleUrl ?? data.url;
    if (!articleUrl) {
      throw new Error("articleUrl или url обязателен");
    }
    const body = {
      articleUrl,
      title: data.title ?? "",
      excerpt: data.excerpt ?? data.description,
      coverImage: data.coverImage ?? data.imageUrl,
      category: data.category,
      publishedAt: data.publishedAt
        ? toUtcIsoString(data.publishedAt)
        : data.publishedAt,
      readingTime: data.readingTime,
      authorName: data.authorName,
    };
    const raw = (await accountSdk.articles.saveArticle(
      body as never
    )) as { article: SavedArticle; message?: string };
    const article = raw.article as SavedArticle;
    if (article && !article.url) {
      article.url = article.articleUrl;
    }
    return { article, message: raw.message ?? "" };
  },

  /**
   * Удалить статью из избранного по URL
   * DELETE /api/v1/account/me/articles?url=<encoded_article_url>
   */
  deleteArticleByUrl: async (url: string): Promise<DeleteArticleResponse> => {
    await accountSdk.articles.deleteArticleByUrl({ url } as never);
    return { success: true, message: "" };
  },

  /**
   * Проверить, сохранена ли статья
   * GET /api/v1/account/me/articles/check?url=... → { saved: boolean }
   */
  checkArticle: async (url: string): Promise<CheckArticleResponse> => {
    const raw = (await accountSdk.articles.checkArticle({
      url,
    } as never)) as { saved: boolean };
    return { isSaved: raw.saved };
  },

  /**
   * Удалить статью из избранного по ID
   * DELETE /api/v1/account/me/articles/:id → 204
   */
  deleteArticleById: async (id: string): Promise<DeleteArticleResponse> => {
    await accountSdk.articles.deleteArticleById(id);
    return { success: true, message: "" };
  },
};
