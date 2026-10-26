/**
 * API: публичный профиль организатора и действия пользователя (USER)
 * GET /api/v1/organizations/:id/public
 * POST /api/v1/organizations/:id/follow, DELETE .../unfollow
 * GET /api/v1/organizations/:id/is-following
 * GET /api/v1/account/me/following-organizations
 * POST /api/v1/organizations/:id/contact
 */

import { apiGet, apiPost, apiDelete } from "../lib/apiClient";

// ============================================================================
// Types
// ============================================================================

export interface OrganizationPublicProfile {
  id: string;
  name: string;
  slug?: string;
  companyName?: string;
  logoUrl?: string;
  /** Customizable cover image set by the organizer in the workspace. */
  coverUrl?: string;
  description?: string;
  website?: string;
  city?: string;
  country?: string;
  verified?: boolean;
  verificationStatus?: string;
  eventsCount?: number;
  followersCount?: number;
  /** Присутствует только при запросе с JWT (авторизованный USER) */
  isFollowing?: boolean;
}

export interface CreateContactRequestDto {
  phone: string;
  message?: string;
}

// ============================================================================
// Endpoints
// ============================================================================

const org = (id: string) => `/api/v1/organizations/${id}`;

// ============================================================================
// Query Keys
// ============================================================================

export const ORGANIZATION_PUBLIC_QUERY_KEYS = {
  all: ["organization-public"] as const,
  profile: (id: string) =>
    [...ORGANIZATION_PUBLIC_QUERY_KEYS.all, "profile", id] as const,
  isFollowing: (id: string) =>
    [...ORGANIZATION_PUBLIC_QUERY_KEYS.all, "is-following", id] as const,
} as const;

// ============================================================================
// Service
// ============================================================================

export const organizationPublicService = {
  /**
   * Публичный профиль организатора (с isFollowing, если есть JWT).
   * Эндпоинт публичный (OptionalJwtAuthGuard): токен отправляется при наличии,
   * но 401 не должен редиректить гостя на /login — это публичная страница.
   */
  getPublicProfile: async (
    organizationId: string,
    locale?: "ru" | "uz" | "en"
  ): Promise<OrganizationPublicProfile> => {
    const query = locale ? `?locale=${locale}` : "";
    const raw = await apiGet<OrganizationPublicProfile>(
      `${org(organizationId)}/public${query}`,
      { skipAuthRedirect: true }
    );
    return {
      ...raw,
      verified: raw.verified ?? raw.verificationStatus === "APPROVED",
    };
  },

  follow: async (organizationId: string): Promise<{ success?: boolean }> => {
    return apiPost(`${org(organizationId)}/follow`);
  },

  unfollow: async (organizationId: string): Promise<{ success?: boolean }> => {
    return apiDelete(`${org(organizationId)}/unfollow`);
  },

  isFollowing: async (
    organizationId: string
  ): Promise<{ isFollowing: boolean }> => {
    return apiGet<{ isFollowing: boolean }>(
      `${org(organizationId)}/is-following`
    );
  },

  contact: async (
    organizationId: string,
    data: CreateContactRequestDto
  ): Promise<{ message?: string }> => {
    return apiPost(`${org(organizationId)}/contact`, data);
  },
};
