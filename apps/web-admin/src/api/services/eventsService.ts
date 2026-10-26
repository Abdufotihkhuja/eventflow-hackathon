import { request } from '@api/apiClient'
import { workspaceSdk } from '@api/sdk'

import type {
  AttendanceRecord,
  CheckEventSlugResponse,
  CreateEventCommentRequest,
  CreateEventRequest,
  CreateEventResponse,
  Event,
  EventComment,
  GetAttendanceRequest,
  GetAttendanceResponse,
  GetEventChatRequest,
  GetEventChatResponse,
  GetEventCommentsParams,
  GetEventCommentsResponse,
  GetEventsRequest,
  GetEventsResponse,
  MarkAttendanceResponse,
  RawAttendanceResponse,
  SendEventAnnouncementRequest,
  SendEventAnnouncementResponse,
  SuggestEventSlugResponse,
  UpdateEventCommentRequest,
  UpdateEventRequest,
  UpdateEventResponse,
} from './event.types'
import type {
  GetRegistrationsParams,
  GetRegistrationsResponse,
  RegistrationStatus,
  ExportRegistrationsRequest,
  ExportRegistrationsResponse,
} from './registration.types'

const EVENTS_BASE_URL = '/api/v1/events'

/** Преобразует ответ API (массив по дням с attendees) в формат { records, dates } для таба посещаемости */
function normalizeAttendanceResponse(
  raw: RawAttendanceResponse,
  eventId: string
): GetAttendanceResponse {
  const dates = raw.map(item => item.date)
  const records: AttendanceRecord[] = []
  for (const day of raw) {
    for (const a of day.attendees) {
      const [firstName = '', ...lastParts] = a.userName.trim().split(/\s+/)
      const lastName = lastParts.join(' ') ?? ''
      records.push({
        id: `${a.userId}-${day.date}`,
        eventId,
        participantId: a.userId,
        date: day.date,
        attended: true,
        checkInTime: a.checkInAt,
        registrationId: a.userId,
        status: 'present',
        registration: {
          id: a.userId,
          firstName: firstName || a.userName,
          lastName,
          email: a.userEmail,
        },
      })
    }
  }
  return { dates, records }
}

const eventsEndpoints = {
  // CRUD событий
  list: `${EVENTS_BASE_URL}`,
  create: `${EVENTS_BASE_URL}`,
  get: (id: string) => `${EVENTS_BASE_URL}/${id}`,
  update: (id: string) => `${EVENTS_BASE_URL}/${id}`,
  delete: (id: string) => `${EVENTS_BASE_URL}/${id}`,

  // Действия со статусом
  submitForReview: (id: string) => `${EVENTS_BASE_URL}/${id}/submit-review`,
  publish: (id: string) => `${EVENTS_BASE_URL}/${id}/publish`,
  cancel: (id: string) => `${EVENTS_BASE_URL}/${id}/cancel`,
  complete: (id: string) => `${EVENTS_BASE_URL}/${id}/complete`,
  regenerateInviteCode: (id: string) => `${EVENTS_BASE_URL}/${id}/regenerate-invite-code`,
  inviteLink: (id: string) => `${EVENTS_BASE_URL}/${id}/invite-link`,
  sendInvitation: (id: string) => `${EVENTS_BASE_URL}/${id}/send-invitation`,

  // Регистрации (обновленный путь API)
  registrations: (id: string) => `${EVENTS_BASE_URL}/${id}/registrations`,
  updateRegistrationStatus: (eventId: string, registrationId: string) =>
    `${EVENTS_BASE_URL}/${eventId}/registrations/${registrationId}`,
  exportRegistrations: (id: string) => `${EVENTS_BASE_URL}/${id}/registrations/export`,

  // Attendance (посещаемость)
  attendance: (id: string) => `${EVENTS_BASE_URL}/${id}/attendance`,
  attendanceStats: (id: string) => `${EVENTS_BASE_URL}/${id}/attendance/stats`,
  checkIn: (id: string) => `${EVENTS_BASE_URL}/${id}/attendance/check-in`,

  // Чат и уведомления
  chat: (id: string) => `${EVENTS_BASE_URL}/${id}/chat`,
  sendAnnouncement: (id: string) => `${EVENTS_BASE_URL}/${id}/announcements`,

  // Комментарии
  comments: (id: string) => `${EVENTS_BASE_URL}/${id}/comments`,
  comment: (eventId: string, commentId: string) =>
    `${EVENTS_BASE_URL}/${eventId}/comments/${commentId}`,

  bySlug: (slug: string) => `${EVENTS_BASE_URL}/by-slug/${slug}`,
  suggestSlug: `${EVENTS_BASE_URL}/suggest-slug`,
  checkSlug: `${EVENTS_BASE_URL}/check-slug`,
} as const

