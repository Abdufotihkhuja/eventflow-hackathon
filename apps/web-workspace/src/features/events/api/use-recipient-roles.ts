import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  recipientRolesService,
  type CreateRecipientRoleRequest,
  type UpdateRecipientRoleRequest,
} from '@api/services'

export const recipientRolesKeys = {
  all: ['recipient-roles'] as const,
  list: (eventId: string) => [...recipientRolesKeys.all, 'event', eventId] as const,
  deletePreview: (eventId: string, roleId: string) =>
    [...recipientRolesKeys.list(eventId), 'delete-preview', roleId] as const,
}

export function useRecipientRolesQuery(eventId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: recipientRolesKeys.list(eventId),
    queryFn: () => recipientRolesService.list(eventId),
    enabled: options?.enabled !== false && !!eventId,
    staleTime: 60_000,
  })
}

export function useCreateRecipientRole(eventId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateRecipientRoleRequest) =>
      recipientRolesService.create(eventId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recipientRolesKeys.list(eventId) })
      queryClient.invalidateQueries({ queryKey: ['artifact-template-summary', 'event', eventId] })
    },
  })
}

export function useUpdateRecipientRole(eventId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ roleId, body }: { roleId: string; body: UpdateRecipientRoleRequest }) =>
      recipientRolesService.update(eventId, roleId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recipientRolesKeys.list(eventId) })
      queryClient.invalidateQueries({ queryKey: ['artifact-template-summary', 'event', eventId] })
    },
  })
}

export function useActivateRecipientRole(eventId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (roleId: string) => recipientRolesService.activate(eventId, roleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recipientRolesKeys.list(eventId) })
      queryClient.invalidateQueries({ queryKey: ['artifact-template-summary', 'event', eventId] })
    },
  })
}

export function useDeactivateRecipientRole(eventId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (roleId: string) => recipientRolesService.deactivate(eventId, roleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recipientRolesKeys.list(eventId) })
      queryClient.invalidateQueries({ queryKey: ['artifact-template-summary', 'event', eventId] })
    },
  })
}

export function useRecipientRoleDeletePreview(
  eventId: string,
  roleId: string | null,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: recipientRolesKeys.deletePreview(eventId, roleId ?? ''),
    queryFn: () => recipientRolesService.deletePreview(eventId, roleId as string),
    enabled: options?.enabled !== false && !!eventId && !!roleId,
    staleTime: 30_000,
  })
}
