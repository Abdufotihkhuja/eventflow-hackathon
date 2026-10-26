/**
 * API сервис для управления сертификатами
 */

import { request } from '@api/apiClient'
import { workspaceSdk } from '@api/sdk'

import type {
  CertificateTemplate,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  GetTemplatesResponse,
  Certificate,
  IssueCertificateRequest,
  BulkIssueCertificatesRequest,
  BulkIssueCertificatesResponse,
  GetCertificatesParams,
  GetCertificatesResponse,
  GetMyCertificatesResponse,
  GenerateCertificatesRequest,
  GenerateCertificatesResponse,
  CertificateGenerationStatusResponse,
  VerifyCertificateRequest,
  VerifyCertificateResponse,
} from './certificate.types'

// ================================
// Certificate Templates
// ================================

export const certificateTemplatesService = {
  /** Получить шаблоны сертификатов события */
  getTemplates: (eventId: string) =>
    workspaceSdk.certificates.getTemplates(eventId) as Promise<GetTemplatesResponse>,

  /** Создать шаблон */
  createTemplate: (eventId: string, data: CreateTemplateRequest) => {
    const formData = new FormData()
    formData.append('template', data.template)
    formData.append('name', data.name)
    if (data.translations && Object.keys(data.translations).length > 0) {
      formData.append('translations', JSON.stringify(data.translations))
    }
    formData.append('namePosition', JSON.stringify(data.namePosition))

    if (data.recipientRole) formData.append('recipientRole', data.recipientRole)
    if (data.recipientRoleId) formData.append('recipientRoleId', data.recipientRoleId)
    if (data.roleId) formData.append('roleId', data.roleId)
    if (data.sizePreset) formData.append('sizePreset', data.sizePreset)
    if (data.widthPx) formData.append('widthPx', String(data.widthPx))
    if (data.heightPx) formData.append('heightPx', String(data.heightPx))
    if (data.nameFont) formData.append('nameFont', data.nameFont)
    if (data.nameFontSize) formData.append('nameFontSize', String(data.nameFontSize))
    if (data.nameColor) formData.append('nameColor', data.nameColor)
    if (data.datePosition) formData.append('datePosition', JSON.stringify(data.datePosition))
    if (data.eventNamePosition)
      formData.append('eventNamePosition', JSON.stringify(data.eventNamePosition))
    if (data.firstNamePosition)
      formData.append('firstNamePosition', JSON.stringify(data.firstNamePosition))
    if (data.lastNamePosition)
      formData.append('lastNamePosition', JSON.stringify(data.lastNamePosition))
    if (data.qrPosition) formData.append('qrPosition', JSON.stringify(data.qrPosition))
    if (data.isDefault !== undefined) formData.append('isDefault', String(data.isDefault))
    if (data.isActive !== undefined) formData.append('isActive', String(data.isActive))

    return workspaceSdk.certificates.createTemplate(
      eventId,
      formData
    ) as Promise<CertificateTemplate>
  },

  /** Обновить шаблон */
  updateTemplate: (eventId: string, templateId: string, data: UpdateTemplateRequest) => {
    const formData = new FormData()

    if (data.template) formData.append('template', data.template)
    if (data.name) formData.append('name', data.name)
    if (data.translations !== undefined) {
      formData.append('translations', JSON.stringify(data.translations))
    }
    if (data.namePosition) formData.append('namePosition', JSON.stringify(data.namePosition))
    if (data.recipientRole) formData.append('recipientRole', data.recipientRole)
    if (data.recipientRoleId) formData.append('recipientRoleId', data.recipientRoleId)
    if (data.roleId) formData.append('roleId', data.roleId)
    if (data.sizePreset) formData.append('sizePreset', data.sizePreset)
    if (data.widthPx) formData.append('widthPx', String(data.widthPx))
    if (data.heightPx) formData.append('heightPx', String(data.heightPx))
    if (data.nameFont) formData.append('nameFont', data.nameFont)
    if (data.nameFontSize) formData.append('nameFontSize', String(data.nameFontSize))
    if (data.nameColor) formData.append('nameColor', data.nameColor)
    if (data.datePosition) formData.append('datePosition', JSON.stringify(data.datePosition))
    if (data.eventNamePosition)
      formData.append('eventNamePosition', JSON.stringify(data.eventNamePosition))
    if (data.firstNamePosition)
      formData.append('firstNamePosition', JSON.stringify(data.firstNamePosition))
    if (data.lastNamePosition)
      formData.append('lastNamePosition', JSON.stringify(data.lastNamePosition))
    if (data.qrPosition) formData.append('qrPosition', JSON.stringify(data.qrPosition))
    if (data.isDefault !== undefined) formData.append('isDefault', String(data.isDefault))
    if (data.isActive !== undefined) formData.append('isActive', String(data.isActive))

    return workspaceSdk.certificates.updateTemplate(
      eventId,
      templateId,
      formData
    ) as Promise<CertificateTemplate>
  },

  /** Удалить шаблон */
  deleteTemplate: (eventId: string, templateId: string) =>
    workspaceSdk.certificates.deleteTemplate(eventId, templateId) as Promise<void>,

  // Отдельного POST /set-default на бэкенде нет: основной шаблон назначается
  // через updateTemplate({ isDefault: true }) — он же разжалует прежний.
} as const

