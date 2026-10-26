/**
 * Adapter that converts the raw `/public/events/by-slug/:slug` API payload
 * into the `EventDetail` shape consumed by the public event-details view.
 *
 * Lives in entities/event so both the server route (Next.js page) and the
 * client React-Query refetch produce an identical shape — otherwise the
 * client refetch would replace the server-adapted shape with the raw API
 * shape and the page would visibly drop fields after a locale switch.
 */
import type { Translator } from "@eventflow/i18n";
// Импорт из конкретных модулей, а не из барреля @entities/event: баррель
// реэкспортирует lib/, и путь через него замыкал цикл (index → lib → сюда).
import { mapEventCategory } from "@entities/event/lib/adapters";
import type {
  AgendaSpeaker,
  EventOrganization,
  EventResource,
  EventSpeaker,
  EventSpeakerSocial,
  ScheduleItemType,
} from "@entities/event/model";
import { parseAgendaTimeAsLocal, parseUtcIso } from "@shared/lib/date";
import { extractTextFromBlocks } from "@shared/lib/richText";
import { resolveAvatarUrl, resolveMediaUrl } from "@shared/lib/utils";

const FORMAT_MAP: Record<string, "online" | "offline" | "hybrid"> = {
  ONLINE: "online",
  OFFLINE: "offline",
  HYBRID: "hybrid",
};

const AGENDA_TYPE_MAP: Record<string, ScheduleItemType> = {
  PRESENTATION: "presentation",
  WORKSHOP: "workshop",
  PANEL: "panel",
  BREAK: "break",
  NETWORKING: "networking",
  REGISTRATION: "registration",
  KEYNOTE: "keynote",
  QA: "qa",
  OTHER: "other",
};

interface ApiSpeaker {
  id: string;
  eventId?: string;
  userId?: string | null;
  firstName?: string;
  lastName?: string;
  /** @deprecated используйте firstName/lastName; оставлено для совместимости с API */
  name?: string;
  position?: string;
  company?: string;
  bio?: string | null;
  avatarUrl?: string | null;
  linkedinUrl?: string | null;
  instagramUrl?: string | null;
  facebookUrl?: string | null;
  websiteUrl?: string | null;
  invitationStatus?: string;
  invitationToken?: string | null;
  tokenExpiresAt?: string | null;
  invitedEmail?: string | null;
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}

interface ApiAgendaItem {
  id: string;
  title: string;
  description?: string;
  type?: string;
  date?: string;
  startTime?: string;
  duration?: number;
  location?: string;
  roomId?: string | null;
  room?: { id: string; name: string } | null;
  speakers?: ApiSpeaker[];
  /** Список URL'ов на материалы (презентации, документы). */
  materials?: string[];
  /**
   * Map url → локализованная подпись (бэк уже резолвит по запрошенной локали).
   * Если ключа нет — фронт использует имя файла из URL как fallback.
   */
  materialLabels?: Record<string, string>;
}

interface ApiEventRoom {
  id: string;
  name: string;
  sortOrder: number;
}

interface ApiOrganization {
  id: string;
  name: string;
  companyName?: string;
  logoUrl?: string;
  description?: string;
}

function buildSpeakerSocials(speaker: ApiSpeaker): EventSpeakerSocial[] {
  const socials: EventSpeakerSocial[] = [];

  if (speaker.linkedinUrl) {
    socials.push({ platform: "linkedin", url: speaker.linkedinUrl });
  }
  if (speaker.instagramUrl) {
    socials.push({ platform: "instagram", url: speaker.instagramUrl });
  }
  if (speaker.facebookUrl) {
    socials.push({ platform: "facebook", url: speaker.facebookUrl });
  }
  if (speaker.websiteUrl) {
    socials.push({ platform: "website", url: speaker.websiteUrl });
  }

  return socials;
}

function parseSpeakerName(speaker: ApiSpeaker): {
  firstName: string;
  lastName: string;
} {
  if (speaker.firstName != null && speaker.lastName != null) {
    return { firstName: speaker.firstName, lastName: speaker.lastName };
  }
  const parts = (speaker.name ?? "").trim().split(/\s+/);
  const firstName = speaker.firstName ?? parts[0] ?? "";
  const lastName = speaker.lastName ?? parts.slice(1).join(" ") ?? "";
  return { firstName, lastName };
}

