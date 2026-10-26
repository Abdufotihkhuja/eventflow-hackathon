export type EventFormat = "online" | "offline" | "hybrid";

export type EventAccess = "open" | "request" | "invite" | "private";

export type EventPricing = "free" | "paid";

export type EventCategory =
  | "business-training"
  | "business-meetings"
  | "workshops"
  | "conference"
  | "forum"
  | "hackathon"
  | "ideathon";

export interface Event {
  id: string;
  /** Slug для URL (например /events/:slug) */
  slug?: string;
  title: string;
  description: string;
  format: EventFormat;
  location?: string;
  allowsGroupRegistration: boolean;
  hasUnlimitedCapacity: boolean;
  capacity?: number;
  hasCertificate: boolean;
  category: EventCategory;
  startDate: string;
  endDate?: string;
  /** Дедлайн регистрации (ISO), если задан организатором */
  registrationDeadline?: string;
  access: EventAccess;
  pricing: EventPricing;
  price?: number;
  /** Код валюты (UZS, RUB и т.д.) — из API */
  currency?: string;
  imageUrl?: string;
  tags?: string[];
  isHighlighted?: boolean;
  /** Название организатора */
  organizer?: string;
  /** ID организации — для ссылки на профиль организатора */
  organizationId?: string;
  /** Логотип организации — для карточек и списков */
  organizerLogoUrl?: string;
}

export interface EventMetric {
  label: string;
  value: string;
  hint?: string;
}

export interface EventHighlight {
  id: string;
  title: string;
  description: string;
  icon?: string;
}

export type ScheduleItemType =
  | "keynote"
  | "workshop"
  | "panel"
  | "break"
  | "networking"
  | "registration"
  | "presentation"
  | "qa"
  | "other";

export interface EventScheduleItem {
  id: string;
  title: string;
  startTime: string;
  endTime?: string;
  description?: string;
  speakerId?: string;
  type?: ScheduleItemType;
  location?: string;
  duration?: number;
  /** Спикеры, привязанные к этому элементу программы */
  speakers?: AgendaSpeaker[];
  /** FK на per-event EventRoom; используется для фильтра-табов агенды. */
  roomId?: string | null;
  /** Локализованное имя зала (резолв на бэке по запрошенной локали). */
  room?: { id: string; name: string } | null;
}

/** Per-event hall (зал/сцена). Backend возвращает уже локализованное name. */
export interface EventRoom {
  id: string;
  name: string;
  sortOrder: number;
}

export interface EventSpeakerSocial {
  platform:
    | "linkedin"
    | "instagram"
    | "facebook"
    | "telegram"
    | "website";
  url: string;
}

export interface EventSpeaker {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  bio: string;
  avatarUrl?: string;
  company?: string;
  socials?: EventSpeakerSocial[];
}

/** Спикер внутри элемента программы */
export interface AgendaSpeaker {
  id: string;
  firstName: string;
  lastName: string;
  position?: string;
  company?: string;
  avatarUrl?: string;
}

export interface EventFaq {
  id: string;
  question: string;
  answer: string;
}

export interface EventResource {
  id: string;
  label: string;
  description?: string;
  href: string;
  /**
   * true — внешняя ссылка (открывать в новой вкладке, target=_blank).
   * false/undefined — загружаемый файл (стримим через публичный API).
   */
  isExternal?: boolean;
}

export interface EventOrganization {
  id: string;
  name: string;
  companyName?: string;
  logoUrl?: string;
  description?: string;
}

export interface EventLogistics {
  venue?: string;
  address?: string;
  city?: string;
  /** Широта для карты (Яндекс.Карты) */
  latitude?: string;
  /** Долгота для карты (Яндекс.Карты) */
  longitude?: string;
  mapUrl?: string;
  onlineUrl?: string;
  timezone: string;
  registrationOpens?: string;
  registrationCloses?: string;
  registrationDeadline?: string;
  accessNotes?: string;
}

export interface EventGalleryImage {
  src: string;
  alt: string;
}

export type EventInfoIcon =
  | "calendar"
  | "monitor"
  | "ticket"
  | "building"
  | "users"
  | "location";

export interface EventInfoBlock {
  id: string;
  title: string;
  description: string;
  icon?: EventInfoIcon;
}

export interface EventPreparationTip {
  id: string;
  title: string;
  description: string;
}

export interface EventBenefitItem {
  id: string;
  title: string;
  description: string;
}

export interface EventDetail extends Event {
  slug: string;
  summary: string;
  /** Локализованные названия тематик события (M2M) */
  categories?: string[];
  heroBadge: string;
  heroTagline: string;
  heroMetrics: EventMetric[];
  heroImage?: string;
  heroImageAlt?: string;
  gallery?: EventGalleryImage[];
  overviewTitle?: string;
  overviewDescription?: string;
  infoBlocks?: EventInfoBlock[];
  preparationTips?: EventPreparationTip[];
  benefits?: EventBenefitItem[];
  primaryCta: {
    label: string;
    href: string;
  };
  secondaryCta?: {
    label: string;
    href: string;
  };
  highlights: EventHighlight[];
  schedule: EventScheduleItem[];
  /** Per-event halls (залы) — для фильтра-табов агенды. */
  rooms?: EventRoom[];
  speakers: EventSpeaker[];
  logistics: EventLogistics;
  resources?: EventResource[];
  faqs?: EventFaq[];
  /** Блоки BlockNote для rich-рендера description (заголовки, списки, жирный текст) */
  descriptionBlocks?: Array<{
    id?: string;
    type?: string;
    props?: Record<string, unknown>;
    content?: Array<{ text?: string; type?: string; styles?: Record<string, unknown> }>;
    children?: unknown[];
  }>;
  /** Организация, проводящая событие */
  organization?: EventOrganization;
  /** Количество зарегистрированных участников */
  registrationsCount?: number;
  /** Показывать секцию комментариев (из API) */
  commentsEnabled?: boolean;
  /** Регистрация текущего пользователя (при запросе с JWT) */
  myRegistration?: { id: string; status: string; eventId: string } | null;
}
