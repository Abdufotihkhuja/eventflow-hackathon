/**
 * Адаптеры для преобразования API-типов событий в типы фронтенда
 */

import type {
  Event,
  EventFormat,
  EventCategory,
  EventAccess,
  EventPricing,
  EventSpeaker,
  EventSpeakerSocial,
} from "../model/types";
import type { PublicEvent } from "@shared/api/eventService";
import { resolveAvatarUrl, resolveMediaUrl } from "@shared/lib/utils";

/**
 * Формирование полного URL для изображения
 * Экспортируется для использования в других модулях
 *
 * ВНИМАНИЕ: Эта функция возвращает строку для обратной совместимости,
 * но для шаблонов градиентов рекомендуется использовать processImageValue()
 *
 * Поддерживаемые форматы:
 * - "template:purple_sunset" - возвращает маркер для градиента
 * - "/uploads/file.jpg" - относительный путь к файлу на сервере
 * - "https://example.com/image.jpg" - абсолютный URL
 *
 * @param coverImage - Путь к изображению, шаблон или абсолютный URL
 * @param fallback - Fallback изображение (по умолчанию "/images/image.png")
 * @returns Полный URL изображения или маркер градиента
 * @deprecated Используйте processImageValue() для правильной обработки градиентов
 */
export function getImageUrl(
  coverImage?: string | null,
  fallback = "/images/image.png"
): string {
  // Если изображение не указано, возвращаем fallback
  if (!coverImage) return fallback;

  // Если это шаблон (формат: "template:" или "gradient:")
  // Возвращаем КАК ЕСТЬ для последующей обработки в компонентах
  if (
    coverImage.startsWith("template:") ||
    coverImage.startsWith("gradient:")
  ) {
    return coverImage; // НЕ добавляем базовый URL!
  }

  // Если уже полный URL, возвращаем как есть
  if (coverImage.startsWith("http://") || coverImage.startsWith("https://")) {
    return coverImage;
  }

  return resolveMediaUrl(coverImage) ?? fallback;
}

/**
 * Маппинг формата события из API в локальный тип
 */
function mapEventFormat(apiFormat: PublicEvent["format"]): EventFormat {
  const formatMap: Record<PublicEvent["format"], EventFormat> = {
    ONLINE: "online",
    OFFLINE: "offline",
    HYBRID: "hybrid",
  };
  return formatMap[apiFormat] ?? "offline";
}

/**
 * Маппинг категории события из API в тип фронтенда
 * API может возвращать произвольную строку категории
 */
export function mapEventCategory(apiCategory?: string): EventCategory {
  if (!apiCategory) return "conference";

  const categoryMap: Record<string, EventCategory> = {
    "business-training": "business-training",
    "business-meetings": "business-meetings",
    workshops: "workshops",
    conference: "conference",
    forum: "forum",
    hackathon: "hackathon",
    ideathon: "ideathon",
    "Бизнес-тренинг": "business-training",
    "Бизнес встречи": "business-meetings",
    Воркшопы: "workshops",
    Конференции: "conference",
    Форумы: "forum",
    Хакатон: "hackathon",
    Идеатон: "ideathon",
    BUSINESS_TRAINING: "business-training",
    BUSINESS_MEETINGS: "business-meetings",
    WORKSHOPS: "workshops",
    CONFERENCE: "conference",
    FORUM: "forum",
    HACKATHON: "hackathon",
    IDEATHON: "ideathon",
  };

  return categoryMap[apiCategory] ?? "conference";
}

/**
 * Маппинг типа доступа из API (accessType) в тип фронтенда.
 * INVITE_ONLY не попадает в публичный каталог (фильтр на бэкенде).
 */
function mapEventAccess(event: PublicEvent): EventAccess {
  const accessMap: Record<
    NonNullable<PublicEvent["accessType"]>,
    EventAccess
  > = {
    OPEN: "open",
    REQUEST: "request",
    INVITE_ONLY: "invite",
    PRIVATE: "private",
  };
  return event.accessType ? accessMap[event.accessType] ?? "open" : "open";
}

/**
 * Определение типа оплаты события
 * API возвращает type: "FREE" | "PAID"
 */
function mapEventPricing(event: PublicEvent): EventPricing {
  return event.type === "FREE" ? "free" : "paid";
}

/**
 * Адаптер из PublicEvent (API) в Event (frontend)
 */
