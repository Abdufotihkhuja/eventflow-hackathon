export type BadgeRecipientRole = 'PARTICIPANT' | 'SPEAKER' | 'MENTOR'

export type BadgeSizePreset =
  | 'BADGE_90X60'
  | 'BADGE_85X55'
  | 'BADGE_90X90'
  | 'BADGE_100X70'
  | 'BADGE_60X90'
  | 'BADGE_80X100'
  | 'BADGE_A6'

export type BadgeFieldArea = {
  x: number
  y: number
  width: number
  height: number
  /** Горизонтальное выравнивание — только для полей имени/фамилии. */
  align?: 'left' | 'center' | 'right'
}

export type BadgeTemplate = {
  id: string
  eventId: string
  name: string
  translations?: Record<string, Partial<Record<'ru' | 'uz' | 'en', string>>> | null
  recipientRole: BadgeRecipientRole | null
  recipientRoleId?: string | null
  roleCode?: string
  roleDisplayName?: string
  sizePreset: BadgeSizePreset
  widthPx: number
  heightPx: number
  templateUrl: string
  thumbnailUrl?: string | null
  /** Шрифт имени/фамилии: id из каталога сертификатных шрифтов (+ суффикс '-bold'). */
  nameFont?: string | null
  /** Кегль имени/фамилии в пунктах PDF-страницы. */
  nameFontSize?: number | null
  /** Hex-цвет имени/фамилии. */
  nameColor?: string | null
  namePosition?: BadgeFieldArea | null
  firstNamePosition?: BadgeFieldArea | null
  lastNamePosition?: BadgeFieldArea | null
  rolePosition?: BadgeFieldArea | null
  eventNamePosition?: BadgeFieldArea | null
  qrPosition?: BadgeFieldArea | null
  /** Текст роли на бейдже; null — displayName роли (Participant/Speaker/Mentor для встроенных). */
  roleLabel?: string | null
  /** Кегль текста роли в пунктах PDF-страницы; null — 8pt. */
  roleFontSize?: number | null
  /** Hex-цвет текста роли; null — #4b5563. */
  roleColor?: string | null
  /** Текст названия события на бейдже; null — title события. */
  eventLabel?: string | null
  /** Кегль названия события в пунктах; null — 7pt. */
  eventFontSize?: number | null
  /** Hex-цвет названия события; null — #374151. */
  eventColor?: string | null
  isDefault: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type GetBadgeTemplatesResponse = {
  templates: BadgeTemplate[]
}

export type CreateBadgeTemplateRequest = {
  name: string
  translations?: Record<string, Partial<Record<'ru' | 'uz' | 'en', string>>>
  template: File
  recipientRole?: BadgeRecipientRole
  recipientRoleId?: string
  roleId?: string
  sizePreset: BadgeSizePreset
  widthPx: number
  heightPx: number
  nameFont?: string
  nameFontSize?: number
  nameColor?: string
  isDefault?: boolean
  isActive?: boolean
}

export type DownloadBadgesRequest = {
  registrationIds?: string[]
  recipientIds?: string[]
  recipientRole?: BadgeRecipientRole
  recipientRoleId?: string
  recipientRoleIds?: string[]
  roleId?: string
  roleCode?: string
  scope?: 'ROLE' | 'ALL_ELIGIBLE'
  templateId?: string
  onlyApproved?: boolean
}
