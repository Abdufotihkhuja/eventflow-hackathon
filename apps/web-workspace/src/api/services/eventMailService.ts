/**
 * API сервис для email рассылок событий
 */

import { request } from '@api/apiClient'

import type {
  EmailTemplate,
  SendEmailRequest,
  SendEmailResponse,
  GetEmailLogsParams,
  GetEmailLogsResponse,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  GetTemplatesResponse,
  PreviewEmailRequest,
  PreviewEmailResponse,
  GetScheduledEmailsResponse,
} from './mail.types'

const getMailUrl = (eventId: string) => `/v1/events/${eventId}/mail`

export const eventMailService = {
  // ================================
  // Send Emails
  // ================================

  /** Отправить email участникам */
  sendEmail: (eventId: string, data: SendEmailRequest) =>
    request<SendEmailResponse, SendEmailRequest>({
      method: 'POST',
      url: `${getMailUrl(eventId)}/send`,
      data,
    }),

  /** Отправить напоминание о событии */
  sendReminder: (
    eventId: string,
    data?: Pick<SendEmailRequest, 'recipientIds' | 'sendToAll' | 'scheduledAt'>
  ) =>
    request<SendEmailResponse, typeof data>({
      method: 'POST',
      url: `${getMailUrl(eventId)}/reminder`,
      data,
    }),

  /** Предпросмотр email */
  previewEmail: (eventId: string, data: PreviewEmailRequest) =>
    request<PreviewEmailResponse, PreviewEmailRequest>({
      method: 'POST',
      url: `${getMailUrl(eventId)}/preview`,
      data,
    }),

  // ================================
  // Email Logs
  // ================================

  /** Получить логи отправленных писем */
  getEmailLogs: (eventId: string, params?: GetEmailLogsParams) =>
    request<GetEmailLogsResponse>({
      method: 'GET',
      url: `${getMailUrl(eventId)}/logs`,
      params,
    }),

  /** Повторно отправить письмо */
  resendEmail: (eventId: string, logId: string) =>
    request<SendEmailResponse>({
      method: 'POST',
      url: `${getMailUrl(eventId)}/logs/${logId}/resend`,
    }),

  // ================================
  // Templates
  // ================================

  /** Получить шаблоны email */
  getTemplates: (eventId: string) =>
    request<GetTemplatesResponse>({
      method: 'GET',
      url: `${getMailUrl(eventId)}/templates`,
    }),

  /** Создать шаблон */
  createTemplate: (eventId: string, data: CreateTemplateRequest) =>
    request<EmailTemplate, CreateTemplateRequest>({
      method: 'POST',
      url: `${getMailUrl(eventId)}/templates`,
      data,
    }),

  /** Обновить шаблон */
  updateTemplate: (eventId: string, templateId: string, data: UpdateTemplateRequest) =>
    request<EmailTemplate, UpdateTemplateRequest>({
      method: 'PATCH',
      url: `${getMailUrl(eventId)}/templates/${templateId}`,
      data,
    }),

  /** Удалить шаблон */
  deleteTemplate: (eventId: string, templateId: string) =>
    request<void>({
      method: 'DELETE',
      url: `${getMailUrl(eventId)}/templates/${templateId}`,
    }),

  // ================================
  // Scheduled Emails
  // ================================

  /** Получить запланированные рассылки */
  getScheduledEmails: (eventId: string) =>
    request<GetScheduledEmailsResponse>({
      method: 'GET',
      url: `${getMailUrl(eventId)}/scheduled`,
    }),

  /** Отменить запланированную рассылку */
  cancelScheduledEmail: (eventId: string, scheduledId: string) =>
    request<void>({
      method: 'DELETE',
      url: `${getMailUrl(eventId)}/scheduled/${scheduledId}`,
    }),
} as const
