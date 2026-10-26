/**
 * API сервис для работы с ролями организации
 * Эндпоинты: /api/v1/organizations/roles/*
 */

import { apiGet, apiPatch, apiPost, apiDelete } from "@shared/lib/apiClient";

// ==================== ТИПЫ ====================

/** Роль организации */
export interface OrganizationRole {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
  isDefault: boolean;
  membersCount: number;
  createdAt: string;
  updatedAt: string;
}

/** DTO для создания роли */
export interface CreateRoleDto {
  name: string;
  description?: string;
  permissions: string[];
}

/** DTO для обновления роли */
export interface UpdateRoleDto {
  name?: string;
  description?: string;
  permissions?: string[];
}

/** Доступное право */
export interface Permission {
  key: string;
  name: string;
  description?: string;
  group: string;
}

/** Группа прав */
export interface PermissionGroup {
  name: string;
  permissions: Permission[];
}

// ==================== QUERY KEYS ====================

export const ORGANIZATION_ROLES_QUERY_KEYS = {
  /** Ключ для списка ролей */
  list: ["organization-roles", "list"] as const,
  /** Ключ для одной роли */
  detail: (id: string) => ["organization-roles", "detail", id] as const,
  /** Ключ для списка прав */
  permissions: ["permissions", "list"] as const,
} as const;

// ==================== API СЕРВИС ====================

/**
 * Сервис для работы с API ролей организации
 */
export const organizationRolesService = {
  /**
   * Создать роль
   * POST /api/v1/organizations/roles
   */
  async create(data: CreateRoleDto): Promise<OrganizationRole> {
    return apiPost<OrganizationRole>("/api/v1/organizations/roles", data);
  },

  /**
   * Получить список ролей
   * GET /api/v1/organizations/roles
   */
  async findAll(): Promise<OrganizationRole[]> {
    return apiGet<OrganizationRole[]>("/api/v1/organizations/roles");
  },

  /**
   * Получить роль по ID
   * GET /api/v1/organizations/roles/{roleId}
   */
  async findOne(roleId: string): Promise<OrganizationRole> {
    return apiGet<OrganizationRole>(`/api/v1/organizations/roles/${roleId}`);
  },

  /**
   * Обновить роль
   * PATCH /api/v1/organizations/roles/{roleId}
   */
  async update(roleId: string, data: UpdateRoleDto): Promise<OrganizationRole> {
    return apiPatch<OrganizationRole>(
      `/api/v1/organizations/roles/${roleId}`,
      data
    );
  },

  /**
   * Удалить роль
   * DELETE /api/v1/organizations/roles/{roleId}
   */
  async delete(roleId: string): Promise<{ message: string }> {
    return apiDelete<{ message: string }>(
      `/api/v1/organizations/roles/${roleId}`
    );
  },
};

/**
 * Сервис для работы с API прав доступа
 */
export const permissionsService = {
  /**
   * Получить список всех доступных прав
   * GET /api/v1/permissions
   */
  async findAll(): Promise<PermissionGroup[]> {
    return apiGet<PermissionGroup[]>("/api/v1/permissions");
  },
};
