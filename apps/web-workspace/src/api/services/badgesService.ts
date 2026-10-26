import { api } from '@api/config'

import type {
  CreateBadgeTemplateRequest,
  DownloadBadgesRequest,
  GetBadgeTemplatesResponse,
  BadgeTemplate,
} from './badge.types'

const getBadgesUrl = (eventId: string) => `/v1/events/${eventId}/badges`

function templateFormData(data: CreateBadgeTemplateRequest): FormData {
  const formData = new FormData()
  formData.append('template', data.template)
  formData.append('name', data.name)
  if (data.translations && Object.keys(data.translations).length > 0) {
    formData.append('translations', JSON.stringify(data.translations))
  }
  if (data.recipientRole) formData.append('recipientRole', data.recipientRole)
  if (data.recipientRoleId) formData.append('recipientRoleId', data.recipientRoleId)
  if (data.roleId) formData.append('roleId', data.roleId)
  formData.append('sizePreset', data.sizePreset)
  formData.append('widthPx', String(data.widthPx))
  formData.append('heightPx', String(data.heightPx))
  if (data.nameFont !== undefined) formData.append('nameFont', data.nameFont)
  if (data.nameFontSize !== undefined) formData.append('nameFontSize', String(data.nameFontSize))
  if (data.nameColor !== undefined) formData.append('nameColor', data.nameColor)
  if (data.isDefault !== undefined) formData.append('isDefault', String(data.isDefault))
  if (data.isActive !== undefined) formData.append('isActive', String(data.isActive))
  return formData
}

import type { BadgeFieldArea } from './badge.types'

type UpdateBadgeTemplatePatch = {
  name?: string
  translations?: Record<string, Partial<Record<'ru' | 'uz' | 'en', string>>>
  recipientRole?: CreateBadgeTemplateRequest['recipientRole']
  recipientRoleId?: string
  roleId?: string
  namePosition?: BadgeFieldArea | null
  firstNamePosition?: BadgeFieldArea | null
  lastNamePosition?: BadgeFieldArea | null
  rolePosition?: BadgeFieldArea | null
  eventNamePosition?: BadgeFieldArea | null
  qrPosition?: BadgeFieldArea | null
  nameFont?: string
  nameFontSize?: number
  nameColor?: string
  /** null сбрасывает поле к значению по умолчанию (на сервере — пустая строка). */
  roleLabel?: string | null
  roleFontSize?: number | null
  roleColor?: string | null
  eventLabel?: string | null
  eventFontSize?: number | null
  eventColor?: string | null
  isDefault?: boolean
  isActive?: boolean
}

/** Скалярное поле с возможностью сброса: undefined не трогает, null очищает. */
function appendResettableField(
  formData: FormData,
  key: string,
  value: string | number | null | undefined
): void {
  if (value === undefined) return
  formData.append(key, value === null ? '' : String(value))
}

function appendPositionField(
  formData: FormData,
  key: keyof Pick<
    UpdateBadgeTemplatePatch,
    | 'namePosition'
    | 'firstNamePosition'
    | 'lastNamePosition'
    | 'rolePosition'
    | 'eventNamePosition'
    | 'qrPosition'
  >,
  value: BadgeFieldArea | null | undefined,
): void {
  if (value === undefined) return
  formData.append(key, value === null ? '' : JSON.stringify(value))
}

