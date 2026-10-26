// ================================
// Event Mail Types
// ================================

export const EmailType = {
  ANNOUNCEMENT: 'announcement',
  REMINDER: 'reminder',
  INVITATION: 'invitation',
  CONFIRMATION: 'confirmation',
  REJECTION: 'rejection',
  CERTIFICATE: 'certificate',
  CUSTOM: 'custom',
} as const

export type EmailType = (typeof EmailType)[keyof typeof EmailType]

export const EmailStatus = {
  PENDING: 'pending',
  SENT: 'sent',
  DELIVERED: 'delivered',
  FAILED: 'failed',
  BOUNCED: 'bounced',
} as const

export type EmailStatus = (typeof EmailStatus)[keyof typeof EmailStatus]

export type EmailLog = {
  id: string
  eventId: string
  type: EmailType
  subject: string
  recipientEmail: string
  recipientName?: string
  status: EmailStatus
  sentAt?: string
  deliveredAt?: string
  errorMessage?: string
  createdAt: string
}

export type EmailTemplate = {
  id: string
  eventId?: string // null для системных шаблонов
  type: EmailType
  name: string
  subject: string
  bodyHtml: string
  bodyText?: string
  variables: string[] // доступные переменные: {{name}}, {{event_name}}, etc.
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

// ================================
// Request/Response Types
// ================================

// Send Email
export type SendEmailRequest = {
  type: EmailType
  templateId?: string // если не указан, используется default шаблон
  subject?: string // переопределить тему
  body?: string // переопределить тело (HTML)

  // Получатели (один из вариантов)
  recipientIds?: string[] // ID регистраций
  recipientEmails?: string[] // email адреса
  sendToAll?: boolean // отправить всем участникам

  // Фильтры (если sendToAll)
  filters?: {
    status?: string[]
    attended?: boolean
  }

  // Переменные для шаблона
  variables?: Record<string, string>

  // Опции
  scheduledAt?: string // отложенная отправка
}

export type SendEmailResponse = {
  queued: number
  failed: number
  errors?: { email: string; error: string }[]
}

// Email Logs
export type GetEmailLogsParams = {
  page?: number
  limit?: number
  type?: EmailType
  status?: EmailStatus
  search?: string // поиск по email
  from?: string
  to?: string
}

export type GetEmailLogsResponse = {
  logs: EmailLog[]
  total: number
  page: number
  limit: number
  stats: {
    total: number
    sent: number
    delivered: number
    failed: number
    bounced: number
  }
}

// Templates
export type CreateTemplateRequest = {
  type: EmailType
  name: string
  subject: string
  bodyHtml: string
  bodyText?: string
  isDefault?: boolean
}

export type UpdateTemplateRequest = Partial<CreateTemplateRequest>

export type GetTemplatesResponse = {
  templates: EmailTemplate[]
}

// Preview
export type PreviewEmailRequest = {
  templateId?: string
  subject?: string
  bodyHtml?: string
  variables?: Record<string, string>
  sampleRegistrationId?: string // для автозаполнения переменных
}

export type PreviewEmailResponse = {
  subject: string
  bodyHtml: string
  bodyText: string
}

// Scheduled Emails
export type ScheduledEmail = {
  id: string
  eventId: string
  type: EmailType
  subject: string
  scheduledAt: string
  recipientsCount: number
  status: 'scheduled' | 'processing' | 'completed' | 'cancelled'
  createdAt: string
}

export type GetScheduledEmailsResponse = {
  scheduledEmails: ScheduledEmail[]
}
