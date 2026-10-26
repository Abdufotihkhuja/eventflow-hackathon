/**
 * API-сервис для account-настроек пользователя и profile options
 * Endpoints: /api/v1/account/me/* и /api/v1/public/profile-options
 */

import { accountSdk, publicSdk } from "./sdk";

import type { User } from "./authService";

// ============================================================================
// Типы для настроек приватности
// ============================================================================

/**
 * Настройки приватности пользователя
 */
export interface PrivacySettings {
  /** Публичный профиль */
  isPublicProfile: boolean;
  /** Показывать email */
  showEmail: boolean;
  /** Показывать телефон */
  showPhone: boolean;
}

/**
 * DTO для обновления настроек приватности
 * PATCH /api/v1/account/me/privacy
 */
export interface UpdatePrivacySettingsDto {
  isPublicProfile?: boolean;
  showEmail?: boolean;
  showPhone?: boolean;
}

/**
 * Ответ после обновления настроек приватности
 */
export interface UpdatePrivacyResponse {
  isPublicProfile: boolean;
  showEmail: boolean;
  showPhone: boolean;
}

// ============================================================================
// Типы для экспорта данных
// ============================================================================

/**
 * Экспортированные данные пользователя
 * GET /api/v1/account/me/export
 */
export interface UserExportData {
  user: {
    id: string;
    email: string;
    name: string;
    phone?: string;
    location?: string;
    bio?: string;
    avatarUrl?: string;
    authProvider: string;
    isEmailVerified: boolean;
    isPublicProfile: boolean;
    showEmail: boolean;
    showPhone: boolean;
    createdAt: string;
    updatedAt: string;
  };
  registrations: Array<{
    id: string;
    eventId: string;
    eventTitle: string;
    status: string;
    role: string;
    createdAt: string;
  }>;
  certificates: Array<{
    id: string;
    title: string;
    issuer: string;
    issueDate: string;
    credentialId: string;
  }>;
  savedArticles: Array<{
    id: string;
    url: string;
    title?: string;
    savedAt: string;
  }>;
  exportedAt: string;
}

// ============================================================================
// Типы для справочников доп. полей профиля
// ============================================================================

/** Элемент справочника с кодом и подписью (навыки, языки) */
export interface ProfileOptionCodeLabel {
  code: string;
  label: string;
}

/** Элемент справочника value/label (пол, статус, специализация) */
export interface ProfileOptionValueLabel {
  value: string;
  label: string;
}

/** Ответ GET /api/v1/public/profile-options (публичный, без авторизации) */
export interface ProfileOptionsResponse {
  skills: ProfileOptionCodeLabel[];
  regions: string[];
  languages: ProfileOptionCodeLabel[];
  specializations: ProfileOptionValueLabel[];
  profileStatuses: ProfileOptionValueLabel[];
  genders: ProfileOptionValueLabel[];
}

export const USERS_QUERY_KEYS = {
  all: ["users"] as const,
  privacy: () => [...USERS_QUERY_KEYS.all, "privacy"] as const,
  export: () => [...USERS_QUERY_KEYS.all, "export"] as const,
} as const;

// ============================================================================
// Users Service
// ============================================================================

export const usersService = {
  /**
   * Обновить настройки приватности пользователя
   * PATCH /api/v1/account/me/privacy
   * Требует авторизации
   *
   * @param data - Новые настройки приватности
   * @returns Обновленные настройки приватности
   */
  updatePrivacySettings: async (
    data: UpdatePrivacySettingsDto
  ): Promise<UpdatePrivacyResponse> => {
    return accountSdk.account.updatePrivacy(
      data as never
    ) as unknown as Promise<UpdatePrivacyResponse>;
  },

  /**
   * Экспортировать данные пользователя (GDPR)
   * GET /api/v1/account/me/export
   * Требует авторизации
   *
   * @returns Все данные пользователя в формате JSON
   */
  exportData: async (): Promise<UserExportData> => {
    return accountSdk.account.exportData() as Promise<UserExportData>;
  },

  /**
   * Завершить онбординг пользователя
   * POST /api/v1/account/me/complete-onboarding
   * Вызывается после заполнения профиля нового пользователя
   *
   * @returns Сообщение об успешном завершении
   */
  completeOnboarding: async (): Promise<{ message: string }> => {
    await accountSdk.account.completeOnboarding();
    return { message: "Onboarding completed" };
  },

  /**
   * Справочники для формы доп. полей профиля (навыки, регионы, языки и т.д.)
   * GET /api/v1/public/profile-options — публичный, без авторизации
   */
  getProfileOptions: async (): Promise<ProfileOptionsResponse> => {
    return publicSdk.profile.getProfileOptions() as Promise<ProfileOptionsResponse>;
  },

  /**
   * Отметить, что пользователь заполнил доп. поля профиля.
   * Popup «Заполните доп. поля» больше не показывается.
   * POST /api/v1/account/me/complete-profile-info
   *
   * @returns Обновлённый объект профиля (как GET /account/me)
   */
  completeProfileInfo: async (): Promise<User> => {
    return accountSdk.account.completeProfileInfo() as Promise<User>;
  },
};
