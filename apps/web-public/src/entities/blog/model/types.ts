/**
 * @module entities/blog/model/types
 * @description Типы для сущности блог-статей
 */

/** Inline-контент внутри блока (BlockNote) */
export interface BlockNoteInlineContent {
  text?: string;
  type?: string;
  styles?: Record<string, unknown>;
}

/** Блок контента статьи (формат BlockNote) */
export interface BlockNoteContentBlock {
  id: string;
  type: string;
  props?: Record<string, unknown>;
  content?: BlockNoteInlineContent[];
  children?: unknown[];
}

/**
 * Категория блога — динамическая таксономия, управляемая супер-админом.
 * Раньше это был жёстко заданный union слагов; теперь slug может быть любым,
 * а отображаемое имя приходит из API (локализованное) либо из translations.
 *
 * Хорошо известные слаги ниже сохранены лишь для подсказок редактора и
 * совместимости со старым кодом — они НЕ ограничивают допустимые значения.
 */
export type KnownBlogCategory =
  | "tips-guides"
  | "news-trends"
  | "community"
  | "tools-features"
  | "event-planning"
  | "event-marketing"
  | "event-management";

export type BlogCategorySlug = KnownBlogCategory | (string & {});

/** Backward-compatible alias: callers that used the slug union still compile. */
export type BlogCategory = BlogCategorySlug;

/** Локализуемое имя по локалям (как в translations API). */
export type BlogCategoryTranslations = Record<
  string,
  Partial<Record<string, string>>
>;

/**
 * Категория в составе статьи / списке категорий (из API).
 * `name` приходит уже локализованным, когда запрос передаёт locale.
 */
export interface BlogPostCategory {
  id: string;
  slug: BlogCategorySlug;
  name: string;
  description?: string | null;
  translations?: BlogCategoryTranslations | null;
  /** Количество опубликованных статей (только в списке категорий). */
  postsCount?: number;
}

/**
 * Tags are user-defined and stored in the DB, so the runtime value is any
 * string slug. The literals below are only well-known tags that have curated
 * display labels in TAG_LABELS — they do not constrain the allowed values.
 */
export type KnownBlogTag =
  | "event-technology"
  | "music"
  | "social-media"
  | "halloween"
  | "christmas"
  | "new-year"
  | "trends"
  | "case-studies"
  | "beginner-guide";

export type BlogTag = KnownBlogTag | (string & {});

export interface BlogAuthor {
  id: string;
  name: string;
  avatar?: string;
  bio?: string;
  role?: string;
  articlesCount?: number;
  socialLinks?: {
    linkedin?: string;
    instagram?: string;
    facebook?: string;
  };
  /**
   * `Person` when the post has an explicit byline author (real human);
   * `Organization` when it falls back to the org-as-author shape. Drives
   * which `@type` the public site emits in BlogPosting JSON-LD for E-E-A-T.
   */
  type?: "Person" | "Organization";
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  /** Текст для карточек и времени чтения (извлечён из блоков или shortDescription) */
  content: string;
  /** Сырые блоки BlockNote для рендера на странице статьи */
  contentBlocks?: BlockNoteContentBlock[];
  coverImage: string;
  /** Категория статьи (динамическая). null/undefined — без категории. */
  category?: BlogPostCategory | null;
  tags: BlogTag[];
  author: BlogAuthor;
  publishedAt: string;
  updatedAt?: string;
  readTime: number; // в минутах
  featured?: boolean;
  trending?: boolean;
  viewsCount?: number;
  commentsCount?: number;
  /** Показывать секцию комментариев (из API) */
  commentsEnabled?: boolean;
  /** ID организации-автора (для кнопки подписки на организатора) */
  organizationId?: string;
  /** Признак «сохранён пользователем» (приходит при JWT, из Saved Blog Posts) */
  saved?: boolean;
}

export interface BlogFilters {
  /** Слаг категории (для совместимости; фильтрация на API идёт по categoryId). */
  category?: BlogCategorySlug;
  /** ID категории блога — основной фильтр каталога по динамической таксономии. */
  categoryId?: string;
  tag?: BlogTag;
  search?: string;
  /** ID организации — фильтр статей блога организатора */
  organizationId?: string;
}

export interface BlogListResponse {
  posts: BlogPost[];
  total: number;
  page: number;
  pageSize: number;
}
