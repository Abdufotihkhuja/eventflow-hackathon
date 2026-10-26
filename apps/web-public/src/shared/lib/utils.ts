import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import { formatDate } from "@eventflow/i18n";
import { parseUtcIso } from "./date";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Базовый URL для загрузок (аватары, изображения) с API */
function normalizeUploadsBaseUrl(rawUrl?: string): string {
  const trimmedUrl = rawUrl?.trim() ?? "";

  if (!trimmedUrl) {
    return "";
  }

  return trimmedUrl
    .replace(/\/api\/v1\/?$/, "")
    .replace(/\/api\/?$/, "")
    .replace(/\/v1\/?$/, "")
    .replace(/\/$/, "");
}

const UPLOADS_BASE_URL =
  normalizeUploadsBaseUrl(
    typeof process !== "undefined"
      ? process.env?.NEXT_PUBLIC_API_URL
      : undefined
  ) ||
  "http://api.localhost";

/**
 * Преобразует относительный путь медиа (например /uploads/...) в полный URL.
 * Если передан уже абсолютный URL — возвращает как есть.
 */
export function resolveMediaUrl(
  url: string | null | undefined
): string | undefined {
  if (!url?.trim()) return undefined;
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return toDirectImageUrl(url);
  }
  if (url.startsWith("/") && !url.startsWith("/uploads/")) {
    return url;
  }
  return `${UPLOADS_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

/**
 * Преобразует относительный путь аватара (например /uploads/...) в полный URL.
 * Если передан уже абсолютный URL — возвращает как есть.
 * Google Drive ссылки конвертируются в прямые ссылки на изображения.
 */
export function resolveAvatarUrl(
  url: string | null | undefined
): string | undefined {
  return resolveMediaUrl(url);
}

/**
 * Конвертирует ссылки файловых хостингов (Google Drive) в прямые URL изображений.
 * lh3.googleusercontent.com/d/ — CDN Google, отдаёт картинку без редиректов.
 */
function toDirectImageUrl(url: string): string {
  const gdriveMatch = url.match(
    /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/
  );
  if (gdriveMatch?.[1]) {
    return `https://lh3.googleusercontent.com/d/${gdriveMatch[1]}`;
  }
  return url;
}

/** Форматирует дату комментария в относительный вид («5 часов назад»). Дата с API — UTC. */
export function formatCommentTimeAgo(dateStr: string, locale?: string): string {
  const date = parseUtcIso(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "только что";
  if (diffMin < 60)
    return `${diffMin} ${pluralRu(diffMin, "минуту", "минуты", "минут")} назад`;
  if (diffHour < 24)
    return `${diffHour} ${pluralRu(diffHour, "час", "часа", "часов")} назад`;
  if (diffDay < 7)
    return `${diffDay} ${pluralRu(diffDay, "день", "дня", "дней")} назад`;
  return formatDate(date, locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: undefined,
  });
}

function pluralRu(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}

/** Объект пользователя с опциональными полями имени (User / CurrentUser) */
export interface UserDisplayNameSource {
  name?: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string;
}

/**
 * Возвращает отображаемое имя: приоритет firstName+lastName, затем name, затем часть email.
 */
export function getUserDisplayName(
  user: UserDisplayNameSource | null | undefined
): string {
  if (user == null) return "Пользователь";
  const first = (user.firstName ?? "").trim();
  const last = (user.lastName ?? "").trim();
  const full = `${first} ${last}`.trim();
  if (full) return full;
  if (user.name?.trim()) return user.name.trim();
  if (user.email) return user.email.split("@")[0] ?? user.email;
  return "Пользователь";
}

/**
 * Разбивает полное имя на имя и фамилию (первое слово — имя, остальное — фамилия).
 */
export function parseFullName(fullName: string): {
  firstName: string;
  lastName: string;
} {
  const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0] ?? "", lastName: "" };
  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" "),
  };
}

/**
 * Форматирует дату рождения для отображения (UTC ISO → локаль «5 декабря 2000»).
 */
export function formatDateOfBirthDisplay(dateStr: string, locale?: string): string {
  const date = parseUtcIso(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return formatDate(date, locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Нормализует дату рождения для input type="date" (UTC ISO → YYYY-MM-DD в локальной дате).
 */
export function formatDateOfBirthForInput(dateStr: string): string {
  const date = parseUtcIso(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