function adaptSpeaker(speaker: ApiSpeaker): EventSpeaker {
  const { firstName, lastName } = parseSpeakerName(speaker);
  return {
    id: speaker.id,
    firstName,
    lastName,
    role: speaker.position ?? "",
    bio: speaker.bio ?? "",
    avatarUrl: resolveAvatarUrl(speaker.avatarUrl),
    company: speaker.company,
    socials: buildSpeakerSocials(speaker),
  };
}

function adaptAgendaSpeaker(speaker: ApiSpeaker): AgendaSpeaker {
  const { firstName, lastName } = parseSpeakerName(speaker);
  return {
    id: speaker.id,
    firstName,
    lastName,
    position: speaker.position,
    company: speaker.company,
    avatarUrl: resolveAvatarUrl(speaker.avatarUrl),
  };
}

/**
 * Превращает URL материала в человекочитаемое имя файла как fallback,
 * когда organizer не задал локализованную подпись.
 * Например: "/uploads/abc.pdf?v=1" → "abc.pdf"; "https://drive.google.com/…" → "drive.google.com".
 */
function deriveResourceFallbackLabel(url: string): string {
  try {
    const abs = url.startsWith("http") ? new URL(url) : new URL(url, "https://x");
    const segments = abs.pathname.split("/").filter(Boolean);
    const last = segments[segments.length - 1];
    if (last) {
      try {
        return decodeURIComponent(last);
      } catch {
        return last;
      }
    }
    return abs.hostname || url;
  } catch {
    return url;
  }
}

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || "/api"
).replace(/\/$/, "");

/**
 * Строит URL публичного download-прокси для загруженного материала.
 * Прод-nginx режет прямой доступ к /uploads/materials/, поэтому файлы,
 * сохранённые в storage, скачиваются через API:
 *   GET /api/v1/public/events/:eventId/agenda/:agendaItemId/materials/download?fileUrl=...
 */
function buildPublicMaterialDownloadUrl(
  eventId: string,
  agendaItemId: string,
  fileUrl: string,
): string {
  const encoded = encodeURIComponent(fileUrl);
  return `${API_BASE_URL}/api/v1/public/events/${eventId}/agenda/${agendaItemId}/materials/download?fileUrl=${encoded}`;
}

/**
 * Складывает все материалы из agendaItems[] в плоский массив EventResource[].
 * Дубликаты по URL отбрасываются (один и тот же файл может быть прилеплен
 * к нескольким сессиям).
 *
 * Различает два типа ресурсов:
 *  - Загруженные файлы (относительные /uploads/* пути) → стримятся через
 *    публичный API endpoint, isExternal=false, UI отрисует download-кнопку.
 *  - Внешние ссылки (http(s)://…) → как есть, isExternal=true,
 *    UI откроет в новой вкладке.
 */
function buildEventResources(
  eventId: string,
  agendaItems: ApiAgendaItem[] | undefined,
): EventResource[] {
  if (!Array.isArray(agendaItems) || agendaItems.length === 0) return [];

  const seen = new Set<string>();
  const resources: EventResource[] = [];

  for (const item of agendaItems) {
    if (!Array.isArray(item.materials)) continue;
    const labels = item.materialLabels ?? {};
    for (const rawUrl of item.materials) {
      if (typeof rawUrl !== "string") continue;
      const url = rawUrl.trim();
      if (!url || seen.has(url)) continue;
      seen.add(url);

      const localizedLabel = labels[url];
      const label =
        (typeof localizedLabel === "string" && localizedLabel.trim()) ||
        deriveResourceFallbackLabel(url);

      const isAbsolute = /^https?:\/\//i.test(url);
      const isUploadedFile = url.startsWith("/uploads/");
      const href = isUploadedFile
        ? buildPublicMaterialDownloadUrl(eventId, item.id, url)
        : isAbsolute
          ? url
          : (resolveMediaUrl(url) ?? url);

      resources.push({
        id: `${item.id}:${url}`,
        label,
        href,
        // Привязываем материал к сессии — описание показывает, где его искать.
        description: item.title || undefined,
        isExternal: isAbsolute && !isUploadedFile,
      });
    }
  }

  return resources;
}

const AGENDA_TIME_PLACEHOLDER_RE = /^1970-01-01T/i;

