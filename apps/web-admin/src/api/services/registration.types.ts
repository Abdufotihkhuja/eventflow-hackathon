// ================================
// Registration Types
// ================================

export const RegistrationStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED', // Подтверждена (обновленное API)
  CONFIRMED: 'CONFIRMED', // Deprecated: используйте APPROVED
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
  WAITLIST: 'WAITLIST',
} as const

export type RegistrationStatus = (typeof RegistrationStatus)[keyof typeof RegistrationStatus]

export const RegistrationRole = {
  PARTICIPANT: 'PARTICIPANT',
  SPEAKER: 'SPEAKER',
  ORGANIZER: 'ORGANIZER',
  VOLUNTEER: 'VOLUNTEER',
} as const

export type RegistrationRole = (typeof RegistrationRole)[keyof typeof RegistrationRole]

// Типы полей вопросов
export const QuestionType = {
  TEXT: 'TEXT',
  TEXTAREA: 'TEXTAREA',
  NUMBER: 'NUMBER',
  SELECT: 'SELECT',
  CHECKBOX: 'CHECKBOX',
} as const

export type QuestionType = (typeof QuestionType)[keyof typeof QuestionType]

// Категории вопросов
export const QuestionCategory = {
  OPEN: 'OPEN', // Открытый — развернутый ответ
  CLOSED: 'CLOSED', // Закрытый — Да/Нет
  ALTERNATIVE: 'ALTERNATIVE', // Выбор из вариантов
  RHETORICAL: 'RHETORICAL', // Информационный текст
} as const

export type QuestionCategory = (typeof QuestionCategory)[keyof typeof QuestionCategory]

// Вопрос для организаторов (с правильными ответами)
export type RegistrationQuestion = {
  id: string
  eventId: string
  question: string
  type: QuestionType
  category: QuestionCategory
  isRequired: boolean
  options: string[] // Варианты для SELECT/CHECKBOX
  informationalText?: string | null // Текст для RHETORICAL
  sortOrder: number
  // Поля для тестов (только для организаторов)
  points: number // Баллы за правильный ответ
  correctAnswer?: string | null // Правильный ответ для TEXT/NUMBER/TEXTAREA
  correctOptions: string[] // Правильные варианты для SELECT/CHECKBOX
  createdAt: string
  updatedAt: string
}

// Вопрос для участников (БЕЗ правильных ответов)
export type PublicQuestion = {
  id: string
  eventId: string
  question: string
  type: QuestionType
  category: QuestionCategory
  isRequired: boolean
  options: string[]
  informationalText?: string | null
  sortOrder: number
  createdAt: string
  updatedAt: string
}

// Ответ участника на вопрос (обновленный формат API)
export type QuestionAnswer = {
  id: string
  answer: string
  question: {
    id: string
    question: string
    isRequired: boolean
  }
}

// Данные пользователя в регистрации
export type RegistrationUser = {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
}

// Регистрация участника (обновленный формат API)
export type Registration = {
  id: string
  eventId: string
  userId: string

  // Статус и роль
  status: RegistrationStatus
  role: RegistrationRole

  // QR-код для check-in
  qrCode: string

  // Поездка
  travelStartDate?: string | null
  travelEndDate?: string | null
  preparationDays: number

  // Даты
  createdAt: string
  updatedAt: string
  confirmedAt?: string
  rejectedAt?: string
  cancelledAt?: string
  rejectionReason?: string

  // Вложенные данные
  user: RegistrationUser
  answers?: QuestionAnswer[]

  // Результаты теста (режим TEST)
  testScore?: number | null
  testPassed?: boolean | null

  // Оплата (для платных событий)
  paymentStatus?: 'pending' | 'paid' | 'refunded' | 'failed'
  paymentAmount?: number
  paymentCurrency?: string
  paymentId?: string

  // Сертификат
  certificateIssued?: boolean
  certificateUrl?: string
}

// ================================
// Request/Response Types
// ================================

// Registration Questions
export type CreateQuestionRequest = {
  question: string
  type: QuestionType
  category: QuestionCategory
  isRequired?: boolean
  options?: string[] // Обязательно для SELECT/CHECKBOX
  points?: number // Баллы за правильный ответ (для тестов)
  correctAnswer?: string // Правильный ответ для TEXT/NUMBER/TEXTAREA
  correctOptions?: string[] // Правильные варианты для SELECT/CHECKBOX
  informationalText?: string // Текст для RHETORICAL вопросов
  sortOrder?: number
}

export type UpdateQuestionRequest = Partial<CreateQuestionRequest>

export type GetQuestionsResponse = RegistrationQuestion[]

export type GetPublicQuestionsResponse = PublicQuestion[]

export type ReorderQuestionsRequest = {
  questionIds: string[]
}

// Registrations
export type CreateRegistrationRequest = {
  firstName?: string // Опционально, если пользователь авторизован
  lastName?: string // Опционально, если пользователь авторизован
  email?: string // Опционально, если пользователь авторизован
  phone?: string
  role?: RegistrationRole
  travelStartDate?: string | null
  travelEndDate?: string | null
  preparationDays?: number
  answers?: Array<{
    questionId: string
    answer: string
  }>
}

export type UpdateRegistrationRequest = {
  status?: RegistrationStatus
  rejectionReason?: string
}

export type GetRegistrationsParams = {
  page?: number
  limit?: number
  status?: RegistrationStatus | 'APPROVED' // Поддержка нового статуса
  search?: string
  sortBy?: 'registeredAt' | 'firstName' | 'lastName' | 'email' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
}

export type GetRegistrationsResponse = {
  data: Registration[] // Изменено с registrations на data согласно новому API
  total: number
  page: number
  limit: number
  totalPages: number // Добавлено согласно новому API
  stats?: {
    // Опционально, может не возвращаться
    total: number
    pending: number
    approved: number
    confirmed: number
    rejected: number
    cancelled: number
    waitlist: number
  }
}

export type BulkUpdateRegistrationsRequest = {
  registrationIds: string[]
  status: RegistrationStatus
  rejectionReason?: string
}

export type BulkUpdateRegistrationsResponse = {
  updated: number
  failed: number
  errors?: { id: string; error: string }[]
}

export type ExportRegistrationsRequest = {
  format: 'csv' | 'xlsx'
  fields?: string[]
  status?: RegistrationStatus
}

export type ExportRegistrationsResponse = {
  downloadUrl: string
}
