// ================================
// Member Profile Types
// ================================

import type { MemberStatus, Permission } from './organization.types'

/**
 * Данные организации для member (облегчённая версия)
 */
export type MemberOrganization = {
  id: string
  name: string
  companyName: string
  logoUrl?: string | null
}

/**
 * Роль member (облегчённая версия)
 */
export type MemberRole = {
  id: string
  name: string
  isSystem: boolean
}

/**
 * Профиль текущего member (из GET /api/v1/workspace/members/me)
 */
export type MemberProfile = {
  id: string
  email: string
  firstName: string
  lastName: string
  phone?: string | null
  position?: string | null
  department?: string | null
  bio?: string | null
  location?: string | null
  avatarUrl?: string | null
  status: MemberStatus
  /** Публичный профиль */
  isPublicProfile: boolean
  /** Показывать email */
  showEmail: boolean
  /** Показывать телефон */
  showPhone: boolean
  /** Роль сотрудника */
  role: MemberRole
  /** Организация */
  organization: MemberOrganization
  /** Права доступа (массив кодов) */
  permissions: string[]
  createdAt: string
}

/**
 * Права доступа member (из GET /api/v1/workspace/members/me/permissions)
 */
export type MemberPermissionsResponse = {
  /** Базовая роль сотрудника */
  role?: Pick<MemberRole, 'id' | 'name'>
  /** Права от роли */
  rolePermissions?: Permission[]
  /** Индивидуальные права */
  individualPermissions?: Permission[]
  /** Все права (объединение) */
  allPermissions?: Permission[]
  /** Legacy/effective permission codes */
  permissions?: string[]
  /** Legacy grouping of effective permission codes by category */
  permissionsByCategory?: Record<string, string[]>
}

// ================================
// Update Profile Types
// ================================

/**
 * Запрос обновления профиля member
 * PATCH /api/v1/workspace/members/me
 */
export type UpdateMemberProfileRequest = {
  firstName?: string
  lastName?: string
  phone?: string | null
  position?: string | null
  department?: string | null
  bio?: string | null
  location?: string | null
}

/**
 * Запрос обновления приватности member
 * PATCH /api/v1/workspace/members/me/privacy
 */
export type UpdateMemberPrivacyRequest = {
  isPublicProfile?: boolean
  showEmail?: boolean
  showPhone?: boolean
}

// ================================
// Avatar Types
// ================================

export type UploadMemberAvatarResponse = {
  avatarUrl: string
}

export type DeleteMemberAvatarResponse = {
  message: string
}