function computeAgendaTimes(
  item: ApiAgendaItem,
  eventTimezone?: string
): {
  startTime: string;
  endTime?: string;
} {
  if (item.date && item.startTime) {
    const dateStr = item.date.split("T")[0];
    const timeStr = item.startTime.split("T")[1] ?? "";
    const isPlaceholderFormat = AGENDA_TIME_PLACEHOLDER_RE.test(item.startTime);

    const startTime =
      isPlaceholderFormat && eventTimezone
        ? parseAgendaTimeAsLocal(dateStr, timeStr, eventTimezone)
        : `${dateStr}T${timeStr}`;

    let endTime: string | undefined;
    if (item.duration) {
      const startDate = parseUtcIso(startTime);
      endTime = new Date(
        startDate.getTime() + item.duration * 60 * 1000
      ).toISOString();
    }

    return { startTime, endTime };
  }

  return {
    startTime: item.startTime ?? new Date().toISOString(),
    endTime: undefined,
  };
}

function adaptScheduleItem(
  item: ApiAgendaItem,
  eventTimezone?: string
): {
  id: string;
  title: string;
  startTime: string;
  endTime?: string;
  description?: string;
  type?: ScheduleItemType;
  location?: string;
  duration?: number;
  roomId?: string | null;
  room?: { id: string; name: string } | null;
  speakers?: AgendaSpeaker[];
} {
  const { startTime, endTime } = computeAgendaTimes(item, eventTimezone);
  const type = item.type ? AGENDA_TYPE_MAP[item.type] : undefined;

  return {
    id: item.id,
    title: item.title,
    startTime,
    endTime,
    description: item.description,
    type,
    location: item.location,
    duration: item.duration,
    roomId: item.roomId ?? null,
    room: item.room ?? null,
    speakers: item.speakers?.map(adaptAgendaSpeaker),
  };
}

function adaptOrganization(org: ApiOrganization): EventOrganization {
  return {
    id: org.id,
    name: org.name,
    companyName: org.companyName,
    logoUrl: resolveMediaUrl(org.logoUrl),
    description: org.description,
  };
}

/**
 * Резолвит coverImage: шаблон template:/gradient: возвращается как есть,
 * абсолютный URL — как есть, относительный путь — через resolveMediaUrl.
 */
export function processCoverImage(coverImage: unknown): string | undefined {
  if (!coverImage || typeof coverImage !== "string") {
    return undefined;
  }

  if (
    coverImage.startsWith("template:") ||
    coverImage.startsWith("gradient:")
  ) {
    return coverImage;
  }

  if (coverImage.startsWith("http://") || coverImage.startsWith("https://")) {
    return coverImage;
  }

  return resolveMediaUrl(coverImage);
}

function normalizeEventText(value: unknown): string {
  return extractTextFromBlocks(value);
}

