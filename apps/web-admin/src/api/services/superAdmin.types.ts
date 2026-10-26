// ================================
// Super Admin Types
// Согласно реальным ответам API
// ================================

import type { EventDescription } from './event.types'

// Сводка зависимостей организации для подтверждения hard delete (из SDK).
export type { OrganizationDeletePreview } from '@eventflow/sdk-admin'

export type AppBusinessLocale = 'ru' | 'uz' | 'en'
export type BusinessTranslationValues = Record<
  string,
  Partial<Record<AppBusinessLocale, string>>
>
export type BusinessTranslationMeta = Record<
  string,
  Partial<
    Record<
      AppBusinessLocale,
      {
        status:
          | 'empty'
          | 'manual'
          | 'auto_translated'
          | 'edited_after_translation'
          | 'outdated'
          | 'translation_error'
        sourceLocale?: AppBusinessLocale
        sourceHash?: string
        provider?: 'tahrirchi'
        model?: string
        translatedAt?: string
        error?: string
      }
    >
  >
>

/** Точка серии роста платформы (ISO-неделя, понедельник YYYY-MM-DD). */
export type SystemStatsGrowthPoint = {
  weekStart: string
  users: number
  registrations: number
  events: number
}

/** Элемент очереди модерации на дашборде. */
export type SystemStatsModerationItem = {
  id: string
  title: string
  organizationName: string | null
  createdAt: string
  startDate?: string
}

export type EventStatusKey =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'PUBLISHED'
  | 'CANCELLED'
  | 'COMPLETED'

/**
 * Расширенная сводка платформы — GET /api/v1/super-admin/stats
 */
export type SystemStats = {
  totalUsers: number
  totalOrganizations: number
  totalMembers: number
  pendingOrganizations: number
  pendingEvents: number
  /** Опционально для обратной совместимости со старым API */
  pendingBlogPosts?: number
  archivedUsers?: number
  archivedOrganizations?: number
  totalEvents?: number
  eventsByStatus?: Record<EventStatusKey, number>
  totalRegistrations?: number
  totalBlogPosts?: number
  publishedBlogPosts?: number
  newUsers7d?: number
  newUsers30d?: number
  newOrganizations30d?: number
  newRegistrations7d?: number
  newRegistrations30d?: number
  newEvents30d?: number
  growth?: SystemStatsGrowthPoint[]
  moderationQueue?: {
    organizations: SystemStatsModerationItem[]
    events: SystemStatsModerationItem[]
    blogPosts: SystemStatsModerationItem[]
  }
}

/**
 * Пользователь — GET /api/v1/super-admin/users
 */
export type AdminUser = {
  id: string
  email: string
  firstName: string
  lastName: string | null
  avatarUrl?: string | null
  phone?: string | null
  location?: string | null
  bio?: string | null
  authProvider: 'EMAIL' | 'GOOGLE' | 'LINKEDIN'
  providerId?: string | null
  isEmailVerified: boolean
  isPublicProfile: boolean
  showEmail: boolean
  showPhone: boolean
  linkedinUrl?: string | null
  instagramUrl?: string | null
  facebookUrl?: string | null
  websiteUrl?: string | null
  /** Момент архивации (soft delete). null/undefined = активен. */
  deletedAt?: string | null
  /** Кто архивировал (имя супер-админа) и причина. */
  archivedByName?: string | null
  archiveReason?: string | null
  /** Организация и роль по первому членству (если есть). */
  organizationName?: string | null
  roleName?: string | null
  createdAt: string
  updatedAt: string
  /** Агрегаты — только в GET /super-admin/users/:id */
  stats?: AdminUserStats
}

/** Агрегаты пользователя для детальной страницы. */
export type AdminUserStats = {
  registrationsByStatus: Record<
    'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED',
    number
  >
  attendedEvents: number
  certificatesCount: number
  eventCommentsCount: number
  followingCount: number
  memberships: Array<{
    organizationId: string | null
    organizationName: string | null
    roleName: string | null
  }>
}

/**
 * Организация — GET /api/v1/super-admin/organizations
 */