export function adaptPublicEventToEvent(apiEvent: PublicEvent): Event {
  // API возвращает city как отдельное поле, объединяем с location
  const locationText = apiEvent.city
    ? `${apiEvent.city}${apiEvent.location ? `, ${apiEvent.location}` : ""}`
    : (apiEvent.location ?? apiEvent.address);

  return {
    id: apiEvent.id,
    slug: apiEvent.slug,
    title: apiEvent.title,
    description: apiEvent.description ?? apiEvent.shortDescription ?? "",
    format: mapEventFormat(apiEvent.format),
    location: locationText,
    allowsGroupRegistration: false, // API не возвращает это поле
    hasUnlimitedCapacity:
      apiEvent.maxParticipants === undefined ||
      apiEvent.maxParticipants === null,
    capacity: apiEvent.maxParticipants,
    hasCertificate: false, // API не возвращает это поле, определяется по наличию сертификата после события
    category: mapEventCategory(apiEvent.categories?.[0]?.slug),
    startDate: apiEvent.startDate,
    endDate: apiEvent.endDate,
    registrationDeadline: apiEvent.registrationDeadline,
    access: mapEventAccess(apiEvent),
    pricing: mapEventPricing(apiEvent),
    price:
      apiEvent.price != null
        ? typeof apiEvent.price === "string"
          ? Number.parseFloat(apiEvent.price)
          : apiEvent.price
        : undefined,
    currency: apiEvent.currency,
    imageUrl: getImageUrl(apiEvent.coverImage, "/images/image.png"), // Формируем полный URL
    tags: apiEvent.tags,
    isHighlighted: apiEvent.isFeatured ?? false, // API использует isFeatured
    organizer: apiEvent.organization?.name, // Название организатора
    organizationId: apiEvent.organization?.id, // Для ссылки на /organizers/[id]
    organizerLogoUrl: resolveMediaUrl(apiEvent.organization?.logoUrl),
  };
}

/**
 * Адаптер для массива событий
 */
export function adaptPublicEventsToEvents(apiEvents: PublicEvent[]): Event[] {
  return apiEvents.map(adaptPublicEventToEvent);
}

/**
 * Собирает массив socia-ссылок из плоских полей API-спикера.
 * Работает и с уже нормализованным спикером (если socials есть — возвращает их).
 */
function buildSpeakerSocials(
  raw: Record<string, unknown>
): EventSpeakerSocial[] {
  if (
    Array.isArray((raw as { socials?: unknown }).socials) &&
    ((raw as { socials: unknown[] }).socials).length > 0
  ) {
    return (raw as { socials: EventSpeakerSocial[] }).socials;
  }

  const socials: EventSpeakerSocial[] = [];
  const str = (v: unknown): string | null =>
    typeof v === "string" && v.trim() ? v.trim() : null;

  const linkedin = str(raw.linkedinUrl);
  if (linkedin) socials.push({ platform: "linkedin", url: linkedin });
  const instagram = str(raw.instagramUrl);
  if (instagram) socials.push({ platform: "instagram", url: instagram });
  const facebook = str(raw.facebookUrl);
  if (facebook) socials.push({ platform: "facebook", url: facebook });
  const website = str(raw.websiteUrl);
  if (website) socials.push({ platform: "website", url: website });

  return socials;
}

/**
 * Нормализует спикера из любого формата (сырой API или уже адаптированный)
 * в единый фронтенд-тип EventSpeaker.
 */
export function normalizeSpeaker(raw: Record<string, unknown>): EventSpeaker {
  const firstName = ((raw.firstName as string) ?? "").trim();
  const lastName = ((raw.lastName as string) ?? "").trim();

  return {
    id: raw.id as string,
    firstName,
    lastName,
    role:
      (raw.role as string) ?? (raw.position as string) ?? "",
    bio: (raw.bio as string) ?? "",
    avatarUrl: resolveAvatarUrl(raw.avatarUrl as string | null | undefined),
    company: (raw.company as string) ?? undefined,
    socials: buildSpeakerSocials(raw),
  };
}

/**
 * Нормализует массив спикеров.
 */
export function normalizeSpeakers(
  speakers: unknown[] | undefined | null
): EventSpeaker[] {
  if (!Array.isArray(speakers)) return [];
  return speakers.map((s) => normalizeSpeaker(s as Record<string, unknown>));
}
