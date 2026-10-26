import { useMutation } from '@tanstack/react-query'

import {
  artifactBulkPreviewService,
  type ArtifactBulkPreviewRequest,
  type ArtifactBulkPreviewResponse,
} from '@api/services'

export function useArtifactBulkPreview(eventId: string) {
  return useMutation<ArtifactBulkPreviewResponse, { message?: string }, ArtifactBulkPreviewRequest>({
    mutationFn: (body: ArtifactBulkPreviewRequest) =>
      artifactBulkPreviewService.get(eventId, body),
  })
}