export type AdminOrganization = {
  id: string
  email: string
  name: string
  companyName: string
  inn: string
  description?: string | null
  translations?: BusinessTranslationValues | null
  translationMeta?: BusinessTranslationMeta | null
  phone?: string | null
  logoUrl?: string | null
  /** Отрасль (синхрон с профилем организации) */
  industry?: string | null
  /** Количество сотрудников (синхрон с профилем организации) */
  companySize?: string | number | null
  authProvider: 'EMAIL' | 'GOOGLE' | 'LINKEDIN'
  providerId?: string | null
  isEmailVerified: boolean
  placesFeatureEnabled?: boolean
  verificationStatus: 'PENDING' | 'APPROVED' | 'REJECTED'
  rejectionReason?: string | null
  verifiedAt?: string | null
  /** Момент архивации (soft delete). null/undefined = активна. */
  deletedAt?: string | null
  /** Кто архивировал (имя супер-админа) и причина. */
  archivedByName?: string | null
  archiveReason?: string | null
  createdAt: string
  updatedAt: string
  _count: {
    members: number
    events?: number
  }
  /** Агрегаты — только в GET /super-admin/organizations/:id */
  stats?: AdminOrganizationStats
}

/** Агрегаты организации для детальной страницы. */
export type AdminOrganizationStats = {
  eventsByStatus: Record<EventStatusKey, number>
  totalEvents: number
  totalRegistrations: number
  blogPostsTotal: number
  blogPostsPublished: number
  followersCount: number
  members: Array<{
    id: string
    firstName: string
    lastName: string
    email: string
    position: string | null
    avatarUrl: string | null
    roleName: string
    status: string
  }>
  membersTotal: number
}

/**
 * Событие (админ) — GET /api/v1/super-admin/events
 */
/** Спикер события (payload GET /super-admin/events/:id). */
export type AdminEventSpeaker = {
  id: string
  firstName: string
  lastName: string
  position: string
  company?: string | null
  bio?: string | null
  avatarUrl?: string | null
  linkedinUrl?: string | null
  instagramUrl?: string | null
  facebookUrl?: string | null
  sortOrder?: number
}

/** Пункт программы события (payload GET /super-admin/events/:id). */
export type AdminEventAgendaItem = {
  id: string
  title: string
  description?: string | null
  type: string
  date: string
  startTime: string
  duration: number
  location?: string | null
  materials?: string[]
  sortOrder?: number
}

/** Агрегаты события для детальной страницы. */
export type AdminEventStats = {
  registrationsByStatus: Record<
    'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED',
    number
  >
  checkedInParticipants: number
  certificatesIssued: number
  commentsCount: number
  questionsCount: number
}

export type AdminEvent = {
  id: string
  organizationId: string
  slug?: string
  title: string
  description?: EventDescription
  shortDescription?: string | null
  translations?: BusinessTranslationValues | null
  translationMeta?: BusinessTranslationMeta | null
  coverImage?: string | null
  type: 'FREE' | 'PAID'
  accessType: 'OPEN' | 'REQUEST' | 'INVITE_ONLY' | 'PRIVATE'
  format: 'ONLINE' | 'OFFLINE' | 'HYBRID'
  status: 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED'
  isFeatured: boolean
  startDate: string
  endDate?: string | null
  registrationDeadline?: string | null
  venue?: string | null
  address?: string | null
  city?: string | null
  latitude?: number | null
  longitude?: number | null
  placeId?: string | null
  onlineUrl?: string | null
  price?: number | null
  currency: string
  maxParticipants?: number | null
  inviteCode?: string | null
  commentsEnabled?: boolean | null
  registrationMode?: 'QUESTIONS' | 'TEST' | null
  minTestScore?: number | null
  maxTestScore?: number | null
  rejectionReason?: string | null
  registrationOpen?: boolean
  viewsCount?: number
  createdAt: string
  updatedAt: string
  organization: {
    id: string
    name: string
    companyName: string
    email: string
    verificationStatus: 'PENDING' | 'APPROVED' | 'REJECTED'
  }
  _count: {
    registrations: number
  }
  speakers?: AdminEventSpeaker[]
  agendaItems?: AdminEventAgendaItem[]
  /** Агрегаты — только в GET /super-admin/events/:id */
  stats?: AdminEventStats
}

// ================================
// Request/Response Types
// ================================

