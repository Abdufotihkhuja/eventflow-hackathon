/**
 * API сервис для работы с тегами
 * @module api/services/tagsService
 */

import { apiClient } from "@api/apiClient";

/**
 * Тег организации
 */
export interface OrganizationTag {
  id: string;
  name: string;
  slug: string;
  category: "CUSTOM" | "SYSTEM";
  isSystem: boolean;
  organizationId: string;
  createdAt: string;
  _count?: {
    events: number;
  };
}

/**
 * Тег события (упрощенная версия)
 */
export interface EventTag {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
}

/**
 * Универсальный тип тега для UI компонентов
 */
export type Tag = OrganizationTag | EventTag;

/**
 * Параметры для получения тегов
 */
export interface GetTagsParams {
  search?: string;
  limit?: number;
}

/**
 * Ответ со списком тегов (для событий)
 */
export interface GetTagsResponse {
  data: EventTag[];
  total: number;
}

/**
 * Параметры для создания тега
 */
export interface CreateTagParams {
  name: string;
}

/**
 * Сервис для работы с тегами организации
 */
export const organizationTagsService = {
  /**
   * Получить список тегов организации
   * GET /api/v1/organizations/tags
   * Возвращает массив тегов напрямую
   */
  getAll: (params?: GetTagsParams) =>
    apiClient.get<OrganizationTag[]>("/api/v1/organizations/tags", { params }),

  /**
   * Создать новый тег организации
   * POST /api/v1/organizations/tags
   */
  create: (data: CreateTagParams) =>
    apiClient.post<OrganizationTag>("/api/v1/organizations/tags", data),

  /**
   * Удалить кастомный тег организации
   * DELETE /api/v1/organizations/tags/{id}
   */
  delete: (tagId: string) =>
    apiClient.delete(`/api/v1/organizations/tags/${tagId}`),
};

/**
 * Сервис для работы с тегами событий
 */
export const eventTagsService = {
  /**
   * Получить все доступные теги
   * GET /api/v1/events/tags
   */
  getAll: (params?: GetTagsParams) =>
    apiClient.get<GetTagsResponse>("/api/v1/events/tags", { params }),

  /**
   * Получить теги мероприятия
   * GET /api/v1/events/{id}/tags
   */
  getEventTags: (eventId: string) =>
    apiClient.get<GetTagsResponse>(`/api/v1/events/${eventId}/tags`),

  /**
   * Назначить теги мероприятию
   * PUT /api/v1/events/{id}/tags
   */
  assignTags: (eventId: string, tagIds: string[]) =>
    apiClient.put(`/api/v1/events/${eventId}/tags`, { tagIds }),
};
