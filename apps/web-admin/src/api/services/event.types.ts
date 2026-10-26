// Типы событий (платность)
export const EventType = {
  FREE: 'FREE',
  PAID: 'PAID',
} as const

export type EventType = (typeof EventType)[keyof typeof EventType]

// Тип доступа к событию (соответствует Prisma EventAccessType)
export const AccessType = {
  OPEN: 'OPEN', // Открытая регистрация — любой может зарегистрироваться
  REQUEST: 'REQUEST', // По запросу — регистрация требует одобрения организатора
  INVITE_ONLY: 'INVITE_ONLY', // Только по приглашению — доступ по ссылке или коду (inviteCode)
  PRIVATE: 'PRIVATE', // Приватное событие — не попадает в публичный каталог и не допускает внешнюю регистрацию
} as const

export type AccessType = (typeof AccessType)[keyof typeof AccessType]

// Формат события
export const EventFormat = {
  ONLINE: 'ONLINE',
  OFFLINE: 'OFFLINE',
  HYBRID: 'HYBRID',
} as const

export type EventFormat = (typeof EventFormat)[keyof typeof EventFormat]

export const EventStatus = {
  DRAFT: 'DRAFT',
  PENDING_REVIEW: 'PENDING_REVIEW',
  PUBLISHED: 'PUBLISHED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const

export type EventStatus = (typeof EventStatus)[keyof typeof EventStatus]

export const ParticipantStatus = {
  PENDING: 'PENDING', // Ожидает подтверждения
  CONFIRMED: 'CONFIRMED', // Подтвержден
  ATTENDED: 'ATTENDED', // Посетил
  CANCELLED: 'CANCELLED', // Отменил участие
} as const

export type ParticipantStatus = (typeof ParticipantStatus)[keyof typeof ParticipantStatus]

export const Gender = {
  MALE: 'MALE',
  FEMALE: 'FEMALE',
  OTHER: 'OTHER',
} as const

export type Gender = (typeof Gender)[keyof typeof Gender]

// Спикер события
export type Speaker = {
  id: string
  firstName: string
  lastName: string
  position: string // Должность/звание
  company?: string
  bio?: string
  avatarUrl?: string
  linkedinUrl?: string
  websiteUrl?: string
}

// Элемент агенды (программы)
// Backend контракт: startTime (ISO datetime), duration (minutes), type (enum)
export type AgendaItemType =
  | 'KEYNOTE'
  | 'PRESENTATION'
  | 'WORKSHOP'
  | 'PANEL'
  | 'NETWORKING'
  | 'BREAK'

export type AgendaItem = {
  id: string
  eventId: string
  title: string
  description: string | null
  type: AgendaItemType
  startTime: string // ISO datetime (только время важно, дата - epoch)
  duration: number // Длительность в минутах
  location: string | null
  materials: string[]
  sortOrder: number
  createdAt: string
  updatedAt: string
  speakers: Array<{ id: string; firstName: string; lastName: string }>
}

// BlockNote описание (структура редактора)
export type BlockNoteContent = {
  text: string
  type: 'text'
  styles: Record<string, unknown>
}

export type BlockNoteBlock = {
  id: string
  type: string
  props: Record<string, unknown>
  content: BlockNoteContent[] | string
  children: BlockNoteBlock[]
}

// Описание может быть строкой, массивом блоков или null
// Backend возвращает description как массив блоков напрямую (не в { blocks: [] })
export type EventDescription = string | BlockNoteBlock[] | null

// Режим регистрации
export const RegistrationMode = {
  SIMPLE: 'SIMPLE', // Простая регистрация
  QUESTIONS: 'QUESTIONS', // С вопросами
  TEST: 'TEST', // С тестом
} as const

export type RegistrationMode = (typeof RegistrationMode)[keyof typeof RegistrationMode]

// Тип оценки теста
export const TestEvaluationType = {
  AUTO: 'AUTO',
  MANUAL: 'MANUAL',
} as const

export type TestEvaluationType = (typeof TestEvaluationType)[keyof typeof TestEvaluationType]

// Организация
export type Organization = {
  id: string
  companyName: string
  logoUrl?: string | null
}

// Базовая информация о событии
export type Event = {
  id: string
  organizationId: string
  title: string
  description: EventDescription
  shortDescription?: string | null
  coverImage?: string | null
  type: EventType
  accessType: AccessType
  format: EventFormat
  status: EventStatus

  // Даты
  startDate: string // ISO datetime
  endDate: string // ISO datetime
  registrationDeadline?: string | null // ISO datetime - дедлайн регистрации

  // Локация
  venue?: string | null // Название площадки
  address?: string | null // Полный адрес
  city?: string | null // Город
  latitude?: number | null // Широта для карты
  longitude?: number | null // Долгота для карты
  placeId?: string | null // ID места в Yandex (ymapsbm1://org/...)
  onlineUrl?: string | null // Ссылка на Zoom/Google Meet

  // Финансы — API возвращает price как string
  price?: string | number | null
  currency?: string | null

  // Вместимость
  maxParticipants?: number | null
  inviteCode?: string | null

  // Комментарии
  commentsEnabled?: boolean | null

  // Регистрация и тесты
  registrationMode?: RegistrationMode
  testEvaluationType?: TestEvaluationType | null
  minTestScore?: number | null
  maxTestScore?: number | null

  // Модерация
  rejectionReason?: string | null
  isFeatured?: boolean

  // Публичный URL (slug)
  slug?: string | null

  // Метаданные
  createdAt: string
  updatedAt: string

  // Счётчики из API
  _count?: {
    registrations: number
  }

  // Организация (вложенная)
  organization?: Organization

  // Спикеры и агенда (подгружаются отдельно или могут быть вложены)
  speakers?: Speaker[]
  agenda?: AgendaItem[]
  agendaItems?: AgendaItem[] // Альтернативное имя из API

  // Вопросы регистрации и теги
  registrationQuestions?: CustomRegistrationQuestion[]
  tags?: Array<{ id: string; name: string; slug: string }>

  // Доп. поля (опционально, для полной версии события)
  images?: string[]
  requiresApproval?: boolean
  certificateTemplateUrl?: string
  certificateNamePosition?: { x: number; y: number }
  viewsCount?: number
  registrationsCount?: number
  attendanceRate?: number
  organizerName?: string
}

// Участник события
export type EventParticipant = {
  id: string
  eventId: string
  userId: string

  // Личная информация
  firstName: string
  lastName: string
  email: string
  phone?: string
  age?: number
  gender?: Gender

  // Статус
  status: ParticipantStatus
  registeredAt: string
  confirmedAt?: string

  // Кастомные поля (вопросы при регистрации)
  customFields?: Record<string, string | number | boolean>

  // Сертификат
  certificateIssued: boolean
  certificateIssuedAt?: string
  certificateUrl?: string
}

/** Участник в ответе GET /events/:id/attendance (массив по дням) */
export type AttendanceAttendeeApi = {
  userId: string
  userName: string
  userEmail: string
  checkInAt: string // ISO datetime
}

/** Элемент массива GET /events/:id/attendance (формат по дням) */
export type AttendanceByDayApiItem = {
  date: string // YYYY-MM-DD
  total: number
  attendees: AttendanceAttendeeApi[]
}

/** Сырой ответ GET /events/:id/attendance — может быть массив по дням */
export type RawAttendanceResponse = AttendanceByDayApiItem[]

// Посещаемость по дням (для многодневных событий)
export type AttendanceRecord = {
  id: string
  eventId: string
  participantId: string
  date: string // ISO date (YYYY-MM-DD)
  attended: boolean
  checkInTime?: string // ISO datetime
  checkOutTime?: string
  notes?: string
  /** Для отображения в табе посещаемости (нормализованные данные) */
  registrationId?: string
  /** present = посетил, absent = отсутствовал, pending = не отмечен */
  status?: 'present' | 'absent' | 'pending'
  registration?: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
}

// Сообщение в чате события
export type EventChatMessage = {
  id: string
  eventId: string
  authorId: string
  authorName: string
  authorRole: 'organizer' | 'participant'
  message: string
  createdAt: string
  isAnnouncement: boolean // Отправляется ли как уведомление
}

// Кастомный вопрос при регистрации
export type CustomRegistrationQuestion = {
  id: string
  question: string
  type: 'text' | 'number' | 'select' | 'checkbox' | 'textarea'
  required: boolean
  options?: string[] // Для select
}

// Запросы и ответы API

export type CreateEventRequest = {
  title: string
  slug?: string // Опционально; при отсутствии backend генерирует из title
  description: EventDescription // Может быть строкой или массивом BlockNote блоков
  shortDescription?: string
  coverImage?: string // URL или путь к загруженному изображению
  bannerFile?: File // Файл баннера для загрузки через FormData
  type: EventType
  accessType?: AccessType
  format: EventFormat
  startDate: string // ISO 8601 date string
  endDate: string // ISO 8601 date string
  registrationDeadline?: string // ISO 8601 date string (не позже startDate)
  venue?: string // Название площадки
  address?: string // Полный адрес
  city?: string // Город
  latitude?: number | null
  longitude?: number | null
  placeId?: string | null
  onlineUrl?: string // Ссылка на Zoom/Google Meet
  price?: number
  currency?: string
  maxParticipants?: number
  commentsEnabled?: boolean
  tagIds?: string[] // ID тегов (максимум 3)
}

export type CreateEventResponse = Event

/** Ответ GET /events/suggest-slug */
export type SuggestEventSlugResponse = { slug: string }

/** Ответ GET /events/check-slug */
export type CheckEventSlugResponse = { available: boolean }

export type UpdateEventRequest = Partial<CreateEventRequest>

export type UpdateEventResponse = Event

export type GetEventsRequest = {
  page?: number
  limit?: number
  status?: EventStatus
  type?: EventType
  search?: string
  sortBy?: 'createdAt' | 'startDate' | 'title'
  sortOrder?: 'asc' | 'desc'
}

export type GetEventsResponse = {
  data: Event[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export type GetEventParticipantsRequest = {
  eventId: string
  page?: number
  limit?: number
  status?: ParticipantStatus
  search?: string
}

export type GetEventParticipantsResponse = {
  participants: EventParticipant[]
  total: number
  page: number
  limit: number
}

export type GetAttendanceRequest = {
  eventId: string
  date?: string // Если не указано, за все дни
}

export type GetAttendanceResponse = {
  records: AttendanceRecord[]
  dates: string[] // Список всех дат события
}

export type MarkAttendanceRequest = {
  eventId: string
  participantId: string
  date: string
  attended: boolean
  checkInTime?: string
  notes?: string
}

export type MarkAttendanceResponse = AttendanceRecord

export type ExportParticipantsRequest = {
  eventId: string
  format: 'csv' | 'xlsx'
  fields?: string[] // Какие поля экспортировать
}

export type ExportParticipantsResponse = {
  downloadUrl: string
}

export type UploadCertificateTemplateRequest = {
  eventId: string
  file: File
  namePosition: { x: number; y: number }
}

export type UploadCertificateTemplateResponse = {
  templateUrl: string
}

export type SendEventAnnouncementRequest = {
  eventId: string
  message: string
}

export type SendEventAnnouncementResponse = EventChatMessage

export type GetEventChatRequest = {
  eventId: string
  page?: number
  limit?: number
}

export type GetEventChatResponse = {
  messages: EventChatMessage[]
  total: number
  page: number
  limit: number
}

export type UpdateParticipantStatusRequest = {
  eventId: string
  participantId: string
  status: ParticipantStatus
}

export type UpdateParticipantStatusResponse = EventParticipant

// ================================
// Event Comments
// ================================

/** Комментарий к событию (контракт API: userId, user, avatarUrl) */
export type EventComment = {
  id: string
  eventId: string
  userId: string
  parentId: string | null
  content: string
  createdAt: string
  updatedAt: string
  user: {
    id: string
    firstName: string
    lastName: string
    avatarUrl?: string | null
  }
  replies?: EventComment[]
  _count?: { replies: number; likes: number }
  likesCount?: number
  dislikesCount?: number
  userLikeStatus?: 'LIKE' | 'DISLIKE' | null
}

/** Создать комментарий к событию */
export type CreateEventCommentRequest = {
  content: string
}

/** Обновить комментарий к событию */
export type UpdateEventCommentRequest = {
  content: string
}

/** Параметры запроса списка комментариев (API: page, limit) */
export type GetEventCommentsParams = {
  page?: number
  limit?: number
}

/** Ответ с комментариями события (пагинированный, как в API) */
export type GetEventCommentsResponse = {
  data: EventComment[]
  total: number
  page: number
  limit: number
  totalPages?: number
}
