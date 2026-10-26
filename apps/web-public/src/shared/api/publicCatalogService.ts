/**
 * Публичный каталог: теги, категории, подборки событий
 * API_PUBLIC: GET /events/tags, /categories, /collections
 */

import { apiGet } from "../lib/apiClient";

// ============================================================================
// Теги
// ============================================================================

export type TagCategory = "FORMAT" | "AUDIENCE" | "TOPIC" | "CUSTOM";

export interface EventTag {
  id: string;
  name: string;
  slug?: string;
  category?: TagCategory;
}

export interface GetTagsParams {
  category?: TagCategory;
}

type PublicBusinessLocale = "ru" | "uz" | "en";

// ============================================================================
// Категории
// ============================================================================

export interface Category {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  icon?: string;
  sortOrder?: number;
  /** Кол-во опубликованных событий в категории (с бэка). */
  _count?: { events: number };
}

// ============================================================================
// Подборки
// ============================================================================

export interface CollectionEventItem {
  id: string;
  title: string;
  slug?: string;
  shortDescription?: string;
  coverImage?: string;
  startDate: string;
  endDate?: string;
  format: string;
  type: string;
  city?: string;
  organization?: { id: string; name: string; logoUrl?: string };
}

export interface Collection {
  id: string;
  name: string;
  slug: string;
  description?: string;
  coverImage?: string;
  sortOrder?: number;
  events?: CollectionEventItem[];
}

// ============================================================================
// Вопросы регистрации (публичные)
// ============================================================================

/** Настройки поля загрузки файла (вопрос type=FILE_UPLOAD). */
export interface RegistrationFileUploadConfigPublic {
  description: string | null;
  template: {
    url: string;
    name: string;
    size: number;
    mimeType: string;
  } | null;
  maxFileSizeMb: number;
  allowedFileTypes: string[];
  allowMultipleFiles: boolean;
  maxFiles: number;
}

/** Ответ API GET /events/:eventId/questions/public */
export interface RegistrationQuestionPublicRaw {
  id: string;
  eventId: string;
  question: string;
  type: string;
  category?: string;
  isRequired: boolean;
  options?: string[];
  /**
   * Scalar option values (used for server-side answer evaluation).
   * Backend returns this when locale-resolved options differ from scalar.
   * Если отсутствует — options совпадают со scalar (legacy / fallback).
   */
  optionValues?: string[];
  informationalText?: string | null;
  /** Настройки для type=FILE_UPLOAD (иначе null). */
  fileUploadConfig?: RegistrationFileUploadConfigPublic | null;
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}

/** Нормализованный вопрос для формы (label, required, type для рендера) */
export interface RegistrationQuestionPublic {
  id: string;
  label: string;
  type: string;
  /**
   * Question category from the API: OPEN | CLOSED | ALTERNATIVE | RHETORICAL.
   * Drives render decisions on top of `type` — e.g. CLOSED ("Да / Нет")
   * always renders as a radio group regardless of stored type, so legacy
   * records still typed as CHECKBOX can't be ticked twice.
   */
  category?: string;
  required: boolean;
  /** Локализованные labels вариантов (для отображения). */
  options?: string[];
  /**
   * Scalar option values для server-side answer evaluation. Если отсутствует —
   * используется options. Frontend submits scalar; UI рендерит localized.
   */
  optionValues?: string[];
  /** Текст под вопросом (например для RHETORICAL) */
  informationalText?: string | null;
  /** Настройки для type=FILE_UPLOAD (иначе null). */
  fileUploadConfig?: RegistrationFileUploadConfigPublic | null;
  sortOrder: number;
}