// ================================
// Event Certificates (для организаторов)
// ================================

const getCertificatesUrl = (eventId: string) => `/v1/events/${eventId}/certificates`

export const eventCertificatesService = {
  /** Получить сертификаты события */
  getCertificates: (eventId: string, params?: GetCertificatesParams) =>
    workspaceSdk.certificates.getCertificates(eventId, params) as Promise<GetCertificatesResponse>,

  /** Выдать сертификат */
  issueCertificate: (eventId: string, data: IssueCertificateRequest) =>
    request<Certificate, IssueCertificateRequest>({
      method: 'POST',
      url: `${getCertificatesUrl(eventId)}/issue`,
      data,
    }),

  /** Массовая выдача сертификатов */
  bulkIssueCertificates: (eventId: string, data: BulkIssueCertificatesRequest) =>
    request<BulkIssueCertificatesResponse, BulkIssueCertificatesRequest>({
      method: 'POST',
      url: `${getCertificatesUrl(eventId)}/bulk-issue`,
      data,
    }),

  /** Отозвать сертификат */
  revokeCertificate: (eventId: string, certificateId: string) =>
    request<void>({
      method: 'DELETE',
      url: `${getCertificatesUrl(eventId)}/${certificateId}`,
    }),

  /** Повторно отправить сертификат на email */
  resendCertificate: (eventId: string, certificateId: string) =>
    request<{ message: string }>({
      method: 'POST',
      url: `${getCertificatesUrl(eventId)}/${certificateId}/resend`,
    }),

  /** Скачать PDF сертификата (возвращает Blob для открытия/скачивания) */
  downloadCertificate: (eventId: string, certificateId: string) =>
    workspaceSdk.certificates.downloadCertificate(eventId, certificateId) as Promise<Blob>,

  /** Статус асинхронной генерации (для прогресс-бара и авто-обновления списка) */
  getGenerationStatus: (eventId: string, jobId: string) =>
    request<CertificateGenerationStatusResponse>({
      method: 'GET',
      url: `${getCertificatesUrl(eventId)}/generation-status/${jobId}`,
    }),
} as const

// ================================
// Organizer Certificates (плоские пути API_ORGANIZER: /certificates)
// ================================

const ORGANIZER_CERTIFICATES_URL = '/v1/certificates'

export const organizerCertificatesService = {
  /** Сгенерировать сертификаты (POST /certificates/generate) */
  generate: (data?: GenerateCertificatesRequest) =>
    request<GenerateCertificatesResponse, GenerateCertificatesRequest | undefined>({
      method: 'POST',
      url: `${ORGANIZER_CERTIFICATES_URL}/generate`,
      data,
    }),

  /** Список сертификатов организации (GET /certificates) */
  getCertificates: (params?: GetCertificatesParams) =>
    request<GetCertificatesResponse>({
      method: 'GET',
      url: ORGANIZER_CERTIFICATES_URL,
      params,
    }),

  /** Скачать сертификат (GET /certificates/:id/download) */
  download: (id: string) =>
    request<{ downloadUrl: string }>({
      method: 'GET',
      url: `${ORGANIZER_CERTIFICATES_URL}/${id}/download`,
    }),
} as const

// ================================
// My Certificates (для участников)
// ================================

export const myCertificatesService = {
  /** Получить мои сертификаты */
  getMyCertificates: () =>
    request<GetMyCertificatesResponse>({
      method: 'GET',
      url: '/v1/certificates/my',
    }),

  /** Скачать сертификат */
  downloadCertificate: (certificateId: string) =>
    request<{ downloadUrl: string }>({
      method: 'GET',
      url: `/v1/certificates/${certificateId}/download`,
    }),
} as const

// ================================
// Certificate Verification (публичный)
// ================================

export const certificateVerificationService = {
  /** Проверить подлинность сертификата */
  verifyCertificate: (data: VerifyCertificateRequest) =>
    workspaceSdk.certificates.verifyCertificate(data) as Promise<VerifyCertificateResponse>,
} as const