export const eventsService = {
  // Получить список событий организатора
  getEvents: (params?: GetEventsRequest) =>
    workspaceSdk.events.getEvents(params) as Promise<GetEventsResponse>,

  // Получить одно событие
  getEvent: (id: string) =>
    workspaceSdk.events.getEvent(id) as Promise<Event>,

  // Создать событие
  createEvent: (data: CreateEventRequest) => {
    // Если есть файл баннера, используем FormData
    if (data.bannerFile) {
      const formData = new FormData()

      // Добавляем все поля кроме bannerFile
      Object.entries(data).forEach(([key, value]) => {
        if (key !== 'bannerFile' && value !== undefined && value !== null) {
          if (typeof value === 'object' && !Array.isArray(value)) {
            formData.append(key, JSON.stringify(value))
          } else if (Array.isArray(value)) {
            formData.append(key, JSON.stringify(value))
          } else {
            formData.append(key, String(value))
          }
        }
      })

      // Добавляем файл
      formData.append('bannerFile', data.bannerFile)

      return workspaceSdk.events.createEvent(formData) as Promise<CreateEventResponse>
    }

    // Иначе просто JSON
    return workspaceSdk.events.createEvent(data) as Promise<CreateEventResponse>
  },

  // Обновить событие
  updateEvent: (id: string, data: UpdateEventRequest) => {
    // Если есть файл баннера, используем FormData
    if (data.bannerFile) {
      const formData = new FormData()

      // Добавляем все поля кроме bannerFile
      Object.entries(data).forEach(([key, value]) => {
        if (key !== 'bannerFile' && value !== undefined && value !== null) {
          if (typeof value === 'object' && !Array.isArray(value)) {
            formData.append(key, JSON.stringify(value))
          } else if (Array.isArray(value)) {
            formData.append(key, JSON.stringify(value))
          } else {
            formData.append(key, String(value))
          }
        }
      })

      // Добавляем файл
      formData.append('bannerFile', data.bannerFile)

      return workspaceSdk.events.updateEvent(id, formData) as Promise<UpdateEventResponse>
    }

    // Иначе просто JSON
    return workspaceSdk.events.updateEvent(id, data) as Promise<UpdateEventResponse>
  },

  // Удалить событие
  deleteEvent: (id: string) =>
    workspaceSdk.events.deleteEvent(id) as Promise<void>,

  // Отправить событие на модерацию
  submitForReview: (id: string) =>
    workspaceSdk.events.submitForReview(id) as Promise<Event>,

  // Опубликовать событие
  publishEvent: (id: string) =>
    request<Event>({
      method: 'POST',
      url: eventsEndpoints.publish(id),
    }),

  // Отменить событие
  cancelEvent: (id: string) =>
    workspaceSdk.events.cancelEvent(id) as Promise<Event>,

  // Завершить событие
  completeEvent: (id: string) =>
    workspaceSdk.events.completeEvent(id) as Promise<Event>,

  // Регенерировать код приглашения
  regenerateInviteCode: (id: string) =>
    workspaceSdk.events.regenerateInviteCode(id) as Promise<{ inviteCode: string }>,

  /** Ссылка и код приглашения (INVITE_ONLY) */
  getInviteLink: (id: string) =>
    workspaceSdk.events.getInviteLink(id) as Promise<{ inviteLink: string; inviteCode: string }>,

  /** Отправить приглашение на email (INVITE_ONLY) */
  sendInvitation: (id: string, data: { email: string }) =>
    workspaceSdk.events.sendInvitation(id, data) as Promise<{ message: string }>,

  // Получить регистрации события (обновленный API)
  getRegistrations: (eventId: string, params?: GetRegistrationsParams) =>
    request<GetRegistrationsResponse>({
      method: 'GET',
      url: eventsEndpoints.registrations(eventId),
      params,
    }),

  // Обновить статус регистрации
  updateRegistrationStatus: (eventId: string, registrationId: string, status: RegistrationStatus) =>
    request<{ id: string; status: RegistrationStatus }, { status: RegistrationStatus }>({
      method: 'PATCH',
      url: eventsEndpoints.updateRegistrationStatus(eventId, registrationId),
      data: { status },
    }),

  // Получить данные о посещаемости (API может вернуть массив по дням — нормализуем в { records, dates })
  getAttendance: async (params: GetAttendanceRequest): Promise<GetAttendanceResponse> => {
    const data = await workspaceSdk.events.getAttendance(params.eventId, {
      date: params.date,
    } as never)
    if (Array.isArray(data)) {
      return normalizeAttendanceResponse(data, params.eventId)
    }
    return data
  },

  // Получить статистику посещаемости
  getAttendanceStats: (eventId: string) =>
    request<{ total: number; present: number; rate: number }>({
      method: 'GET',
      url: eventsEndpoints.attendanceStats(eventId),
    }),

  // Check-in участника (сканирование QR)
  checkIn: (eventId: string, data: { registrationId: string }) =>
    request<MarkAttendanceResponse, { registrationId: string }>({
      method: 'POST',
      url: eventsEndpoints.checkIn(eventId),
      data,
    }),

  // Экспортировать данные регистраций
  exportRegistrations: (eventId: string, data: ExportRegistrationsRequest) =>
    request<ExportRegistrationsResponse, ExportRegistrationsRequest>({
      method: 'POST',
      url: eventsEndpoints.exportRegistrations(eventId),
      data,
    }),

  // Получить чат события
  getEventChat: (params: GetEventChatRequest) =>
    request<GetEventChatResponse>({
      method: 'GET',
      url: eventsEndpoints.chat(params.eventId),
      params: {
        page: params.page,
        limit: params.limit,
      },
    }),

  // Отправить объявление участникам
  sendAnnouncement: (data: SendEventAnnouncementRequest) =>
    request<SendEventAnnouncementResponse, SendEventAnnouncementRequest>({
      method: 'POST',
      url: eventsEndpoints.sendAnnouncement(data.eventId),
      data,
    }),

  // ================================
  // Comments
  // ================================

  /** Получить комментарии события (пагинированный ответ: data, total, page, limit) */
  getComments: (eventId: string, params?: GetEventCommentsParams) =>
    request<GetEventCommentsResponse>({
      method: 'GET',
      url: eventsEndpoints.comments(eventId),
      params,
    }),

  /** Добавить комментарий к событию */
  createComment: (eventId: string, data: CreateEventCommentRequest) =>
    request<EventComment, CreateEventCommentRequest>({
      method: 'POST',
      url: eventsEndpoints.comments(eventId),
      data,
    }),

  /** Редактировать комментарий события */
  updateComment: (eventId: string, commentId: string, data: UpdateEventCommentRequest) =>
    request<EventComment, UpdateEventCommentRequest>({
      method: 'PATCH',
      url: eventsEndpoints.comment(eventId, commentId),
      data,
    }),

  /** Удалить комментарий события */
  deleteComment: (eventId: string, commentId: string) =>
    request<void>({
      method: 'DELETE',
      url: eventsEndpoints.comment(eventId, commentId),
    }),

  // ================================
  // Slug (организатор: suggest/check; публичный by-slug в publicEventsService)
  // ================================

  /** Предложить slug по заголовку (JWT, EVENTS_READ). При редактировании — excludeId. */
  suggestSlug: (params: { title: string; excludeId?: string }) =>
    workspaceSdk.events.suggestSlug({
      title: params.title.slice(0, 500),
      excludeId: params.excludeId,
    }) as Promise<SuggestEventSlugResponse>,

  /** Проверить доступность slug (JWT, EVENTS_READ). При редактировании — excludeId. */
  checkSlug: (params: { slug: string; excludeId?: string }) =>
    workspaceSdk.events.checkSlug(params) as Promise<CheckEventSlugResponse>,
} as const
