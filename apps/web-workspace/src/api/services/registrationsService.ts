/**
 * API сервис для управления регистрациями на события
 */

import { request } from '@api/apiClient'
import { workspaceSdk } from '@api/sdk'

import type {
  RegistrationQuestion,
  CreateQuestionRequest,
  UpdateQuestionRequest,
  GetQuestionsResponse,
  GetPublicQuestionsResponse,
  ReorderQuestionsRequest,
  Registration,
  CreateRegistrationRequest,
  UpdateRegistrationRequest,
  GetRegistrationsParams,
  GetRegistrationsResponse,
  BulkUpdateRegistrationsResponse,
  ExportRegistrationsRequest,
  ExportRegistrationsResponse,
  FileUploadTemplate,
} from './registration.types'

// ================================
// Registration Questions
// ================================

const getQuestionsUrl = (eventId: string) => `/v1/events/${eventId}/questions`

export const registrationQuestionsService = {
  /**
   * Получить вопросы для организаторов (С правильными ответами)
   * Требует авторизации и права EVENTS_READ
   */
  getQuestions: (eventId: string) =>
    request<GetQuestionsResponse>({
      method: 'GET',
      url: getQuestionsUrl(eventId),
    }),

  /**
   * Получить публичные вопросы для участников (БЕЗ правильных ответов)
   * Публичный endpoint, не требует авторизации
   */
  getPublicQuestions: (eventId: string) =>
    request<GetPublicQuestionsResponse>({
      method: 'GET',
      url: `${getQuestionsUrl(eventId)}/public`,
    }),

  /** Создать вопрос */
  createQuestion: (eventId: string, data: CreateQuestionRequest) =>
    request<RegistrationQuestion, CreateQuestionRequest>({
      method: 'POST',
      url: getQuestionsUrl(eventId),
      data,
    }),

  /** Обновить вопрос */
  updateQuestion: (eventId: string, questionId: string, data: UpdateQuestionRequest) =>
    request<RegistrationQuestion, UpdateQuestionRequest>({
      method: 'PATCH',
      url: `${getQuestionsUrl(eventId)}/${questionId}`,
      data,
    }),

  /** Удалить вопрос */
  deleteQuestion: (eventId: string, questionId: string) =>
    request<void>({
      method: 'DELETE',
      url: `${getQuestionsUrl(eventId)}/${questionId}`,
    }),

  /** Изменить порядок вопросов */
  reorderQuestions: (eventId: string, data: ReorderQuestionsRequest) =>
    request<GetQuestionsResponse, ReorderQuestionsRequest>({
      method: 'PATCH',
      url: `${getQuestionsUrl(eventId)}/reorder`,
      data,
    }),

  /** Загрузить файл-шаблон для вопроса FILE_UPLOAD */
  uploadTemplate: (eventId: string, file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return request<FileUploadTemplate, FormData>({
      method: 'POST',
      url: `${getQuestionsUrl(eventId)}/template`,
      data: formData,
    })
  },

  /** Удалить файл-шаблон вопроса FILE_UPLOAD */
  deleteTemplate: (eventId: string, url: string) =>
    request<{ message: string }, { url: string }>({
      method: 'DELETE',
      url: `${getQuestionsUrl(eventId)}/template`,
      data: { url },
    }),
} as const

// ================================
// Event Registrations (для организаторов)
// ================================

const getRegistrationsUrl = (eventId: string) => `/v1/events/${eventId}/registrations`