// Stats
export type GetSystemStatsResponse = SystemStats

// Users Management
export type AdminRecordStatus = 'active' | 'archived' | 'all'

export type GetAdminUsersParams = {
  page?: number
  limit?: number
  search?: string
  isEmailVerified?: boolean
  includeDeleted?: boolean
  status?: AdminRecordStatus
}

export type GetAdminUsersResponse = {
  data: AdminUser[]
  total: number
  page: number
  limit: number
}

/**
 * Колонки выгрузки пользователей в XLSX.
 * Порядок в файле задаёт бэкенд (каталог users-export.fields.ts), а не порядок
 * выбора в диалоге. Значения совпадают с вайтлистом API.
 */
export type AdminUserExportField =
  | 'firstName'
  | 'lastName'
  | 'email'
  | 'phone'
  | 'gender'
  | 'dateOfBirth'
  | 'age'
  | 'location'
  | 'region'
  | 'languages'
  | 'profileStatus'
  | 'workOrStudyPlace'
  | 'specialization'
  | 'skills'
  | 'shortBio'
  | 'bio'
  | 'linkedinUrl'
  | 'instagramUrl'
  | 'facebookUrl'
  | 'websiteUrl'
  | 'organizationName'
  | 'roleName'
  | 'authProvider'
  | 'isEmailVerified'
  | 'state'
  | 'createdAt'
  | 'updatedAt'
  | 'id'

/** GET /api/v1/super-admin/users/export — фильтры те же, что у списка. */
export type ExportAdminUsersParams = {
  fields: AdminUserExportField[]
  search?: string
  isEmailVerified?: boolean
  status?: AdminRecordStatus
  locale?: 'ru' | 'uz' | 'en'
}

export type ExportAdminUsersResult = {
  blob: Blob
  filename: string
  /** Сколько строк ушло в файл (заголовок X-Export-Total). */
  total: number
}

/** PATCH /api/v1/super-admin/users/:userId */
export type UpdateAdminUserRequest = {
  email?: string
  name?: string
  phone?: string
  location?: string
  bio?: string
  isEmailVerified?: boolean
  isPublicProfile?: boolean
  showEmail?: boolean
  showPhone?: boolean
  linkedinUrl?: string
  instagramUrl?: string
  facebookUrl?: string
  websiteUrl?: string
}

// Organizations Management
export type GetAdminOrganizationsParams = {
  page?: number
  limit?: number
  search?: string
  verificationStatus?: 'PENDING' | 'APPROVED' | 'REJECTED'
  status?: AdminRecordStatus
}

export type GetAdminOrganizationsResponse = {
  data: AdminOrganization[]
  total: number
}

/** PATCH /api/v1/super-admin/organizations/:orgId */
export type UpdateAdminOrganizationRequest = {
  email?: string
  name?: string
  companyName?: string
  inn?: string
  description?: string
  translations?: BusinessTranslationValues
  translationMeta?: BusinessTranslationMeta
  phone?: string
  logoUrl?: string
  isEmailVerified?: boolean
  /** Отрасль (синхрон с профилем организации) */
  industry?: string | null
  /** Количество сотрудников — при отправке только number или null */
  companySize?: number | null
  /** Доступ к модулю арендуемых площадок */
  placesFeatureEnabled?: boolean
}

// Events Management
export type EventStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'PUBLISHED'
  | 'CANCELLED'
  | 'COMPLETED'
export type EventFormat = 'ONLINE' | 'OFFLINE' | 'HYBRID'
export type EventType = 'FREE' | 'PAID'

export type GetAdminEventsParams = {
  page?: number
  limit?: number
  search?: string
  status?: EventStatus
  format?: EventFormat
  type?: EventType
  organizationId?: string
  isFeatured?: boolean
}

export type GetAdminEventsResponse = {
  data: AdminEvent[]
  total: number
  page: number
  limit: number
}

/**
 * Запрос на редактирование события (без изменения статуса)
 * PATCH /api/v1/super-admin/events/{eventId}
 */
