/**
 * API сервис для управления программой (агендой) события
 */

import { request } from '@api/apiClient'

import type {
  AgendaItem,
  CreateAgendaItemRequest,
  UpdateAgendaItemRequest,
  GetAgendaResponse,
  ReorderAgendaRequest,
} from './agenda.types'

const getAgendaUrl = (eventId: string) => `/api/v1/events/${eventId}/agenda`

export const agendaService = {
  /** Получить программу события */
  getAgenda: (eventId: string) =>
    request<GetAgendaResponse>({
      method: 'GET',
      url: getAgendaUrl(eventId),
    }),

  /** Получить элемент программы по ID */
  getAgendaItem: (eventId: string, itemId: string) =>
    request<AgendaItem>({
      method: 'GET',
      url: `${getAgendaUrl(eventId)}/${itemId}`,
    }),

  /** Создать элемент программы */
  createAgendaItem: (eventId: string, data: CreateAgendaItemRequest) =>
    request<AgendaItem, CreateAgendaItemRequest>({
      method: 'POST',
      url: getAgendaUrl(eventId),
      data,
    }),

  /** Обновить элемент программы */
  updateAgendaItem: (eventId: string, itemId: string, data: UpdateAgendaItemRequest) =>
    request<AgendaItem, UpdateAgendaItemRequest>({
      method: 'PATCH',
      url: `${getAgendaUrl(eventId)}/${itemId}`,
      data,
    }),

  /** Удалить элемент программы */
  deleteAgendaItem: (eventId: string, itemId: string) =>
    request<void>({
      method: 'DELETE',
      url: `${getAgendaUrl(eventId)}/${itemId}`,
    }),

  /** Изменить порядок элементов программы */
  reorderAgenda: (eventId: string, data: ReorderAgendaRequest) =>
    request<AgendaItem[], ReorderAgendaRequest>({
      method: 'PATCH',
      url: `${getAgendaUrl(eventId)}/reorder`,
      data,
    }),
} as const
