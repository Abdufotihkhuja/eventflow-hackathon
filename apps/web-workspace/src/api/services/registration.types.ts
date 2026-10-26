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
  FILE_UPLOAD: 'FILE_UPLOAD', // Загрузка файла(ов) участником
} as const

export type QuestionType = (typeof QuestionType)[keyof typeof QuestionType]

/** Загруженный организатором файл-шаблон. */
export type FileUploadTemplate = {
  url: string
  name: string
  size: number
  mimeType: string
}

/** Настройки вопроса типа FILE_UPLOAD. */
export type FileUploadConfig = {
  description?: string | null
  template?: FileUploadTemplate | null
  maxFileSizeMb: number
  allowedFileTypes: string[]
  allowMultipleFiles: boolean
  maxFiles: number
}

/** Файл-ответ участника (загружается в ответ на вопрос FILE_UPLOAD). */
export type RegistrationAnswerFile = {
  id: string
  questionId: string
  originalName: string
  mimeType: string
  size: number
  status: 'PENDING' | 'ATTACHED'
  uploadedAt: string
}

// Категории вопросов
export const QuestionCategory = {
  OPEN: 'OPEN', // Открытый — развернутый ответ
  CLOSED: 'CLOSED', // Закрытый — Да/Нет
  ALTERNATIVE: 'ALTERNATIVE', // Выбор из вариантов
  RHETORICAL: 'RHETORICAL', // Информационный текст
} as const

export type QuestionCategory = (typeof QuestionCategory)[keyof typeof QuestionCategory]

/**
 * Локализованные текстовые поля вопроса (question / informationalText / correctAnswer).
 * Каждое поле — карта { ru?, uz?, en? }.
 */
export type QuestionTranslations = Partial<
  Record<'question' | 'informationalText' | 'correctAnswer', Partial<Record<'ru' | 'uz' | 'en', string>>>
>

/**
 * Локализованные массивы options. Длина массива в каждой локали должна совпадать
 * с длиной scalar options[]. correctOptions всегда сравнивается против scalar
 * на answer evaluation.
 */
export type QuestionOptionsTranslations = Partial<Record<'ru' | 'uz' | 'en', string[]>>

// Вопрос для организаторов (с правильными ответами)
export type RegistrationQuestion = {
  id: string
  eventId: string
  question: string // legacy fallback; источник истины — translations.question
  type: QuestionType
  category: QuestionCategory
  isRequired: boolean
  options: string[] // Варианты для SELECT/CHECKBOX (scalar fallback)
  informationalText?: string | null // Текст для RHETORICAL (scalar fallback)
  sortOrder: number
  // Поля для тестов (только для организаторов)
  points: number // Баллы за правильный ответ
  correctAnswer?: string | null // Правильный ответ для TEXT/NUMBER/TEXTAREA
  correctOptions: string[] // Правильные варианты для SELECT/CHECKBOX
  createdAt: string
  updatedAt: string
  /** Локализация question/informationalText/correctAnswer (ru/uz/en). */
  translations?: QuestionTranslations | null
  translationMeta?: Record<string, Record<string, unknown>> | null
  /** Локализованные массивы options (по локалям). */
  optionsTranslations?: QuestionOptionsTranslations | null
  /** Настройки для type=FILE_UPLOAD (иначе null). */
  fileUploadConfig?: FileUploadConfig | null
}

// Вопрос для участников (БЕЗ правильных ответов).
// Бэк уже резолвит question/informationalText/options по locale; сохраняем
// translations/optionsTranslations на случай client-side fallback и edit.
export type PublicQuestion = {
  id: string
  eventId: string
  question: string // already localized by backend
  type: QuestionType
  category: QuestionCategory
  isRequired: boolean
  options: string[] // already localized by backend (используется для отображения)
  optionValues?: string[] // scalar values для submit (server-side evaluation)
  informationalText?: string | null
  sortOrder: number
  createdAt: string
  updatedAt: string
  translations?: QuestionTranslations | null
  optionsTranslations?: QuestionOptionsTranslations | null
}

// Ответ участника на вопрос (обновленный формат API)
export type QuestionAnswer = {
  id: string
  answer: string
  question: {
    id: string
    question: string
    isRequired: boolean
    type?: QuestionType
  }
}

// Данные пользователя в регистрации
export type RegistrationUser = {
  id: string
  // Бэкенд может вернуть null для импортированных/неполных профилей — не трогать
  // firstName/lastName напрямую (например [0]); использовать formatUserName/getUserInitials.
  firstName: string | null
  lastName: string | null
  email: string
  phone?: string
  avatarUrl?: string | null
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
  /** Файлы-ответы (для вопросов FILE_UPLOAD). */
  fileUploads?: RegistrationAnswerFile[]

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
  options?: string[] // Обязательно для SELECT/CHECKBOX (scalar values)
  points?: number // Баллы за правильный ответ (для тестов)
  correctAnswer?: string // Правильный ответ для TEXT/NUMBER/TEXTAREA
  correctOptions?: string[] // Правильные варианты для SELECT/CHECKBOX
  informationalText?: string // Текст для RHETORICAL вопросов
  sortOrder?: number
  /** Локализация question/informationalText/correctAnswer (ru/uz/en). */
  translations?: QuestionTranslations
  translationMeta?: Record<string, Record<string, unknown>>
  /** Локализованные массивы options. */
  optionsTranslations?: QuestionOptionsTranslations
  /** Настройки для type=FILE_UPLOAD. */
  fileUploadConfig?: FileUploadConfig
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
