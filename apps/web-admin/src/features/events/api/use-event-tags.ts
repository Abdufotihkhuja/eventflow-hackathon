/**
 * Хуки для работы с тегами событий
 * @module features/events/api/use-event-tags
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  eventTagsService,
  organizationTagsService,
  type CreateTagParams,
  type GetTagsParams,
} from "@api/services";

/**
 * Query keys для тегов событий
 */
export const eventTagsKeys = {
  all: ["event-tags"] as const,
  list: (params?: GetTagsParams) => [...eventTagsKeys.all, "list", params] as const,
  event: (eventId: string) => [...eventTagsKeys.all, "event", eventId] as const,
};

/**
 * Хук для получения всех доступных тегов
 * GET /api/v1/events/tags
 * @param params - параметры запроса
 */
export function useEventTags(params?: GetTagsParams) {
  return useQuery({
    queryKey: eventTagsKeys.list(params),
    queryFn: () => eventTagsService.getAll(params),
    staleTime: 5 * 60 * 1000, // 5 минут
  });
}

/**
 * Хук для получения тегов конкретного мероприятия
 * GET /api/v1/events/{id}/tags
 * @param eventId - ID события
 */
export function useEventTagsById(eventId: string) {
  return useQuery({
    queryKey: eventTagsKeys.event(eventId),
    queryFn: () => eventTagsService.getEventTags(eventId),
    enabled: !!eventId,
    staleTime: 5 * 60 * 1000, // 5 минут
  });
}

/**
 * Хук для назначения тегов мероприятию
 * PUT /api/v1/events/{id}/tags
 */
export function useAssignEventTags() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ eventId, tagIds }: { eventId: string; tagIds: string[] }) =>
      eventTagsService.assignTags(eventId, tagIds),
    onSuccess: (_, { eventId }) => {
      // Инвалидируем кеш тегов конкретного события
      queryClient.invalidateQueries({ queryKey: eventTagsKeys.event(eventId) });
      // Инвалидируем кеш деталей события
      queryClient.invalidateQueries({ queryKey: ["events", "detail", eventId] });
    },
  });
}

/**
 * Query keys для тегов организации
 */
export const organizationTagsKeys = {
  all: ["organization-tags"] as const,
  list: (params?: GetTagsParams) => [...organizationTagsKeys.all, "list", params] as const,
};

/**
 * Хук для получения тегов организации
 * GET /api/v1/organizations/tags
 */
export function useOrganizationTags(params?: GetTagsParams) {
  return useQuery({
    queryKey: organizationTagsKeys.list(params),
    queryFn: () => organizationTagsService.getAll(params),
    staleTime: 5 * 60 * 1000, // 5 минут
  });
}

/**
 * Хук для создания тега организации
 * POST /api/v1/organizations/tags
 */
export function useCreateOrganizationTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTagParams) => organizationTagsService.create(data),
    onSuccess: () => {
      // Инвалидируем кеш тегов организации (все ключи, включая теги блога)
      queryClient.invalidateQueries({ queryKey: organizationTagsKeys.all });
      queryClient.invalidateQueries({ queryKey: ["tags"] }); // Для совместимости с блогом
      queryClient.invalidateQueries({ queryKey: eventTagsKeys.all });
    },
  });
}

/**
 * Хук для удаления тега организации
 * DELETE /api/v1/organizations/tags/{id}
 */
export function useDeleteOrganizationTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tagId: string) => organizationTagsService.delete(tagId),
    onSuccess: () => {
      // Инвалидируем кеш тегов организации (все ключи, включая теги блога)
      queryClient.invalidateQueries({ queryKey: organizationTagsKeys.all });
      queryClient.invalidateQueries({ queryKey: ["tags"] }); // Для совместимости с блогом
      queryClient.invalidateQueries({ queryKey: eventTagsKeys.all });
      // Также инвалидируем список событий (теги могли быть удалены из событий)
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
}
