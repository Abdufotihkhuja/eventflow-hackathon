/**
 * API сервис для работы с организациями
 * Эндпоинты: /api/v1/organizations/*
 */

import { publicSdk } from "./sdk";

// ==================== ТИПЫ ====================

/** Верификационный статус организации */
export type OrganizationVerificationStatus =
  | "PENDING"
  | "VERIFIED"
  | "REJECTED";

/** Сущность организации */
export interface Organization {
  id: string;
  name: string;
  slug: string;
  email: string;
  description?: string;
  website?: string;
  phone?: string;
  logoUrl?: string;
  address?: string;
  city?: string;
  country?: string;
  verificationStatus: OrganizationVerificationStatus;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** DTO для обновления организации */
export interface UpdateOrganizationDto {
  organizationName?: string;
  description?: string;
  website?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
}

/** Ответ загрузки логотипа */
export interface UploadLogoResponse {
  logoUrl: string;
  message: string;
}

/** Ответ удаления логотипа */
export interface DeleteLogoResponse {
  message: string;
}

// ==================== QUERY KEYS ====================

export const ORGANIZATIONS_QUERY_KEYS = {
  /** Ключ для текущей организации */
  me: ["organizations", "me"] as const,
} as const;

// ==================== API СЕРВИС ====================

/**
 * Сервис для работы с API организаций
 */
export const organizationsService = {
  /**
   * Получить текущую организацию
   * GET /api/v1/workspace/me
   */
  async getMe(): Promise<Organization> {
    return publicSdk.organizations.getMe() as unknown as Promise<Organization>;
  },

  /**
   * Обновить текущую организацию
   * PATCH /api/v1/workspace/me
   */
  async updateMe(data: UpdateOrganizationDto): Promise<Organization> {
    return publicSdk.organizations.updateMe(data as never) as unknown as Promise<Organization>;
  },

  /**
   * Удалить организацию (soft delete)
   * DELETE /api/v1/workspace/me
   */
  async deleteMe(): Promise<{ message: string }> {
    await publicSdk.organizations.deleteMe();
    return { message: "Organization deleted" };
  },

  /**
   * Загрузить логотип организации
   * POST /api/v1/workspace/me/logo
   */
  async uploadLogo(file: File): Promise<UploadLogoResponse> {
    const organization = await publicSdk.organizations.uploadLogo(file);
    return {
      logoUrl: (organization as unknown as Organization).logoUrl ?? "",
      message: "Logo uploaded",
    };
  },

  /**
   * Удалить логотип организации
   * DELETE /api/v1/workspace/me/logo
   */
  async deleteLogo(): Promise<DeleteLogoResponse> {
    await publicSdk.organizations.deleteLogo();
    return { message: "Logo deleted" };
  },

  /**
   * Завершить онбординг организации
   * POST /api/v1/workspace/me/complete-onboarding
   * Вызывается после заполнения профиля новой организации
   */
  async completeOnboarding(): Promise<{ message: string }> {
    await publicSdk.organizations.completeOnboarding();
    return { message: "Onboarding completed" };
  },
};
