import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  agendaService,
  type CreateAgendaItemRequest,
  type UpdateAgendaItemRequest,
} from '@api/services'

// ================================
// Query Keys
// ================================

export const agendaKeys = {
  all: (eventId: string) => ['events', eventId, 'agenda'] as const,
  list: (eventId: string) => [...agendaKeys.all(eventId), 'list'] as const,
  detail: (eventId: string, itemId: string) =>
    [...agendaKeys.all(eventId), 'detail', itemId] as const,
}

// ================================
// Queries
// ================================

/**
 * Получить программу события
 */
export function useAgendaQuery(eventId: string) {
  return useQuery({
    queryKey: agendaKeys.list(eventId),
    queryFn: () => agendaService.getAgenda(eventId),
    enabled: !!eventId,
    staleTime: 60_000,
  })
}

/**
 * Получить элемент программы по ID
 */
export function useAgendaItemQuery(eventId: string, itemId: string) {
  return useQuery({
    queryKey: agendaKeys.detail(eventId, itemId),
    queryFn: () => agendaService.getAgendaItem(eventId, itemId),
    enabled: !!eventId && !!itemId,
  })
}

// ================================
// Mutations
// ================================

/**
 * Создать элемент программы
 */
export function useCreateAgendaItem(eventId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateAgendaItemRequest) => agendaService.createAgendaItem(eventId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agendaKeys.list(eventId) })
    },
  })
}

/**
 * Обновить элемент программы
 */
export function useUpdateAgendaItem(eventId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ itemId, data }: { itemId: string; data: UpdateAgendaItemRequest }) =>
      agendaService.updateAgendaItem(eventId, itemId, data),
    onSuccess: (_, { itemId }) => {
      queryClient.invalidateQueries({ queryKey: agendaKeys.list(eventId) })
      queryClient.invalidateQueries({ queryKey: agendaKeys.detail(eventId, itemId) })
    },
  })
}

/**
 * Удалить элемент программы
 */
export function useDeleteAgendaItem(eventId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (itemId: string) => agendaService.deleteAgendaItem(eventId, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agendaKeys.list(eventId) })
    },
  })
}

/**
 * Изменить порядок программы
 */
export function useReorderAgenda(eventId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (itemIds: string[]) => agendaService.reorderAgenda(eventId, { itemIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agendaKeys.list(eventId) })
    },
  })
}
