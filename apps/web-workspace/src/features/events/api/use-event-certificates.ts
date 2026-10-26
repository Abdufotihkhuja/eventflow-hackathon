import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  eventCertificatesService,
  type GetCertificatesParams,
} from '@api/services'

export const eventCertificatesKeys = {
  all: ['event-certificates'] as const,
  list: (eventId: string, params?: GetCertificatesParams) =>
    [...eventCertificatesKeys.all, 'event', eventId, params] as const,
}

export function useEventCertificatesQuery(eventId: string, params?: GetCertificatesParams) {
  return useQuery({
    queryKey: eventCertificatesKeys.list(eventId, params),
    queryFn: () => eventCertificatesService.getCertificates(eventId, params),
    enabled: !!eventId,
    staleTime: 30_000,
  })
}

/**
 * Polls the async generation job status (every 2s) while a jobId is set.
 * Stops polling once the queue reports completed/failed; the caller clears the
 * jobId on terminal conditions (done, error, or progress reaching the target).
 */
export function useCertificateGenerationStatus(eventId: string, jobId: string | null) {
  return useQuery({
    queryKey: [...eventCertificatesKeys.all, 'generation-status', eventId, jobId],
    queryFn: () => eventCertificatesService.getGenerationStatus(eventId, jobId as string),
    enabled: !!eventId && !!jobId,
    refetchInterval: query => {
      const state = query.state.data?.state
      return state === 'completed' || state === 'failed' ? false : 2000
    },
    refetchIntervalInBackground: true,
  })
}

async function checkBlobForError(blob: Blob): Promise<void> {
  if (blob.type === 'application/json') {
    const text = await blob.text()
    try {
      const error = JSON.parse(text) as { message?: string }
      throw new Error(error.message || 'Ошибка сервера')
    } catch (e) {
      if (e instanceof Error) throw e
      throw new Error('Ошибка обработки ответа')
    }
  }
}

/**
 * Скачивает PDF сертификата (fetch с auth → blob).
 * Используйте openCertificateBlobInNewTab(blob) для открытия в новой вкладке.
 */
export function useDownloadCertificate(eventId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (certificateId: string) => {
      const blob = await eventCertificatesService.downloadCertificate(eventId, certificateId)
      await checkBlobForError(blob)
      return { blob, certificateId }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...eventCertificatesKeys.all, 'event', eventId],
      })
    },
  })
}

/**
 * Хелпер: открыть blob как PDF в новой вкладке
 */
export function openCertificateBlobInNewTab(blob: Blob): void {
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank', 'noopener,noreferrer')
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
