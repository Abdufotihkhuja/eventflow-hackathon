import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import {
  artifactRecipientsService,
  type AssignArtifactRecipientRoleRequest,
  type BatchCreateArtifactRecipientsRequest,
  type CreateManualArtifactRecipientRequest,
  type GetArtifactRecipientsParams,
  type UpdateManualArtifactRecipientRequest,
} from '@api/services'

export const artifactRecipientsKeys = {
  all: ['artifact-recipients'] as const,
  event: (eventId: string) => [...artifactRecipientsKeys.all, 'event', eventId] as const,
  list: (eventId: string, params?: GetArtifactRecipientsParams) =>
    [...artifactRecipientsKeys.event(eventId), 'list', params] as const,
}

export function useArtifactRecipientsQuery(
  eventId: string,
  params?: GetArtifactRecipientsParams,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: artifactRecipientsKeys.list(eventId, params),
    queryFn: () => artifactRecipientsService.list(eventId, params),
    enabled: options?.enabled !== false && !!eventId,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  })
}

/** Page-by-page recipients for scroll-load (infinite) selection lists. */
export function useArtifactRecipientsInfiniteQuery(
  eventId: string,
  params?: Omit<GetArtifactRecipientsParams, 'page'>,
  options?: { enabled?: boolean }
) {
  return useInfiniteQuery({
    queryKey: [...artifactRecipientsKeys.event(eventId), 'infinite', params],
    queryFn: ({ pageParam }) =>
      artifactRecipientsService.list(eventId, { ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: lastPage =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
    enabled: options?.enabled !== false && !!eventId,
    staleTime: 30_000,
    // Keep the current list on screen while a new search/filter loads.
    placeholderData: keepPreviousData,
  })
}

export function useCreateArtifactRecipient(eventId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateManualArtifactRecipientRequest) =>
      artifactRecipientsService.create(eventId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: artifactRecipientsKeys.event(eventId) })
      queryClient.invalidateQueries({ queryKey: ['artifact-template-summary', 'event', eventId] })
    },
  })
}

export function useBatchCreateArtifactRecipients(eventId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: BatchCreateArtifactRecipientsRequest) =>
      artifactRecipientsService.batchCreate(eventId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: artifactRecipientsKeys.event(eventId) })
      queryClient.invalidateQueries({ queryKey: ['artifact-template-summary', 'event', eventId] })
    },
  })
}

export function useUpdateArtifactRecipient(eventId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      recipientId,
      body,
    }: {
      recipientId: string
      body: UpdateManualArtifactRecipientRequest
    }) => artifactRecipientsService.update(eventId, recipientId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: artifactRecipientsKeys.event(eventId) })
    },
  })
}

export function useAssignRecipientRole(eventId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      recipientId,
      body,
    }: {
      recipientId: string
      body: AssignArtifactRecipientRoleRequest
    }) => artifactRecipientsService.assignRole(eventId, recipientId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: artifactRecipientsKeys.event(eventId) })
      queryClient.invalidateQueries({ queryKey: ['artifact-template-summary', 'event', eventId] })
    },
  })
}

export function useDeactivateRecipientRoleAssignment(eventId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ recipientId, roleId }: { recipientId: string; roleId: string }) =>
      artifactRecipientsService.deactivateRole(eventId, recipientId, roleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: artifactRecipientsKeys.event(eventId) })
      queryClient.invalidateQueries({ queryKey: ['artifact-template-summary', 'event', eventId] })
    },
  })
}
