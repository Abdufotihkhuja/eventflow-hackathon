import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  speakersService,
  type CreateSpeakerRequest,
  type UpdateSpeakerRequest,
  type InviteSpeakerRequest,
  type AcceptInvitationRequest,
  type RejectInvitationRequest,
} from '@api/services'

// ================================
// Query Keys
// ================================

export const speakersKeys = {
  all: (eventId: string) => ['events', eventId, 'speakers'] as const,
  list: (eventId: string) => [...speakersKeys.all(eventId), 'list'] as const,
  detail: (eventId: string, speakerId: string) =>
    [...speakersKeys.all(eventId), 'detail', speakerId] as const,
  invitation: (token: string) => ['speakers', 'invitation', token] as const,
}

// ================================
// Queries
// ================================

/**
 * Получить спикеров события
 */
export function useSpeakersQuery(eventId: string | undefined) {
  return useQuery({
    queryKey: speakersKeys.list(eventId || ''),
    queryFn: () => speakersService.getSpeakers(eventId!),
    enabled: !!eventId,
    staleTime: 60_000,
  })
}

/**
 * Получить спикера по ID
 */
export function useSpeakerQuery(eventId: string, speakerId: string) {
  return useQuery({
    queryKey: speakersKeys.detail(eventId, speakerId),
    queryFn: () => speakersService.getSpeaker(eventId, speakerId),
    enabled: !!eventId && !!speakerId,
  })
}

/**
 * Получить информацию о приглашении по токену (публичный)
 */
export function useSpeakerInvitationQuery(token: string) {
  return useQuery({
    queryKey: speakersKeys.invitation(token),
    queryFn: () => speakersService.getInvitation(token),
    enabled: !!token,
    staleTime: 0,
    retry: false,
  })
}

// ================================
// Mutations
// ================================

/**
 * Создать спикера (ручное добавление)
 */
export function useCreateSpeaker(eventId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateSpeakerRequest) => speakersService.createSpeaker(eventId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: speakersKeys.list(eventId) })
    },
  })
}

/**
 * Обновить спикера
 */
export function useUpdateSpeaker(eventId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ speakerId, data }: { speakerId: string; data: UpdateSpeakerRequest }) =>
      speakersService.updateSpeaker(eventId, speakerId, data),
    onSuccess: (_, { speakerId }) => {
      queryClient.invalidateQueries({ queryKey: speakersKeys.list(eventId) })
      queryClient.invalidateQueries({
        queryKey: speakersKeys.detail(eventId, speakerId),
      })
    },
  })
}

/**
 * Удалить спикера
 */
export function useDeleteSpeaker(eventId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (speakerId: string) => speakersService.deleteSpeaker(eventId, speakerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: speakersKeys.list(eventId) })
    },
  })
}

/**
 * Изменить порядок спикеров
 */
export function useReorderSpeakers(eventId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { speakerIds: string[] }) => speakersService.reorderSpeakers(eventId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: speakersKeys.list(eventId) })
    },
  })
}

// ================================
// Invitation Mutations
// ================================

/**
 * Отправить приглашение спикеру
 */
export function useInviteSpeaker(eventId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: InviteSpeakerRequest) => speakersService.inviteSpeaker(eventId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: speakersKeys.list(eventId) })
    },
  })
}

/**
 * Повторно отправить приглашение спикеру
 */
export function useResendSpeakerInvitation(eventId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (speakerId: string) => speakersService.resendInvitation(eventId, speakerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: speakersKeys.list(eventId) })
    },
  })
}

/**
 * Принять приглашение спикера (публичный, требует авторизации)
 */
export function useAcceptSpeakerInvitation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: AcceptInvitationRequest) => speakersService.acceptInvitation(data),
    onSuccess: (_, { token }) => {
      queryClient.invalidateQueries({ queryKey: speakersKeys.invitation(token) })
    },
  })
}

/**
 * Отклонить приглашение спикера (публичный, требует авторизации)
 */
export function useRejectSpeakerInvitation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: RejectInvitationRequest) => speakersService.rejectInvitation(data),
    onSuccess: (_, { token }) => {
      queryClient.invalidateQueries({ queryKey: speakersKeys.invitation(token) })
    },
  })
}
