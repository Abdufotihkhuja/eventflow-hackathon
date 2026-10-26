/**
 * API сервис для управления организациями и сотрудниками
 */

import { request } from "@api/apiClient";
import { workspaceSdk } from "@api/sdk";

import type {
  Organization,
  CreateOrganizationRequest,
  UpdateOrganizationRequest,
  GetOrganizationsParams,
  GetOrganizationsResponse,
  UpdateMemberRequest,
  UpdateMemberPermissionsRequest,
  GetMembersParams,
  GetMembersResponse,
  MemberResponse,
  OrganizationRole,
  CreateRoleRequest,
  UpdateRoleRequest,
  GetRolesResponse,
  GetPermissionsResponse,
  DashboardStats,
  DashboardActivityItem,
  GetDashboardActivityParams,
  GetDashboardActivityResponse,
  Follower,
  GetFollowersParams,
  GetFollowersResponse,
  FollowersStats,
  ContactRequest,
  GetContactsParams,
  GetContactsResponse,
  ContactsStats,
  ContactRequestStatus,
  UpdateContactStatusRequest,
} from "./organization.types";

// ================================
// Organizations CRUD
// ================================

const ORGANIZATIONS_URL = "/api/v1/organizations";

export const organizationsService = {
  /** Получить текущую организацию */
  getMe: () => workspaceSdk.auth.getOrganizationMe() as Promise<Organization>,

  /** Получить список организаций */
  getOrganizations: (params?: GetOrganizationsParams) =>
    request<GetOrganizationsResponse>({
      method: "GET",
      url: ORGANIZATIONS_URL,
      params,
    }),

  /** Получить организацию по ID */
  getOrganization: (id: string) =>
    request<Organization>({
      method: "GET",
      url: `${ORGANIZATIONS_URL}/${id}`,
    }),

  /** Создать организацию */
  createOrganization: (data: CreateOrganizationRequest) => {
    if (data.logo) {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (key === "logo" && value instanceof File) {
            formData.append(key, value);
          } else {
            formData.append(key, String(value));
          }
        }
      });

      return request<Organization, FormData>({
        method: "POST",
        url: ORGANIZATIONS_URL,
        data: formData,
      });
    }

    return request<Organization, CreateOrganizationRequest>({
      method: "POST",
      url: ORGANIZATIONS_URL,
      data,
    });
  },

  /** Обновить текущую организацию */
  updateMe: (data: UpdateOrganizationRequest) => {
    if (data.logo) {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (key === "logo" && value instanceof File) {
            formData.append(key, value);
          } else {
            formData.append(key, String(value));
          }
        }
      });

      return request<Organization, FormData>({
        method: "PATCH",
        url: "/api/v1/workspace/me",
        data: formData,
      });
    }

    return workspaceSdk.auth.updateOrganizationProfile(
      data,
    ) as Promise<Organization>;
  },

  /** Удалить текущую организацию (soft) */
  deleteMe: () => workspaceSdk.auth.deleteAccount() as Promise<void>,

  /** Загрузить логотип организации (multipart) */
  uploadLogo: (file: File) =>
    workspaceSdk.auth.uploadOrganizationLogo(file) as Promise<{
      logoUrl: string;
    }>,

  /** Удалить логотип организации */
  deleteLogo: () => workspaceSdk.auth.deleteOrganizationLogo() as Promise<void>,

  /** Завершить онбординг организации */
  completeOnboarding: () =>
    workspaceSdk.auth.completeOnboarding() as Promise<void>,

  // ================================
  // Organization Members
  // API: /api/v1/organizations/members
  // ================================

  /** Получить список сотрудников */
  getMembers: (params?: GetMembersParams) =>
    request<GetMembersResponse>({
      method: "GET",
      url: `${ORGANIZATIONS_URL}/members`,
      params,
    }),

  /** Получить сотрудника по ID */
  getMember: (memberId: string) =>
    request<MemberResponse>({
      method: "GET",
      url: `${ORGANIZATIONS_URL}/members/${memberId}`,
    }),

  /** Обновить сотрудника */
  updateMember: (memberId: string, data: UpdateMemberRequest) =>
    request<MemberResponse, UpdateMemberRequest>({
      method: "PATCH",
      url: `${ORGANIZATIONS_URL}/members/${memberId}`,
      data,
    }),

  /** Удалить сотрудника */
  deleteMember: (memberId: string) =>
    request<void>({
      method: "DELETE",
      url: `${ORGANIZATIONS_URL}/members/${memberId}`,
    }),

  /** Обновить индивидуальные права сотрудника */
  updateMemberPermissions: (
    memberId: string,
    data: UpdateMemberPermissionsRequest,
  ) =>
    request<MemberResponse, UpdateMemberPermissionsRequest>({
      method: "PATCH",
      url: `${ORGANIZATIONS_URL}/members/${memberId}/permissions`,
      data,
    }),

  /** Повторно отправить приглашение сотруднику */
  resendInvitation: (memberId: string) =>
    request<void>({
      method: "POST",
      url: `${ORGANIZATIONS_URL}/members/${memberId}/resend-invitation`,
    }),

  /** Активация участника по токену (публичный endpoint, вызывать с токеном в body) */
  activateMember: (token: string) =>
    request<MemberResponse, { token: string }>({
      method: "POST",
      url: `${ORGANIZATIONS_URL}/members/activate`,
      data: { token },
    }),

  // ================================
  // Organization Roles
  // API: /api/v1/organizations/roles
  // ================================

  /** Получить роли организации */
  getRoles: () =>
    request<GetRolesResponse>({
      method: "GET",
      url: `${ORGANIZATIONS_URL}/roles`,
    }),

  /** Получить роль по ID */
  getRole: (roleId: string) =>
    request<{ data: OrganizationRole }>({
      method: "GET",
      url: `${ORGANIZATIONS_URL}/roles/${roleId}`,
    }),

  /** Создать роль */
  createRole: (data: CreateRoleRequest) =>
    request<{ data: OrganizationRole }, CreateRoleRequest>({
      method: "POST",
      url: `${ORGANIZATIONS_URL}/roles`,
      data,
    }),

  /** Обновить роль */
  updateRole: (roleId: string, data: UpdateRoleRequest) =>
    request<{ data: OrganizationRole }, UpdateRoleRequest>({
      method: "PATCH",
      url: `${ORGANIZATIONS_URL}/roles/${roleId}`,
      data,
    }),

  /** Удалить роль */
  deleteRole: (roleId: string) =>
    request<void>({
      method: "DELETE",
      url: `${ORGANIZATIONS_URL}/roles/${roleId}`,
    }),

  // ================================
  // Permissions (API: /api/v1/permissions)
  // ================================

  /** Получить список прав организации */
  getPermissions: () =>
    request<GetPermissionsResponse>({
      method: "GET",
      url: "/api/v1/permissions",
    }),

  // ================================
  // Dashboard организатора
  // ================================

  /** Статистика дашборда */
  getDashboardStats: () =>
    request<DashboardStats>({
      method: "GET",
      url: `${ORGANIZATIONS_URL}/dashboard/stats`,
    }),

  /** Активность за последние 24 ч */
  getDashboardActivity: (params?: GetDashboardActivityParams) =>
    request<GetDashboardActivityResponse>({
      method: "GET",
      url: `${ORGANIZATIONS_URL}/dashboard/activity`,
      params: { limit: params?.limit ?? 20 },
    }),

  // ================================
  // Подписчики (followers)
  // ================================

  /** Список подписчиков */
  getFollowers: (params?: GetFollowersParams) =>
    request<GetFollowersResponse>({
      method: "GET",
      url: `${ORGANIZATIONS_URL}/followers`,
      params,
    }),

  /** Статистика подписчиков */
  getFollowersStats: () =>
    request<FollowersStats>({
      method: "GET",
      url: `${ORGANIZATIONS_URL}/followers/stats`,
    }),

  // ================================
  // Заявки на связь (contacts)
  // ================================

  /** Список заявок на связь */
  getContacts: (params?: GetContactsParams) =>
    request<GetContactsResponse>({
      method: "GET",
      url: `${ORGANIZATIONS_URL}/contacts`,
      params,
    }),

  /** Статистика заявок */
  getContactsStats: () =>
    request<ContactsStats>({
      method: "GET",
      url: `${ORGANIZATIONS_URL}/contacts/stats`,
    }),

  /** Заявка по ID */
  getContact: (id: string) =>
    request<ContactRequest>({
      method: "GET",
      url: `${ORGANIZATIONS_URL}/contacts/${id}`,
    }),

  /** Обновить статус заявки */
  updateContactStatus: (id: string, data: UpdateContactStatusRequest) =>
    request<ContactRequest, UpdateContactStatusRequest>({
      method: "PATCH",
      url: `${ORGANIZATIONS_URL}/contacts/${id}/status`,
      data,
    }),
} as const;