export type UpdateAdminEventRequest = {
  title?: string
  description?: string
  shortDescription?: string
  translations?: BusinessTranslationValues
  translationMeta?: BusinessTranslationMeta
  coverImage?: string
  type?: EventType
  accessType?: 'OPEN' | 'REQUEST' | 'INVITE_ONLY' | 'PRIVATE'
  format?: EventFormat
  startDate?: string
  endDate?: string
  registrationDeadline?: string
  venue?: string
  address?: string
  city?: string
  latitude?: number | null
  longitude?: number | null
  placeId?: string | null
  onlineUrl?: string
  price?: number
  currency?: string
  maxParticipants?: number
  commentsEnabled?: boolean
  /** Причина отклонения (макс. 1000) — doc AdminUpdateEventDto */
  rejectionReason?: string
}

/** PATCH /api/v1/super-admin/events/{eventId}/status */
export type SetAdminEventStatusRequest = {
  status: EventStatus
  expectedStatus: EventStatus
  expectedUpdatedAt: string
  reason: string
}

/**
 * Код верификации — GET /api/v1/super-admin/verification-codes
 */
export type VerificationCode = {
  id: string
  code: string
  email: string
  type: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET' | 'EMAIL_CHANGE'
  actorType: 'USER' | 'ORGANIZATION' | 'MEMBER'
  actorId: string | null
  newEmail: string | null
  isUsed: boolean
  usedAt: string | null
  expiresAt: string
  attempts: number
  createdAt: string
}

// Verification Codes Management
export type GetVerificationCodesParams = {
  page?: number
  limit?: number
  type?: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET' | 'EMAIL_CHANGE'
  actorType?: 'USER' | 'ORGANIZATION' | 'MEMBER'
  email?: string
  isUsed?: boolean
  sort?: string
}

export type GetVerificationCodesResponse = {
  data: VerificationCode[]
  total: number
  page: number
  limit: number
}

// ================================
// Blog Management
// ================================

/**
 * Статус статьи блога
 */
export type BlogPostStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'PUBLISHED'

/**
 * Статья блога (админ)
 */
export type AdminBlogPost = {
  id: string
  organizationId: string
  title: string
  slug: string
  /** BlockNote-документ — приходит в GET /super-admin/blog-posts/:id */
  content?: EventDescription
  shortDescription?: string | null
  translations?: BusinessTranslationValues | null
  translationMeta?: BusinessTranslationMeta | null
  coverImage?: string | null
  status: BlogPostStatus
  commentsEnabled: boolean
  readingTime: number
  viewsCount: number
  likesCount: number
  commentsCount: number
  rejectionMessage?: string | null
  createdAt: string
  updatedAt: string
  publishedAt?: string | null
  reviewedAt?: string | null
  organization: {
    id: string
    name: string
    companyName: string
    email: string
    logoUrl?: string | null
  }
  tags: Array<{
    id: string
    name: string
    slug: string
  }>
}

/**
 * Параметры для получения статей блога (админ)
 */
export type GetAdminBlogPostsParams = {
  page?: number
  limit?: number
  search?: string
  status?: BlogPostStatus
  organizationId?: string
  sortBy?: 'createdAt' | 'publishedAt' | 'likesCount' | 'viewsCount'
  sortOrder?: 'asc' | 'desc'
}

/**
 * Ответ со списком статей блога (админ)
 */
export type GetAdminBlogPostsResponse = {
  data: AdminBlogPost[]
  total: number
  page: number
  limit: number
}

/**
 * Запрос на одобрение статьи
 */
export type ApproveBlogPostRequest = void

/**
 * Запрос на отклонение статьи
 */
export type RejectBlogPostRequest = {
  reason?: string
}

// ================================
// Categories (Super Admin)
// ================================

