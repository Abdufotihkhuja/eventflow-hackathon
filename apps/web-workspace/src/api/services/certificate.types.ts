// ================================
// Certificate Types
// ================================

/** Область в процентах (0–100), для QR всегда квадрат */
export type TemplateFieldArea = {
  x: number
  y: number
  width: number
  height: number
  /** Horizontal text alignment — name fields only ('left' | 'center' | 'right'). */
  align?: 'left' | 'center' | 'right'
}

export type CertificateRecipientRole = 'PARTICIPANT' | 'SPEAKER' | 'MENTOR'

export type CertificateSizePreset =
  | 'A4_PORTRAIT'
  | 'A4_LANDSCAPE'
  | 'A6_PORTRAIT'
  | 'A6_LANDSCAPE'
  | 'LETTER_PORTRAIT'
  | 'LETTER_LANDSCAPE'
  | 'A5_LANDSCAPE'
  | 'LEGAL_LANDSCAPE'
  | 'DIGITAL_16_9'

export type CertificateTemplate = {
  id: string
  eventId: string
  name: string
  translations?: Record<string, Partial<Record<'ru' | 'uz' | 'en', string>>> | null
  recipientRole: CertificateRecipientRole | null
  recipientRoleId?: string | null
  roleCode?: string
  roleDisplayName?: string
  sizePreset: CertificateSizePreset
  widthPx: number
  heightPx: number
  templateUrl: string
  thumbnailUrl?: string

  // Позиционирование текста
  namePosition: { x: number; y: number }
  nameFont?: string
  nameFontSize?: number
  nameColor?: string

  // Дополнительные поля (опционально)
  datePosition?: { x: number; y: number } | null
  eventNamePosition?: { x: number; y: number } | null
  firstNamePosition?: TemplateFieldArea | null
  lastNamePosition?: TemplateFieldArea | null
  qrPosition?: TemplateFieldArea | null

  isDefault: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type Certificate = {
  id: string
  eventId: string
  registrationId: string
  templateId: string | null
  certificateUrl: string | null
  issuedAt: string | null
  downloadCount: number

  // Данные участника
  recipientName: string | null
  recipientEmail: string | null

  // Данные события
  eventName: string | null
  eventDate: string | null
  recipientRole?: CertificateRecipientRole
  generationStatus?: 'READY' | 'PROCESSING' | 'FAILED' | 'PENDING' | null
  isStale?: boolean
}

// ================================
// Request/Response Types
// ================================

// Templates
export type CreateTemplateRequest = {
  name: string
  translations?: Record<string, Partial<Record<'ru' | 'uz' | 'en', string>>>
  template: File
  recipientRole?: CertificateRecipientRole
  recipientRoleId?: string
  roleId?: string
  sizePreset?: CertificateSizePreset
  widthPx?: number
  heightPx?: number
  namePosition: { x: number; y: number }
  nameFont?: string
  nameFontSize?: number
  nameColor?: string
  datePosition?: { x: number; y: number }
  eventNamePosition?: { x: number; y: number }
  firstNamePosition?: TemplateFieldArea
  lastNamePosition?: TemplateFieldArea
  qrPosition?: TemplateFieldArea
  isDefault?: boolean
  isActive?: boolean
}

export type UpdateTemplateRequest = Partial<Omit<CreateTemplateRequest, 'template'>> & {
  template?: File
}

export type GetTemplatesResponse = {
  templates: CertificateTemplate[]
}

// Certificates
export type IssueCertificateRequest = {
  registrationId: string
  templateId?: string // если не указан, используется default
}

export type BulkIssueCertificatesRequest = {
  registrationIds: string[]
  templateId?: string
}

export type BulkIssueCertificatesResponse = {
  issued: number
  failed: number
  certificates: Certificate[]
  errors?: { registrationId: string; error: string }[]
}

export type GetCertificatesParams = {
  page?: number
  limit?: number
  search?: string
}

export type GetCertificatesResponse = {
  certificates: Certificate[]
  total: number
  page: number
  limit: number
}

// Organizer Certificates (плоские пути /certificates)
export type GenerateCertificatesRequest = {
  eventId?: string
  registrationIds?: string[]
}

/** Тело запроса генерации по событию (POST .../events/:eventId/certificates/generate) */
export type GenerateEventCertificatesBody = {
  registrationIds?: string[]
  recipientIds?: string[]
  onlyAttended?: boolean
  recipientRole?: CertificateRecipientRole
  recipientRoleId?: string
  recipientRoleIds?: string[]
  roleId?: string
  roleCode?: string
  scope?: 'ROLE' | 'ALL_ELIGIBLE'
  templateId?: string
  forceRegenerate?: boolean
  /**
   * For manual selection: how to treat recipients that fail the
   * approved-registration / attendance filters. EXCLUDE (default) issues to
   * eligible only; INCLUDE issues to everyone selected.
   */
  ineligiblePolicy?: 'EXCLUDE' | 'INCLUDE'
}

export type GenerateCertificatesResponse =
  | {
      status: 'completed'
      generated: number
      failed: number
      skipped: number
      forceRegenerate: boolean
      errors?: { registrationId: string; error: string }[]
    }
  | {
      status: 'processing'
      jobId: string
      message: string
      forceRegenerate: boolean
    }

/** Async generation job status — for the progress bar + list auto-refresh. */
export type CertificateGenerationStatusResponse = {
  state: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'unknown'
  result?: { generated: number; failed: number; skipped: number }
  failedReason?: string
  counts: {
    total: number
    ready: number
    processing: number
    pending: number
    failed: number
  }
}

// My Certificates (для участников)
export type GetMyCertificatesResponse = {
  certificates: Certificate[]
}

export type VerifyCertificateRequest = {
  certificateId: string
  // или
  verificationCode?: string
}

export type VerifyCertificateResponse = {
  isValid: boolean
  certificate?: Certificate
  event?: {
    id: string
    name: string
    date: string
    organizer: string
  }
}
