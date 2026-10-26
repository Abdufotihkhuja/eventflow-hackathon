// ================================
// Agenda Types
// ================================

/**
 * Типы элементов программы
 */
export const AgendaItemType = {
  KEYNOTE: 'KEYNOTE',
  PRESENTATION: 'PRESENTATION',
  WORKSHOP: 'WORKSHOP',
  PANEL: 'PANEL',
  NETWORKING: 'NETWORKING',
  BREAK: 'BREAK',
  OPENING: 'OPENING',
  CLOSING: 'CLOSING',
  REGISTRATION: 'REGISTRATION',
  MENTORSHIP: 'MENTORSHIP',
  MENTOR_SESSION: 'MENTOR_SESSION',
  FREE_WORK: 'FREE_WORK',
} as const

export type AgendaItemType = (typeof AgendaItemType)[keyof typeof AgendaItemType]

/**
 * Элемент программы события
 * Backend контракт:
 * - date приходит как ISO datetime ("2026-01-16T00:00:00.000Z"), нормализуется в YYYY-MM-DD
 * - startTime приходит как ISO datetime ("1970-01-01T09:00:00.000Z")
 * - speakers приходит как массив полных объектов Speaker, нормализуется в { id, firstName, lastName }
 */
export type AgendaItem = {
  id: string
  eventId: string
  date: string // Дата проведения (ISO datetime от API, нормализуется в YYYY-MM-DD в UI)
  title: string
  description: string | null
  type: AgendaItemType
  startTime: string // Время начала (ISO datetime от API)
  duration: number // Длительность в минутах
  location: string | null
  materials: string[] // Deprecated: используйте AgendaMaterialsService
  sortOrder: number
  createdAt: string
  updatedAt: string
  speakers: Array<{ id: string; firstName: string; lastName: string }> // Нормализуется из полных объектов Speaker
}

// ================================
// Request/Response Types
// ================================

export type CreateAgendaItemRequest = {
  date: string // Дата проведения (YYYY-MM-DD) — для многодневных событий
  title: string
  type: AgendaItemType
  startTime: string // Формат HH:MM (например: "09:00")
  duration: number // Длительность в минутах (минимум 1)
  sortOrder: number
  description?: string
  location?: string
  speakerIds?: string[]
  // materials теперь управляются через отдельный API (/agenda/{id}/materials)
}

export type UpdateAgendaItemRequest = Partial<CreateAgendaItemRequest>

// API возвращает массив напрямую
export type GetAgendaResponse = AgendaItem[]

export type ReorderAgendaRequest = {
  itemIds: string[]
}

// ================================
// Agenda Materials Types
// ================================
// Соответствие docs/AGENDA_MATERIALS_API.md:
// GET materials → string[] (массив URL)
// POST link → { url, title? }
// DELETE → body { fileUrl }
// Upload response → { filename, originalName, mimetype, size, url }

/**
 * Типы материалов (для отображения на фронте)
 */
export const AgendaMaterialType = {
  FILE: 'FILE',
  LINK: 'LINK',
} as const

export type AgendaMaterialType = (typeof AgendaMaterialType)[keyof typeof AgendaMaterialType]

/**
 * Материал элемента программы (нормализованный для UI из string[] + кэш имён)
 */
export type AgendaMaterial = {
  id: string // url используется как id (для key и delete)
  type: AgendaMaterialType
  name: string // Название для отображения (из кэша или выведено из url)
  url: string // URL файла или внешняя ссылка
  size?: number // Только для FILE, из ответа загрузки
  mimeType?: string // Только для FILE
}

/**
 * Ответ GET /materials — массив URL (загруженные пути и внешние ссылки)
 */
export type GetAgendaMaterialsResponse = string[]

/**
 * Ответ при загрузке одного файла
 */
export type UploadAgendaMaterialResponse = {
  filename: string
  originalName: string
  mimetype: string
  size: number
  url: string
}

/**
 * Ответ при загрузке нескольких файлов
 */
export type UploadAgendaMaterialMultipleResponse = UploadAgendaMaterialResponse[]

/**
 * Запрос на добавление ссылки (API: url + title)
 */
export type AddAgendaLinkRequest = {
  url: string
  title?: string // Название для отображения (на бэке может не сохраняться)
}

/**
 * Запрос на удаление материала (API: fileUrl в body)
 */
export type DeleteAgendaMaterialRequest = {
  fileUrl: string
}
