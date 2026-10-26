import { useMutation, useQueryClient } from '@tanstack/react-query'
import { organizationsService } from '@api/services'
import { CONTACTS_QUERY_KEY, CONTACTS_STATS_QUERY_KEY } from './use-contacts-query'
import { CONTACT_DETAIL_QUERY_KEY } from './use-contact-query'
import type { UpdateContactStatusRequest, ContactRequestStatus } from '@api/services'

export function useUpdateContactStatusMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateContactStatusRequest }) =>
      organizationsService.updateContactStatus(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: CONTACTS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: CONTACTS_STATS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: [...CONTACT_DETAIL_QUERY_KEY, id] })
    },
  })
}
