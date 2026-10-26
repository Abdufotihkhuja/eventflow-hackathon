/**
 * Приглашения в команду организации, адресованные текущему аккаунту.
 * Эндпоинты: /api/v1/organizations/invites/mine[/{inviteId}/accept]
 *
 * Кабинет показывает приглашение сам — не заставляя человека искать письмо.
 */

import { accountSdk } from "./sdk";

// ==================== ТИПЫ ====================

/** Роль, на которую зовут в организацию */
export interface MyInviteRole {
  id: string;
  name: string;
}

/** Приглашение глазами приглашённого */
export interface MyInvite {
  id: string;
  organizationId: string;
  organizationName: string;
  organizationLogoUrl?: string | null;
  role: MyInviteRole;
  expiresAt: string;
  createdAt: string;
}

/** Результат принятия приглашения */
export interface AcceptMyInviteResult {
  code: string;
  organizationId: string;
  organizationName: string;
  organizationMemberId: string;
  role: MyInviteRole;
  /** true — нужно перелогиниться; в кабинете всегда false, сессия уже есть */
  requiresLogin: boolean;
}

// ==================== QUERY KEYS ====================

export const ORGANIZATION_INVITES_QUERY_KEYS = {
  all: ["organization-invites"] as const,
  mine: () => [...ORGANIZATION_INVITES_QUERY_KEYS.all, "mine"] as const,
};

// ==================== СЕРВИС ====================

export const organizationInvitesService = {
  /** GET /api/v1/organizations/invites/mine */
  getMyInvites: async (): Promise<MyInvite[]> => {
    return accountSdk.me.invites() as unknown as Promise<MyInvite[]>;
  },

  /** POST /api/v1/organizations/invites/mine/{inviteId}/accept */
  acceptInvite: async (inviteId: string): Promise<AcceptMyInviteResult> => {
    return accountSdk.me.acceptInvite(
      inviteId
    ) as unknown as Promise<AcceptMyInviteResult>;
  },

  /** POST /api/v1/organizations/invites/mine/{inviteId}/decline */
  declineInvite: async (inviteId: string, reason?: string): Promise<void> => {
    await accountSdk.me.declineInvite(inviteId, { reason } as never);
  },
};

// ==================== ОРГАНИЗАЦИИ АККАУНТА ====================

/** Организация, в которой аккаунт состоит сотрудником или владельцем */
export interface MyOrganizationSummary {
  organizationId: string;
  name: string;
  companyName?: string | null;
  logoUrl?: string | null;
  isOwner: boolean;
  roleName?: string | null;
}

export const MY_ORGANIZATIONS_QUERY_KEY = ["me-organizations"] as const;

export const myOrganizationsService = {
  /** GET /api/v1/me/organizations */
  list: async (): Promise<MyOrganizationSummary[]> => {
    return accountSdk.me.organizations() as unknown as Promise<
      MyOrganizationSummary[]
    >;
  },
};
