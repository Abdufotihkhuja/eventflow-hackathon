import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

import { ticketsService, type TicketDesign, type DownloadAllTicketsRequest } from '@api/services'

// ================================
// Helper Functions
// ================================

/**
 * Скачивает файл из blob
 */
function downloadFile(blob: Blob, filename: string) {
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
 * Проверяет, является ли blob на самом деле JSON ошибкой
 * Бэкенд может вернуть JSON ошибку с responseType: blob
 */
async function checkBlobForError(blob: Blob): Promise<void> {
  // Если это JSON ответ (ошибка), тип будет application/json
  if (blob.type === 'application/json') {
    const text = await blob.text()
    try {
      const error = JSON.parse(text)
      throw new Error(error.message || 'Неизвестная ошибка сервера')
    } catch (e) {
      if (e instanceof Error && e.message !== 'Неизвестная ошибка сервера') {
        throw e
      }
      throw new Error('Ошибка обработки ответа сервера')
    }
  }
}

/**
 * Форматирует сообщение об ошибке
 */
function getErrorMessage(error: unknown): string {
  // Проверяем стандартную структуру ошибки из apiClient
  if (typeof error === 'object' && error !== null) {
    const err = error as { status?: number; message?: string }

    if (err.status) {
      switch (err.status) {
        case 404:
          return 'Регистрация не найдена или нет билетов для скачивания'
        case 400:
          return 'Билет доступен только для одобренных регистраций'
        case 403:
          return 'Нет доступа к этой регистрации'
        default:
          return err.message || 'Ошибка сервера'
      }
    }

    if (err.message) {
      return err.message
    }
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'Произошла неизвестная ошибка'
}

// ================================
// Mutations
// ================================

/**
 * Скачать билет одного участника
 */
export function useDownloadTicket(eventId: string) {
  return useMutation({
    mutationFn: async ({
      registrationId,
      design,
      participantName,
    }: {
      registrationId: string
      design: TicketDesign
      participantName?: string
    }) => {
      const blob = await ticketsService.getTicket(eventId, registrationId, design)

      // Проверяем, не вернул ли сервер JSON ошибку вместо PDF
      await checkBlobForError(blob)

      // Формируем имя файла
      const designSuffix = design === 'branded' ? 'branded' : 'simple'
      const namePart = participantName ? `_${participantName.replace(/\s+/g, '_')}` : ''
      const filename = `ticket_${designSuffix}${namePart}.pdf`

      return { blob, filename }
    },
    onSuccess: ({ blob, filename }) => {
      downloadFile(blob, filename)
      toast.success('Билет успешно скачан')
    },
    onError: (error: unknown) => {
      const message = getErrorMessage(error)
      toast.error(`Ошибка при скачивании билета: ${message}`)
    },
  })
}

/**
 * Массовое скачивание билетов в ZIP-архиве
 */
export function useDownloadAllTickets(eventId: string) {
  return useMutation({
    mutationFn: async (params: DownloadAllTicketsRequest & { eventTitle?: string }) => {
      const { eventTitle, ...requestParams } = params
      const blob = await ticketsService.downloadAllTickets(eventId, requestParams)

      // Проверяем, не вернул ли сервер JSON ошибку вместо ZIP
      await checkBlobForError(blob)

      // Формируем имя файла для ZIP
      const designSuffix = params.design === 'simple' ? 'simple' : 'branded'
      const eventPart = eventTitle ? `_${eventTitle.replace(/\s+/g, '_')}` : ''
      const filename = `tickets_${designSuffix}${eventPart}.zip`

      return { blob, filename }
    },
    onSuccess: ({ blob, filename }) => {
      downloadFile(blob, filename)
      toast.success('Билеты успешно скачаны', {
        description: 'ZIP-архив со всеми билетами сохранен',
      })
    },
    onError: (error: unknown) => {
      const message = getErrorMessage(error)

      // Специальная обработка для пустого списка
      if (
        message.includes('не найден') ||
        message.includes('Нет регистраций') ||
        message.includes('нет билетов')
      ) {
        toast.error('Нет билетов для скачивания', {
          description: 'Убедитесь, что есть одобренные участники',
        })
      } else {
        toast.error(`Ошибка при скачивании билетов: ${message}`)
      }
    },
  })
}
