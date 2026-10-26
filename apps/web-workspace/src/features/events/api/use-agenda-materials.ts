import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { agendaMaterialsService, type AddAgendaLinkRequest } from '@api/services'

import { agendaKeys } from './use-agenda'

// ================================
// Query Keys
// ================================

export const agendaMaterialsKeys = {
  all: (eventId: string, agendaItemId: string) =>
    [...agendaKeys.detail(eventId, agendaItemId), 'materials'] as const,
  list: (eventId: string, agendaItemId: string) =>
    [...agendaMaterialsKeys.all(eventId, agendaItemId), 'list'] as const,
}

// ================================
// Queries
// ================================

/**
 * Получить список материалов элемента программы
 */
export function useAgendaMaterialsQuery(eventId: string, agendaItemId: string, enabled = true) {
  return useQuery({
    queryKey: agendaMaterialsKeys.list(eventId, agendaItemId),
    queryFn: () => agendaMaterialsService.getMaterials(eventId, agendaItemId),
    enabled: enabled && !!eventId && !!agendaItemId,
    staleTime: 30_000, // 30 секунд
  })
}

// ================================
// Mutations
// ================================

/**
 * Загрузить один файл
 */
export function useUploadAgendaFile(eventId: string, agendaItemId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (file: File) => agendaMaterialsService.uploadFile(eventId, agendaItemId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: agendaMaterialsKeys.list(eventId, agendaItemId),
      })
    },
  })
}

/**
 * Загрузить несколько файлов
 */
export function useUploadMultipleAgendaFiles(eventId: string, agendaItemId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (files: File[]) =>
      agendaMaterialsService.uploadMultiple(eventId, agendaItemId, files),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: agendaMaterialsKeys.list(eventId, agendaItemId),
      })
    },
  })
}

/**
 * Добавить ссылку как материал
 */
export function useAddAgendaLink(eventId: string, agendaItemId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: AddAgendaLinkRequest) =>
      agendaMaterialsService.addLink(eventId, agendaItemId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: agendaMaterialsKeys.list(eventId, agendaItemId),
      })
    },
  })
}

/**
 * Удалить материал (передаётся fileUrl — строка из списка материалов)
 */
export function useDeleteAgendaMaterial(eventId: string, agendaItemId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (fileUrl: string) =>
      agendaMaterialsService.deleteMaterial(eventId, agendaItemId, fileUrl),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: agendaMaterialsKeys.list(eventId, agendaItemId),
      })
    },
  })
}
