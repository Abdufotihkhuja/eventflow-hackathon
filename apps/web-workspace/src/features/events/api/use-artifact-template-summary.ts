import { useQuery } from '@tanstack/react-query'

import {
  artifactTemplateSummaryService,
  type GetArtifactTemplateSummaryParams,
} from '@api/services'

export const artifactTemplateSummaryKeys = {
  all: ['artifact-template-summary'] as const,
  event: (eventId: string, params?: GetArtifactTemplateSummaryParams) =>
    [...artifactTemplateSummaryKeys.all, 'event', eventId, params ?? {}] as const,
}

export function useArtifactTemplateSummaryQuery(
  eventId: string,
  params?: GetArtifactTemplateSummaryParams,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: artifactTemplateSummaryKeys.event(eventId, params),
    queryFn: () => artifactTemplateSummaryService.get(eventId, params),
    enabled: options?.enabled !== false && !!eventId,
    staleTime: 30_000,
  })
}
