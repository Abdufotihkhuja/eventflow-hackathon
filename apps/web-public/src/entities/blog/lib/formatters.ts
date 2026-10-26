/**
 * @module entities/blog/lib/formatters
 * @description Форматтеры и утилиты для работы с блог-данными
 */

import { parseUtcIso } from "@shared/lib/date";
import {
  formatDate as formatLocalizedDate,
  normalizeLocale,
} from "@eventflow/i18n";

import type {
  BlogCategorySlug,
  BlogPostCategory,
  BlogTag,
  KnownBlogCategory,
  KnownBlogTag,
} from "../model/types";

/**
 * Fallback-подписи для хорошо известных слагов категорий.
 * Используются только когда категория пришла без локализованного имени
 * (например, в старых фикстурах). Для динамических категорий имя берётся
 * напрямую из объекта категории (API уже локализует его по locale).
 */
export const CATEGORY_LABELS: Record<KnownBlogCategory, string> = {
  "tips-guides": "Советы и гиды",
  "news-trends": "Новости и тренды",
  community: "Сообщество",
  "tools-features": "Инструменты",
  "event-planning": "Планирование",
  "event-marketing": "Маркетинг",
  "event-management": "Управление",
};

/** Title-case fallback из слага: "event-planning" -> "Event Planning". */
function humanizeSlug(slug: string): string {
  return slug
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Подпись категории для UI.
 * Принимает динамический объект категории (предпочтительно — имя уже
 * локализовано на бэкенде) либо слаг (для совместимости со старым кодом).
 * Возвращает пустую строку, если категория не задана.
 */
export function getCategoryLabel(
  category: BlogPostCategory | BlogCategorySlug | null | undefined,
): string {
  if (!category) return "";
  if (typeof category === "string") {
    return (
      (CATEGORY_LABELS as Record<string, string>)[category] ??
      humanizeSlug(category)
    );
  }
  if (category.name) return category.name;
  return (
    (CATEGORY_LABELS as Record<string, string>)[category.slug] ??
    humanizeSlug(category.slug)
  );
}

export const TAG_LABELS: Record<KnownBlogTag, string> = {
  "event-technology": "Технологии",
  music: "Музыка",
  "social-media": "Соцсети",
  halloween: "Halloween",
  christmas: "Рождество",
  "new-year": "Новый год",
  trends: "Тренды",
  "case-studies": "Кейсы",
  "beginner-guide": "Для начинающих",
};

export function getTagLabel(tag: BlogTag): string {
  const known = (TAG_LABELS as Record<string, string>)[tag];
  if (known) return known;
  return tag
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function formatReadTime(minutes: number, locale?: string): string {
  const normalized = normalizeLocale(locale) ?? "en";
  const unit = normalized === "ru" ? "мин" : normalized === "uz" ? "daq" : "min";
  return `${minutes} ${unit}`;
}

export function formatPublishDate(dateString: string, locale?: string): string {
  const date = parseUtcIso(dateString);
  return formatLocalizedDate(date, locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: undefined,
  });
}

export function getRelativeDate(dateString: string): string {
  const date = parseUtcIso(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Сегодня";
  if (diffDays === 1) return "Вчера";
  if (diffDays < 7) return `${diffDays} дн. назад`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} нед. назад`;

  return formatPublishDate(dateString);
}

/**
 * Алиас для formatPublishDate для совместимости
 */
export function formatDate(dateString: string): string {
  return formatPublishDate(dateString);
}

/**
 * Вычисляет примерное время чтения статьи
 * @param content - Контент статьи
 * @returns Время чтения в минутах
 */
export function getReadingTime(content: string): number {
  // Средняя скорость чтения: 200 слов в минуту
  const wordsPerMinute = 200;
  const wordCount = content.trim().split(/\s+/).length;
  const minutes = Math.ceil(wordCount / wordsPerMinute);

  return Math.max(1, minutes); // Минимум 1 минута
}
