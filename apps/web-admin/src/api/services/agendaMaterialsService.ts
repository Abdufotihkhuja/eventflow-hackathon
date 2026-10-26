/**
 * API сервис для управления материалами элементов программы (агенды).
 * Контракт: docs/AGENDA_MATERIALS_API.md
 */

import { request } from '@api/apiClient'

import type {
  GetAgendaMaterialsResponse,
  UploadAgendaMaterialResponse,
  UploadAgendaMaterialMultipleResponse,
  AddAgendaLinkRequest,
} from './agenda.types'

const getMaterialsUrl = (eventId: string, agendaItemId: string) =>
  `/api/v1/events/${eventId}/agenda/${agendaItemId}/materials`

export const agendaMaterialsService = {
  /** Получить список материалов (массив URL) */
  getMaterials: (eventId: string, agendaItemId: string) =>
    request<GetAgendaMaterialsResponse>({
      method: 'GET',
      url: getMaterialsUrl(eventId, agendaItemId),
    }),

  /** Загрузить один файл */
  uploadFile: (eventId: string, agendaItemId: string, file: File) => {
    const formData = new FormData()
    formData.append('file', file)

    return request<UploadAgendaMaterialResponse, FormData>({
      method: 'POST',
      url: `${getMaterialsUrl(eventId, agendaItemId)}/upload`,
      data: formData,
    })
  },

  /** Загрузить несколько файлов (до 10 за раз) */
  uploadMultiple: (eventId: string, agendaItemId: string, files: File[]) => {
    const formData = new FormData()
    files.forEach(file => {
      formData.append('files', file)
    })

    return request<UploadAgendaMaterialMultipleResponse, FormData>({
      method: 'POST',
      url: `${getMaterialsUrl(eventId, agendaItemId)}/upload-multiple`,
      data: formData,
    })
  },

  /** Добавить ссылку (POST .../materials/link, body: url + title) */
  addLink: (eventId: string, agendaItemId: string, data: AddAgendaLinkRequest) =>
    request<{ url: string }>({
      method: 'POST',
      url: `${getMaterialsUrl(eventId, agendaItemId)}/link`,
      data: { url: data.url, title: data.title },
    }),

  /** Удалить материал (DELETE с body { fileUrl }) */
  deleteMaterial: (eventId: string, agendaItemId: string, fileUrl: string) =>
    request<void>({
      method: 'DELETE',
      url: getMaterialsUrl(eventId, agendaItemId),
      data: { fileUrl },
    }),

  /** URL для скачивания (для использования в iframe/новом окне не подходит — нужна авторизация) */
  getDownloadUrl: (eventId: string, agendaItemId: string, fileUrl: string): string => {
    const base = getMaterialsUrl(eventId, agendaItemId)
    return `${base}/download?fileUrl=${encodeURIComponent(fileUrl)}`
  },

  /** Скачать файл с авторизацией (возвращает Blob для сохранения на диск) */
  downloadFile: (eventId: string, agendaItemId: string, fileUrl: string) =>
    request<Blob>({
      method: 'GET',
      url: `${getMaterialsUrl(eventId, agendaItemId)}/download?fileUrl=${encodeURIComponent(fileUrl)}`,
      responseType: 'blob',
    }),
} as const
