// ================================
// Public Events Types (для публичной части)
// ================================

import type { EventFormat, EventStatus, EventType, Speaker, AgendaItem } from './event.types'

export type PublicEvent = {
  id: string
  title: string
  description: string
  type: EventType
  format: EventFormat
  status: EventStatus

  // Даты
  startDate: string
  endDate: string
  registrationDeadline?: string
  isMultiDay: boolean

  // Локация
  location?: string
  city?: string
  country?: string
  coordinates?: { lat: number; lng: number }

  // Финансы
  price?: number
  currency?: string
  isFree: boolean

  // Изображения
  coverImage?: string
  images?: string[]

  // Вместимость
  maxParticipants?: number
  currentParticipants: number
  spotsLeft?: number
  isFullyBooked: boolean

  // Организатор
  organizer: {
    id: string
    name: string
    logo?: string
    verified: boolean
  }

  // Спикеры и агенда
  speakers?: Speaker[]
  agenda?: AgendaItem[]

  // Категории/теги
  categories?: string[]
  tags?: string[]

  // Публичный URL
  slug?: string

  // Метаданные
  createdAt: string
  viewsCount: number
}

// ================================
// Request/Response Types
// ================================

export type SearchEventsParams = {
  page?: number
  limit?: number
  search?: string
  type?: EventType | EventType[]
  format?: EventFormat | EventFormat[]
  status?: EventStatus
  isFree?: boolean
  category?: string
  city?: string
  country?: string
  dateFrom?: string
  dateTo?: string
  sortBy?: 'startDate' | 'createdAt' | 'popularity' | 'price'
  sortOrder?: 'asc' | 'desc'
}

export type SearchEventsResponse = {
  events: PublicEvent[]
  total: number
  page: number
  limit: number
  facets?: {
    types: { value: string; count: number }[]
    formats: { value: string; count: number }[]
    cities: { value: string; count: number }[]
    priceRanges: { min: number; max: number; count: number }[]
  }
}

export type GetPublicEventResponse = PublicEvent & {
  registrationQuestions: {
    id: string
    question: string
    type: string
    required: boolean
    options?: string[]
  }[]
  isRegistrationOpen: boolean
  isRegistered?: boolean // если пользователь авторизован
  userRegistration?: {
    id: string
    status: string
    registeredAt: string
  }
}

export type GetFeaturedEventsResponse = {
  events: PublicEvent[]
}

export type GetUpcomingEventsResponse = {
  events: PublicEvent[]
}

export type GetSimilarEventsResponse = {
  events: PublicEvent[]
}