export const eventRegistrationsService = {
  /** Получить регистрации события */
  getRegistrations: (eventId: string, params?: GetRegistrationsParams) =>
    workspaceSdk.registrations.getRegistrations(eventId, params) as Promise<GetRegistrationsResponse>,

  /** Получить регистрацию по ID */
  getRegistration: (eventId: string, registrationId: string) =>
    workspaceSdk.registrations.getRegistration(eventId, registrationId) as Promise<Registration>,

  /** Одобрить регистрацию */
  approveRegistration: (eventId: string, registrationId: string) =>
    workspaceSdk.registrations.approveRegistration(eventId, registrationId) as Promise<Registration>,

  /** Отклонить регистрацию */
  rejectRegistration: (eventId: string, registrationId: string, reason?: string) =>
    workspaceSdk.registrations.rejectRegistration(eventId, registrationId, {
      reason,
    }) as Promise<Registration>,

  /** Отменить участие (организатор): Ожидает/Одобрена → Отменена */
  cancelRegistration: (eventId: string, registrationId: string, reason?: string) =>
    workspaceSdk.registrations.cancelRegistration(eventId, registrationId, {
      reason,
    }) as Promise<Registration>,

  /** Отозвать подтверждение (организатор): Одобрена → Ожидает */
  revokeApproval: (eventId: string, registrationId: string, reason?: string) =>
    workspaceSdk.registrations.revokeApproval(eventId, registrationId, {
      reason,
    }) as Promise<Registration>,

  /** Массовое одобрение регистраций */
  bulkApprove: (eventId: string, registrationIds: string[]) =>
    workspaceSdk.registrations.bulkApprove(eventId, registrationIds) as Promise<BulkUpdateRegistrationsResponse>,

  /** Массовое отклонение регистраций */
  bulkReject: (eventId: string, registrationIds: string[], reason?: string) =>
    workspaceSdk.registrations.bulkReject(
      eventId,
      registrationIds,
      reason
    ) as Promise<BulkUpdateRegistrationsResponse>,

  /** Экспорт регистраций */
  exportRegistrations: (eventId: string, data: ExportRegistrationsRequest) =>
    request<ExportRegistrationsResponse, ExportRegistrationsRequest>({
      method: 'POST',
      url: `${getRegistrationsUrl(eventId)}/export`,
      data,
    }),

  /** Скачать файл-ответ участника (FILE_UPLOAD) */
  downloadAnswerFile: (eventId: string, registrationId: string, fileId: string) =>
    request<Blob>({
      method: 'GET',
      url: `${getRegistrationsUrl(eventId)}/${registrationId}/files/${fileId}/download`,
      responseType: 'blob',
    }),
} as const

// ================================
// User Registrations (для участников)
// ================================

export const userRegistrationsService = {
  /** Зарегистрироваться на событие (inviteCode в query для INVITE_ONLY) */
  register: (eventId: string, data: CreateRegistrationRequest, inviteCode?: string) =>
    request<Registration, CreateRegistrationRequest>({
      method: 'POST',
      url: `/v1/events/${eventId}/register`,
      data,
      params: inviteCode ? { inviteCode } : undefined,
    }),

  /** Получить мои регистрации */
  getMyRegistrations: () =>
    request<{ registrations: Registration[] }>({
      method: 'GET',
      url: '/v1/my-registrations',
    }),

  /** Отменить свою регистрацию */
  cancelRegistration: (registrationId: string) =>
    request<Registration>({
      method: 'PATCH',
      url: `/v1/registrations/${registrationId}/cancel`,
    }),

  /** Обновить свою регистрацию */
  updateMyRegistration: (registrationId: string, data: UpdateRegistrationRequest) =>
    request<Registration, UpdateRegistrationRequest>({
      method: 'PATCH',
      url: `/v1/registrations/${registrationId}`,
      data,
    }),

  /** Получить QR-код регистрации */
  getQrCode: (registrationId: string) =>
    request<{ qrCode: string }>({
      method: 'GET',
      url: `/v1/registrations/${registrationId}/qr`,
    }),

  /** Получить мой сертификат */
  getMyCertificate: (registrationId: string) =>
    request<{ certificateUrl: string }>({
      method: 'GET',
      url: `/v1/registrations/${registrationId}/certificate`,
    }),
} as const

// Алиас для обратной совместимости
export const publicRegistrationsService = userRegistrationsService
