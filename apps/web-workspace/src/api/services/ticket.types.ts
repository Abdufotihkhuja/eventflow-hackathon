// ================================
// Ticket Types
// ================================

/**
 * Дизайн билета
 * - branded: фирменный дизайн с логотипом организации
 * - simple: простой дизайн для печати
 */
export const TicketDesign = {
  BRANDED: 'branded',
  SIMPLE: 'simple',
} as const

export type TicketDesign = (typeof TicketDesign)[keyof typeof TicketDesign]

// ================================
// Request/Response Types
// ================================

/**
 * Параметры для скачивания одного билета
 */
export type DownloadTicketParams = {
  registrationId: string
  design: TicketDesign
}

/**
 * Запрос на массовое скачивание билетов
 */
export type DownloadAllTicketsRequest = {
  /** Дизайн билетов (по умолчанию branded) */
  design?: TicketDesign
  /** Фильтр по статусу регистрации */
  status?: string
  /** Конкретные ID регистраций для скачивания */
  registrationIds?: string[]
}

/**
 * URLs билетов в обоих дизайнах
 * Возвращается при check-in для быстрого доступа
 */
export type TicketUrls = {
  branded: string
  simple: string
}

/**
 * Результат check-in с ссылками на билеты
 */
export type CheckInResult = {
  attendance: {
    id: string
    checkInAt: Date
    checkInDate: Date
  }
  participant: {
    id: string
    firstName: string | null
    lastName: string | null
    email: string
    role: string
  }
  registration: {
    id: string
    status: string
  }
  /** Ссылки для скачивания билетов в обоих форматах */
  ticketUrls: TicketUrls
}