// eslint-disable-next-line complexity, @typescript-eslint/explicit-function-return-type
export function adaptApiEventToEventDetail(
  apiEvent: Record<string, unknown>,
  t: Translator
) {
  const format = FORMAT_MAP[apiEvent.format as string] ?? "offline";
  const eventTimezone =
    (apiEvent.timezone as string | undefined) ?? "Asia/Tashkent";
  const agendaItems = apiEvent.agendaItems as ApiAgendaItem[] | undefined;
  const speakers = apiEvent.speakers as ApiSpeaker[] | undefined;
  const organization = apiEvent.organization as ApiOrganization | undefined;

  const coverImage = processCoverImage(apiEvent.coverImage);
  const shortDesc =
    apiEvent.shortDescription ?? apiEvent.short_desc ?? apiEvent.shortDesc;
  const rawDescription = apiEvent.description ?? shortDesc;
  const descriptionStr =
    normalizeEventText(rawDescription) || normalizeEventText(shortDesc) || "";
  const summaryStr = shortDesc ? normalizeEventText(shortDesc) : "";
  const heroTaglineStr = shortDesc ? normalizeEventText(shortDesc) : "";
  const descriptionBlocks = Array.isArray(rawDescription) ? rawDescription : [];

  const venue = apiEvent.venue as string | undefined;
  const address = apiEvent.address as string | undefined;
  const city = apiEvent.city as string | undefined;
  const onlineUrl = apiEvent.onlineUrl as string | undefined;
  const latitude = apiEvent.latitude as string | undefined;
  const longitude = apiEvent.longitude as string | undefined;
  const mapUrl =
    longitude != null &&
    latitude != null &&
    String(longitude).trim() !== "" &&
    String(latitude).trim() !== ""
      ? `https://yandex.ru/maps/?pt=${encodeURIComponent(String(longitude).trim())},${encodeURIComponent(String(latitude).trim())}&z=16`
      : undefined;

  let locationStr: string | undefined;
  if (format === "online") {
    locationStr = t("public.events.formats.online");
  } else if (venue) {
    locationStr = city ? `${venue}, ${city}` : venue;
  } else if (address) {
    locationStr = city ? `${address}, ${city}` : address;
  } else if (city) {
    locationStr = city;
  }

  const heroMetrics: Array<{ label: string; value: string; hint?: string }> =
    [];
  const registrationsCount = apiEvent.registrationsCount as number | undefined;
  const maxParticipants = apiEvent.maxParticipants as number | undefined;

  if (registrationsCount !== undefined) {
    heroMetrics.push({
      label: t("public.events.participants"),
      value: String(registrationsCount),
      hint: maxParticipants
        ? t("public.events.capacity.ofSeats", { count: maxParticipants })
        : undefined,
    });
  }

  const formatLabels: Record<string, string> = {
    online: t("public.events.formats.online"),
    offline: t("public.events.formats.offline"),
    hybrid: t("public.events.formats.hybrid"),
  };
  heroMetrics.push({
    label: t("public.events.format"),
    value: formatLabels[format] ?? t("public.events.formats.offline"),
  });

  const accessType = apiEvent.accessType as string | undefined;
  const accessMap: Record<string, "open" | "request" | "invite" | "private"> = {
    OPEN: "open",
    REQUEST: "request",
    INVITE_ONLY: "invite",
    PRIVATE: "private",
  };
  const access = (accessType ? accessMap[accessType] : undefined) ?? "open";

  const apiCategories = Array.isArray(apiEvent.categories)
    ? (apiEvent.categories as Array<{ slug?: string; name?: string }>)
    : [];
  const categoryNames = apiCategories
    .map((category) => category?.name)
    .filter((name): name is string => typeof name === "string" && name.length > 0);
  const primaryCategorySlug = apiCategories[0]?.slug;

  return {
    id: apiEvent.id as string,
    slug: (apiEvent.slug as string) || (apiEvent.id as string),
    title: apiEvent.title as string,
    description: descriptionStr,
    summary: summaryStr,
    format,
    location: locationStr,
    startDate: apiEvent.startDate as string,
    endDate: apiEvent.endDate as string | undefined,
    imageUrl: coverImage,
    tags: apiEvent.tags as string[] | undefined,
    allowsGroupRegistration: false,
    hasUnlimitedCapacity: !maxParticipants,
    capacity: maxParticipants,
    hasCertificate: false,
    category: mapEventCategory(primaryCategorySlug),
    categories: categoryNames,
    access,
    pricing: apiEvent.type === "FREE" ? ("free" as const) : ("paid" as const),
    price: apiEvent.price as number | undefined,
    heroBadge: categoryNames[0] ?? t("public.events.badges.default"),
    heroTagline: heroTaglineStr,
    heroMetrics,
    heroImage: coverImage,
    descriptionBlocks,
    highlights: Array.isArray(apiEvent.highlights) ? apiEvent.highlights : [],
    schedule: Array.isArray(agendaItems)
      ? agendaItems.map((it) => adaptScheduleItem(it, eventTimezone))
      : [],
    rooms: Array.isArray(apiEvent.rooms)
      ? (apiEvent.rooms as ApiEventRoom[]).map((r) => ({
          id: r.id,
          name: r.name,
          sortOrder: r.sortOrder,
        }))
      : [],
    speakers: Array.isArray(speakers) ? speakers.map(adaptSpeaker) : [],
    logistics: {
      venue,
      address,
      city,
      latitude,
      longitude,
      mapUrl,
      onlineUrl,
      timezone: eventTimezone,
      registrationDeadline: apiEvent.registrationDeadline as string | undefined,
    },
    resources: buildEventResources(apiEvent.id as string, agendaItems),
    faqs: Array.isArray(apiEvent.faqs) ? apiEvent.faqs : [],
    organization: organization ? adaptOrganization(organization) : undefined,
    registrationsCount,
    commentsEnabled: Boolean(apiEvent.commentsEnabled),
    primaryCta: {
      label: t("public.events.registration.register"),
      href: `/events/${(apiEvent.slug as string) ?? apiEvent.id}/register`,
    },
  };
}
