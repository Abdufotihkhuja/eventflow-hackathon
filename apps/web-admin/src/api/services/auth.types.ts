// ================================
// Organization Types
// ================================

/**
 * Тип провайдера авторизации
 */
export type AuthProvider = 'EMAIL' | 'GOOGLE' | 'LINKEDIN'

/**
 * Статус верификации организации
 * На бэкенде используется APPROVED, но для совместимости маппим в VERIFIED
 */
export const VerificationStatus = {
  PENDING: 'PENDING',
  VERIFIED: 'VERIFIED',
  APPROVED: 'APPROVED', // Альтернативное название с бэкенда
  REJECTED: 'REJECTED',
} as const

export type VerificationStatus =
  | (typeof VerificationStatus)[keyof typeof VerificationStatus]
  | 'APPROVED' // Поддержка статуса с бэкенда

/**
 * Лейблы статусов верификации
 */
export const VERIFICATION_STATUS_LABEL_KEYS: Record<string, string> = {
  [VerificationStatus.PENDING]: 'profile.verification.pending',
  [VerificationStatus.VERIFIED]: 'profile.verification.verified',
  [VerificationStatus.APPROVED]: 'profile.verification.verified', // APPROVED = VERIFIED
  [VerificationStatus.REJECTED]: 'profile.verification.rejected',
}

/**
 * Организация (владелец аккаунта)
 * Структура соответствует GET /api/v1/workspace/me
 */
export type Organization = {
  id: string
  organizationName: string
  email: string
  description?: string | null
  phone?: string | null
  /** ИНН организации — нужен для входа сотрудников */
  inn?: string | null
  logoUrl?: string | null
  authProvider: AuthProvider
  isEmailVerified: boolean
  /** Статус верификации организации */
  verificationStatus: VerificationStatus
  /** Причина отказа в верификации (если статус REJECTED) */
  rejectionReason?: string | null
  /** Дата верификации (если статус VERIFIED) */
  verifiedAt?: string | null
  /** Отрасль компании (Company Information) */
  industry?: string | null
  /** Количество сотрудников (Company Information), при отправке — число */
  companySize?: string | number | null
  /** Доп. поля компании заполнены */
  companyInfoCompleted?: boolean
  /** Доступ к модулю арендуемых площадок */
  placesFeatureEnabled?: boolean
  /** Нужно показать popup «Заполните доп. поля» (только для организатора) */
  needsCompanyInfo?: boolean
  createdAt: string
  updatedAt: string
}

/**
 * Сотрудник организации
 */
export type OrganizationMember = {
  id: string
  email: string
  firstName: string
  lastName: string
  fullName: string
  avatarUrl?: string | null
  phone?: string | null
  role: string
  permissions: string[]
  organizationId: string
  organization?: Organization
  createdAt: string
}

/**
 * Объединенный тип пользователя (организация или сотрудник)
 */
export type AuthUser = Organization | OrganizationMember

// ================================
// Tokens
// ================================

export type AuthTokens = {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

// ================================
// Login Types
// ================================

/**
 * Тип входа: organization (организация), member (сотрудник организации)
 */
export type LoginType = 'organization' | 'member'

/**
 * Базовый запрос для логина
 */
export type LoginRequest = {
  email: string
  password: string
}

/**
 * Запрос для логина организации
 */
export type OrganizationLoginRequest = LoginRequest

/**
 * Запрос для логина сотрудника организации
 * ИНН организации требуется для идентификации организации
 */
export type MemberLoginRequest = LoginRequest & {
  /** ИНН организации для входа сотрудника */
  inn: string
}

/**
 * Ответ после успешного логина организации
 */
export type OrganizationLoginResponse = AuthTokens & {
  organization: Organization
}

/**
 * Ответ после успешного логина сотрудника
 */
export type MemberLoginResponse = AuthTokens & {
  member: OrganizationMember
}

/**
 * Общий тип ответа логина
 */
export type LoginResponse = AuthTokens & {
  organization?: Organization
  member?: OrganizationMember
}

/**
 * Запрос обновления токенов
 */
export type RefreshTokensRequest = {
  refreshToken: string
}

/**
 * Ответ при обновлении токенов
 */
export type RefreshTokensResponse = AuthTokens

/**
 * Запрос на выход
 */
export type LogoutRequest = {
  refreshToken?: string
}

/**
 * Ответ при выходе
 */
export type LogoutResponse = {
  message: string
}

// ================================
// Profile Types
// ================================

/**
 * Запрос обновления профиля организации
 * PATCH /api/v1/workspace/me
 */
export type UpdateOrganizationProfileRequest = {
  organizationName?: string
  description?: string | null
  phone?: string | null
  /** ИНН организации — нужен для входа сотрудников */
  inn?: string | null
  /** Отрасль компании (Company Information), max 100 */
  industry?: string | null
  /** Количество сотрудников — при отправке только number или null */
  companySize?: number | null
  /** Веб-сайт компании */
  website?: string | null
}

/**
 * Запрос обновления профиля сотрудника
 */
export type UpdateMemberProfileRequest = {
  firstName?: string
  lastName?: string
  phone?: string | null
}

export type UpdateProfileResponse = {
  organization?: Organization
  member?: OrganizationMember
}

/**
 * Запрос смены пароля
 * PATCH /api/v1/auth/change-password
 */
export type ChangePasswordRequest = {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export type ChangePasswordResponse = {
  message: string
}

/**
 * Ответ на загрузку логотипа/аватара
 */
export type UploadLogoResponse = {
  logoUrl: string
}

export type UploadAvatarResponse = {
  avatarUrl: string
}

// ================================
// Delete Account
// ================================

/**
 * Запрос на удаление аккаунта организации
 * DELETE /api/v1/workspace/me
 */
export type DeleteAccountRequest = {
  password: string
}

export type DeleteAccountResponse = {
  message: string
}
