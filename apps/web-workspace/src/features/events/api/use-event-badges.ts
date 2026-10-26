import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  badgeTemplatesService,
  eventBadgesService,
  type BadgeFieldArea,
  type CreateBadgeTemplateRequest,
  type DownloadBadgesRequest,
} from '@api/services'
import { normalizeBlobApiError } from '@features/billing'

export const eventBadgesKeys = {
  all: ['event-badges'] as const,
  templates: (eventId: string) => [...eventBadgesKeys.all, 'templates', eventId] as const,
}

export function useBadgeTemplatesQuery(eventId: string) {
  return useQuery({
    queryKey: eventBadgesKeys.templates(eventId),
    queryFn: () => badgeTemplatesService.getTemplates(eventId),
    enabled: !!eventId,
    staleTime: 30_000,
  })
}

export function useCreateBadgeTemplate(eventId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateBadgeTemplateRequest) =>
      badgeTemplatesService.createTemplate(eventId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventBadgesKeys.templates(eventId) })
      toast.success('Шаблон бейджа загружен')
    },
    onError: (error: { message?: string }) => {
      toast.error(error.message ?? 'Не удалось загрузить шаблон бейджа')
    },
  })
}

export function useUpdateBadgeTemplate(eventId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      templateId,
      patch,
    }: {
      templateId: string
      patch: {
        name?: string
        isDefault?: boolean
        namePosition?: BadgeFieldArea | null
        firstNamePosition?: BadgeFieldArea | null
        lastNamePosition?: BadgeFieldArea | null
        rolePosition?: BadgeFieldArea | null
        eventNamePosition?: BadgeFieldArea | null
        qrPosition?: BadgeFieldArea | null
        nameFont?: string
        nameFontSize?: number
        nameColor?: string
        roleLabel?: string | null
        roleFontSize?: number | null
        roleColor?: string | null
        eventLabel?: string | null
        eventFontSize?: number | null
        eventColor?: string | null
      }
    }) => badgeTemplatesService.updateTemplate(eventId, templateId, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventBadgesKeys.templates(eventId) })
      toast.success('Шаблон бейджа обновлён')
    },
    onError: (error: { message?: string }) => {
      toast.error(error.message ?? 'Не удалось обновить шаблон бейджа')
    },
  })
}

export function useDeleteBadgeTemplate(eventId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (templateId: string) => badgeTemplatesService.deleteTemplate(eventId, templateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventBadgesKeys.templates(eventId) })
      toast.success('Шаблон бейджа удалён')
    },
    onError: (error: { message?: string }) => {
      toast.error(error.message ?? 'Не удалось удалить шаблон бейджа')
    },
  })
}

async function checkBlobForError(blob: Blob): Promise<void> {
  if (blob.type === 'application/json') {
    const text = await blob.text()
    const error = JSON.parse(text) as { message?: string }
    throw new Error(error.message || 'Ошибка сервера')
  }
}

function downloadFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Ставит выгрузку бейджей в очередь.
 *
 * Синхронного скачивания больше нет: каждый бейдж рендерится заново, и на
 * нескольких десятках получателей запрос не укладывался в таймаут клиента —
 * организатор видел «Не удалось подключиться к серверу» на живом сервере.
 * Ответ либо `ready` (архив уже собран раньше), либо `processing` — дальше
 * вкладка следит за прогрессом через {@link useBadgesZipStatus}.
 */
export function useRequestBadgesZip(eventId: string) {
  return useMutation({
    mutationFn: async (params: DownloadBadgesRequest) => {
      try {
        return await eventBadgesService.requestDownload(eventId, params)
      } catch (error) {
        // C-11 (mapBillingError) ждёт обычный ApiError с JSON-details,
        // чтобы увидеть 409 BILLING_QUOTA_EXCEEDED генераций.
        throw await normalizeBlobApiError(error)
      }
    },
  })
}

/** Опрос статуса сборки (раз в 2 с), пока задан jobId. */
export function useBadgesZipStatus(eventId: string, jobId: string | null) {
  return useQuery({
    queryKey: [...eventBadgesKeys.all, 'zip-status', eventId, jobId],
    queryFn: () => eventBadgesService.getDownloadStatus(eventId, jobId as string),
    enabled: !!eventId && !!jobId,
    refetchInterval: query => {
      const status = query.state.data?.status
      return status && status !== 'processing' ? false : 2000
    },
    refetchIntervalInBackground: true,
  })
}

/** Скачивание готового архива по jobId. */
export function useFetchBadgesArchive(eventId: string) {
  return useMutation({
    mutationFn: async ({ jobId, filename }: { jobId: string; filename?: string }) => {
      let blob: Blob
      try {
        blob = await eventBadgesService.fetchArchive(eventId, jobId)
      } catch (error) {
        throw await normalizeBlobApiError(error)
      }
      await checkBlobForError(blob)
      return { blob, filename: filename ?? 'badges.zip' }
    },
    onSuccess: ({ blob, filename }) => {
      downloadFile(blob, filename)
    },
  })
}