/** Адаптер: API → нормализованный вид, сортировка по sortOrder */
export function adaptRegistrationQuestions(
  raw: RegistrationQuestionPublicRaw[]
): RegistrationQuestionPublic[] {
  return raw
    .map((q) => ({
      id: q.id,
      label: q.question,
      type: q.type,
      category: q.category,
      required: q.isRequired,
      options: q.options ?? [],
      optionValues:
        Array.isArray(q.optionValues) && q.optionValues.length > 0
          ? q.optionValues
          : (q.options ?? []),
      informationalText: q.informationalText ?? null,
      fileUploadConfig: q.fileUploadConfig ?? null,
      sortOrder: q.sortOrder ?? 0,
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

// ============================================================================
// Endpoints
// ============================================================================

const CATALOG_ENDPOINTS = {
  TAGS: "/api/v1/events/tags",
  EVENT_TAGS: (eventId: string) => `/api/v1/events/${eventId}/tags`,
  REGISTRATION_QUESTIONS: (eventId: string) =>
    `/api/v1/events/${eventId}/questions/public`,
  CATEGORIES: "/api/v1/categories",
  CATEGORY_BY_ID: (id: string) => `/api/v1/categories/${id}`,
  COLLECTIONS: "/api/v1/collections",
  COLLECTION_BY_ID: (id: string) => `/api/v1/collections/${id}`,
  COLLECTION_BY_SLUG: (slug: string) =>
    `/api/v1/collections/by-slug/${encodeURIComponent(slug)}`,
} as const;

// ============================================================================
// Query Keys
// ============================================================================

export const PUBLIC_CATALOG_QUERY_KEYS = {
  all: ["public-catalog"] as const,
  tags: (params?: GetTagsParams) =>
    [...PUBLIC_CATALOG_QUERY_KEYS.all, "tags", params] as const,
  eventTags: (eventId: string) =>
    [...PUBLIC_CATALOG_QUERY_KEYS.all, "event-tags", eventId] as const,
  registrationQuestions: (eventId: string) =>
    [...PUBLIC_CATALOG_QUERY_KEYS.all, "questions", eventId] as const,
  categories: () => [...PUBLIC_CATALOG_QUERY_KEYS.all, "categories"] as const,
  category: (id: string) =>
    [...PUBLIC_CATALOG_QUERY_KEYS.all, "category", id] as const,
  collections: () => [...PUBLIC_CATALOG_QUERY_KEYS.all, "collections"] as const,
  collection: (id: string) =>
    [...PUBLIC_CATALOG_QUERY_KEYS.all, "collection", id] as const,
  collectionBySlug: (slug: string) =>
    [...PUBLIC_CATALOG_QUERY_KEYS.all, "collection-slug", slug] as const,
} as const;

function localeQuery(locale?: PublicBusinessLocale): string {
  return locale ? `?locale=${locale}` : "";
}

// ============================================================================
// Service
// ============================================================================

export const publicCatalogService = {
  getTags: async (params?: GetTagsParams): Promise<EventTag[]> => {
    const query = params?.category ? `?category=${params.category}` : "";
    return apiGet<EventTag[]>(`${CATALOG_ENDPOINTS.TAGS}${query}`, {
      skipAuth: true,
    });
  },

  getEventTags: async (eventId: string): Promise<EventTag[]> => {
    return apiGet<EventTag[]>(CATALOG_ENDPOINTS.EVENT_TAGS(eventId), {
      skipAuth: true,
    });
  },

  getRegistrationQuestionsPublic: async (
    eventId: string,
    locale?: PublicBusinessLocale
  ): Promise<RegistrationQuestionPublic[]> => {
    const raw = await apiGet<RegistrationQuestionPublicRaw[]>(
      `${CATALOG_ENDPOINTS.REGISTRATION_QUESTIONS(eventId)}${localeQuery(locale)}`,
      { skipAuth: true }
    );
    return adaptRegistrationQuestions(Array.isArray(raw) ? raw : []);
  },

  getCategories: async (locale?: PublicBusinessLocale): Promise<Category[]> => {
    return apiGet<Category[]>(
      `${CATALOG_ENDPOINTS.CATEGORIES}${localeQuery(locale)}`,
      {
        skipAuth: true,
      }
    );
  },

  getCategoryById: async (
    id: string,
    locale?: PublicBusinessLocale
  ): Promise<Category> => {
    return apiGet<Category>(
      `${CATALOG_ENDPOINTS.CATEGORY_BY_ID(id)}${localeQuery(locale)}`,
      {
        skipAuth: true,
      }
    );
  },

  getCollections: async (
    locale?: PublicBusinessLocale
  ): Promise<Collection[]> => {
    return apiGet<Collection[]>(
      `${CATALOG_ENDPOINTS.COLLECTIONS}${localeQuery(locale)}`,
      {
        skipAuth: true,
      }
    );
  },

  getCollectionById: async (
    id: string,
    locale?: PublicBusinessLocale
  ): Promise<Collection> => {
    return apiGet<Collection>(
      `${CATALOG_ENDPOINTS.COLLECTION_BY_ID(id)}${localeQuery(locale)}`,
      {
        skipAuth: true,
      }
    );
  },

  getCollectionBySlug: async (
    slug: string,
    locale?: PublicBusinessLocale
  ): Promise<Collection> => {
    return apiGet<Collection>(
      `${CATALOG_ENDPOINTS.COLLECTION_BY_SLUG(slug)}${localeQuery(locale)}`,
      {
        skipAuth: true,
      }
    );
  },
};
