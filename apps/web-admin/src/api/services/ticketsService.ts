/**
 * API сервис для работы с билетами событий
 * Использует актуальные event-scoped пути (/events/:id/tickets)
 */

import { api } from '@api/config'

import type { TicketDesign, DownloadAllTicketsRequest } from './ticket.types'

const getTicketsUrl = (eventId: string) => `/api/v1/events/${eventId}/tickets`

export const ticketsService = {
  /**
   * Скачать билет одного участника (путь под событием)
   * @param eventId - ID события
   * @param registrationId - ID регистрации
   * @param design - Дизайн билета (branded или simple)
   * @returns PDF файл как Blob
   */
  getTicket: async (
    eventId: string,
    registrationId: string,
    design: TicketDesign
  ): Promise<Blob> => {
    const response = await api.get<Blob>(`${getTicketsUrl(eventId)}/${registrationId}`, {
      params: { design },
      responseType: 'blob',
    })
    return response.data
  },

  /**
   * Массовое скачивание билетов в ZIP-архиве (путь под событием)
   * @param eventId - ID события
   * @param data - Параметры фильтрации и дизайна
   * @returns ZIP архив как Blob
   */
  downloadAllTickets: async (eventId: string, data: DownloadAllTicketsRequest): Promise<Blob> => {
    const response = await api.post<Blob>(`${getTicketsUrl(eventId)}/download-all`, data, {
      responseType: 'blob',
    })
    return response.data
  },
} as const