function updateFormData(patch: UpdateBadgeTemplatePatch): FormData {
  const formData = new FormData()
  if (patch.name !== undefined) formData.append('name', patch.name)
  if (patch.translations !== undefined) {
    formData.append('translations', JSON.stringify(patch.translations))
  }
  if (patch.recipientRole !== undefined) formData.append('recipientRole', patch.recipientRole)
  if (patch.recipientRoleId !== undefined) formData.append('recipientRoleId', patch.recipientRoleId)
  if (patch.roleId !== undefined) formData.append('roleId', patch.roleId)
  appendPositionField(formData, 'namePosition', patch.namePosition)
  appendPositionField(formData, 'firstNamePosition', patch.firstNamePosition)
  appendPositionField(formData, 'lastNamePosition', patch.lastNamePosition)
  appendPositionField(formData, 'rolePosition', patch.rolePosition)
  appendPositionField(formData, 'eventNamePosition', patch.eventNamePosition)
  appendPositionField(formData, 'qrPosition', patch.qrPosition)
  if (patch.nameFont !== undefined) formData.append('nameFont', patch.nameFont)
  if (patch.nameFontSize !== undefined) formData.append('nameFontSize', String(patch.nameFontSize))
  if (patch.nameColor !== undefined) formData.append('nameColor', patch.nameColor)
  appendResettableField(formData, 'roleLabel', patch.roleLabel)
  appendResettableField(formData, 'roleFontSize', patch.roleFontSize)
  appendResettableField(formData, 'roleColor', patch.roleColor)
  appendResettableField(formData, 'eventLabel', patch.eventLabel)
  appendResettableField(formData, 'eventFontSize', patch.eventFontSize)
  appendResettableField(formData, 'eventColor', patch.eventColor)
  if (patch.isDefault !== undefined) formData.append('isDefault', String(patch.isDefault))
  if (patch.isActive !== undefined) formData.append('isActive', String(patch.isActive))
  return formData
}

export const badgeTemplatesService = {
  getTemplates: async (eventId: string): Promise<GetBadgeTemplatesResponse> => {
    const response = await api.get<GetBadgeTemplatesResponse>(`${getBadgesUrl(eventId)}/templates`)
    return response.data
  },

  createTemplate: async (
    eventId: string,
    data: CreateBadgeTemplateRequest
  ): Promise<BadgeTemplate> => {
    const response = await api.post<BadgeTemplate>(
      `${getBadgesUrl(eventId)}/templates`,
      templateFormData(data)
    )
    return response.data
  },

  updateTemplate: async (
    eventId: string,
    templateId: string,
    patch: UpdateBadgeTemplatePatch
  ): Promise<BadgeTemplate> => {
    const response = await api.patch<BadgeTemplate>(
      `${getBadgesUrl(eventId)}/templates/${templateId}`,
      updateFormData(patch)
    )
    return response.data
  },

  deleteTemplate: async (eventId: string, templateId: string): Promise<void> => {
    await api.delete(`${getBadgesUrl(eventId)}/templates/${templateId}`)
  },
} as const

/** Архив уже собран (та же выборка выгружалась раньше) либо собирается в фоне. */
export interface BadgesZipRequestResult {
  status: 'ready' | 'processing'
  jobId: string
  total: number
}

export type BadgesZipStatus =
  | { status: 'ready'; jobId: string }
  | { status: 'processing'; jobId: string; done?: number; total?: number }
  | { status: 'failed'; jobId: string; failedReason?: string }
  /** Задание вычищено из очереди, а файла нет — нужно запросить выгрузку заново. */
  | { status: 'expired'; jobId: string }

export const eventBadgesService = {
  /**
   * Бейджи рендерятся заново на каждую выгрузку, поэтому сборка ZIP уходит в
   * очередь: этот запрос только ставит задание (или узнаёт, что архив готов).
   */
  requestDownload: async (
    eventId: string,
    data: DownloadBadgesRequest
  ): Promise<BadgesZipRequestResult> => {
    const response = await api.post<BadgesZipRequestResult>(
      `${getBadgesUrl(eventId)}/download`,
      data
    )
    return response.data
  },

  getDownloadStatus: async (eventId: string, jobId: string): Promise<BadgesZipStatus> => {
    const response = await api.get<BadgesZipStatus>(
      `${getBadgesUrl(eventId)}/download-status/${jobId}`
    )
    return response.data
  },

  fetchArchive: async (eventId: string, jobId: string): Promise<Blob> => {
    const response = await api.get<Blob>(
      `${getBadgesUrl(eventId)}/download/${jobId}/file`,
      {
        responseType: 'blob',
        // Готовый архив на несколько сотен бейджей качается дольше общего
        // 15-секундного таймаута клиента.
        timeout: 5 * 60 * 1000,
      }
    )
    return response.data
  },
} as const
