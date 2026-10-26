import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  certificateTemplatesService,
  type CreateTemplateRequest,
  type UpdateTemplateRequest,
} from '@api/services'

import { eventsKeys } from './use-events-query'

export const certificateTemplatesKeys = {
  all: ['certificate-templates'] as const,
  list: (eventId: string) => [...certificateTemplatesKeys.all, 'event', eventId] as const,
}

export function useCertificateTemplatesQuery(eventId: string) {
  return useQuery({
    queryKey: certificateTemplatesKeys.list(eventId),
    queryFn: () => certificateTemplatesService.getTemplates(eventId),
    enabled: !!eventId,
    staleTime: 60_000,
  })
}

export function useCreateCertificateTemplate(eventId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateTemplateRequest) =>
      certificateTemplatesService.createTemplate(eventId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: certificateTemplatesKeys.list(eventId) })
      queryClient.invalidateQueries({ queryKey: eventsKeys.detail(eventId) })
    },
  })
}

export function useUpdateCertificateTemplate(eventId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ templateId, data }: { templateId: string; data: UpdateTemplateRequest }) =>
      certificateTemplatesService.updateTemplate(eventId, templateId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: certificateTemplatesKeys.list(eventId) })
    },
  })
}

export function useDeleteCertificateTemplate(eventId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (templateId: string) =>
      certificateTemplatesService.deleteTemplate(eventId, templateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: certificateTemplatesKeys.list(eventId) })
    },
  })
}