export type AdminCategory = {
  id: string
  name: string
  slug: string
  icon?: string | null
  description?: string | null
  translations?: BusinessTranslationValues | null
  translationMeta?: BusinessTranslationMeta | null
  sortOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type GetAdminCategoriesParams = {
  page?: number
  limit?: number
  search?: string
  isActive?: boolean
}

export type GetAdminCategoriesResponse = {
  data: AdminCategory[]
  total: number
  page?: number
  limit?: number
}

/** Ответ GET /super-admin/categories/check-slug */
export type CheckCategorySlugResponse = {
  available: boolean
}

/** Ответ POST /super-admin/categories/icon-upload — поле url подставлять в icon */
export type CategoryIconUploadResponse = {
  filename: string
  originalName: string
  mimetype: string
  size: number
  url: string
}

export type CreateAdminCategoryRequest = {
  name: string
  slug?: string
  icon?: string
  description?: string
  translations?: BusinessTranslationValues
  translationMeta?: BusinessTranslationMeta
  isActive?: boolean
}

export type UpdateAdminCategoryRequest = Partial<CreateAdminCategoryRequest>

// ================================
// Blog Categories (Super Admin)
// ================================

export type AdminBlogCategory = {
  id: string
  name: string
  slug: string
  description?: string | null
  translations?: BusinessTranslationValues | null
  translationMeta?: BusinessTranslationMeta | null
  sortOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type GetAdminBlogCategoriesParams = {
  page?: number
  limit?: number
  search?: string
  isActive?: boolean
}

export type GetAdminBlogCategoriesResponse = {
  data: AdminBlogCategory[]
  total: number
  page?: number
  limit?: number
}

/** Ответ GET /super-admin/blog-categories/check-slug */
export type CheckBlogCategorySlugResponse = {
  available: boolean
}

export type CreateAdminBlogCategoryRequest = {
  name: string
  slug?: string
  description?: string
  translations?: BusinessTranslationValues
  translationMeta?: BusinessTranslationMeta
  isActive?: boolean
}

export type UpdateAdminBlogCategoryRequest =
  Partial<CreateAdminBlogCategoryRequest>

// ================================
// Collections (Super Admin)
// ================================

/** Ответ GET /super-admin/collections/check-slug */
export type CheckCollectionSlugResponse = {
  available: boolean
}

/** Ответ POST /super-admin/collections/cover-upload — поле url подставлять в coverImage */
export type CollectionCoverUploadResponse = {
  filename: string
  originalName: string
  mimetype: string
  size: number
  url: string
}

export type AdminCollection = {
  id: string
  title: string
  slug: string
  coverImage?: string | null
  gradientStart?: string | null
  gradientEnd?: string | null
  description?: string | null
  translations?: BusinessTranslationValues | null
  translationMeta?: BusinessTranslationMeta | null
  sortOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
  _count?: { events: number }
}

/** Элемент ответа GET /super-admin/collections/:id/events — связь подборка–событие с вложенным event */
export type CollectionEventRelation = {
  collectionId: string
  eventId: string
  sortOrder: number
  addedAt: string
  event: {
    id: string
    title: string
    slug: string
    coverImage?: string | null
    startDate: string
    endDate?: string | null
    format: string
    city?: string | null
    status: string
    organization?: { id: string; name: string; logoUrl?: string | null }
  }
}

/** Событие из GET /super-admin/collections/available-events (минимальные поля, только PUBLISHED и COMPLETED) */
export type AvailableCollectionEvent = {
  id: string
  title: string
  slug: string
  coverImage?: string | null
  startDate: string
  endDate?: string | null
  status: 'PUBLISHED' | 'COMPLETED'
}

export type GetAvailableCollectionEventsParams = {
  page?: number
  limit?: number
  search?: string
}

export type GetAvailableCollectionEventsResponse = {
  data: AvailableCollectionEvent[]
  total: number
  page: number
  limit: number
}

export type GetAdminCollectionsParams = {
  page?: number
  limit?: number
  search?: string
  isActive?: boolean
}

export type GetAdminCollectionsResponse = {
  data: AdminCollection[]
  total: number
  page?: number
  limit?: number
}

export type CreateAdminCollectionRequest = {
  title: string
  slug?: string
  coverImage?: string
  gradientStart?: string
  gradientEnd?: string
  description?: string
  translations?: BusinessTranslationValues
  translationMeta?: BusinessTranslationMeta
  sortOrder?: number
  isActive?: boolean
  eventIds?: string[]
}

export type UpdateAdminCollectionRequest = Partial<
  Omit<CreateAdminCollectionRequest, 'eventIds'>
>

export type AddEventsToCollectionRequest = {
  eventIds: string[]
}

export type RemoveEventsFromCollectionRequest = {
  eventIds: string[]
}

export type ReorderCollectionEventsRequest = {
  eventIds: string[]
}
