/**
 * API сервис для загрузки файлов
 */

import { request } from '@api/apiClient'

import type {
  UploadType,
  UploadedFile,
  UploadFileResponse,
  UploadMultipleFilesResponse,
  GetSignedUrlRequest,
  GetSignedUrlResponse,
} from './upload.types'

const UPLOADS_URL = '/v1/uploads'

export const uploadsService = {
  /** Загрузить один файл */
  uploadFile: (file: File, type: UploadType, folder?: string) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', type)
    if (folder) formData.append('folder', folder)

    return request<UploadFileResponse, FormData>({
      method: 'POST',
      url: UPLOADS_URL,
      data: formData,
    })
  },

  /** Загрузить несколько файлов */
  uploadMultiple: (files: File[], type: UploadType, folder?: string) => {
    const formData = new FormData()
    files.forEach(file => formData.append('files', file))
    formData.append('type', type)
    if (folder) formData.append('folder', folder)

    return request<UploadMultipleFilesResponse, FormData>({
      method: 'POST',
      url: `${UPLOADS_URL}/multiple`,
      data: formData,
    })
  },

  /** Загрузить изображение (с оптимизацией) */
  uploadImage: (
    file: File,
    options?: {
      maxWidth?: number
      maxHeight?: number
      quality?: number
      onUploadProgress?: (percent: number) => void
    }
  ) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', 'image')
    if (options?.maxWidth) formData.append('maxWidth', String(options.maxWidth))
    if (options?.maxHeight) formData.append('maxHeight', String(options.maxHeight))
    if (options?.quality) formData.append('quality', String(options.quality))

    return request<UploadFileResponse, FormData>({
      method: 'POST',
      url: `${UPLOADS_URL}/image`,
      data: formData,
      onUploadProgress: options?.onUploadProgress
        ? (e) => {
            const percent = e.total ? Math.round((e.loaded * 100) / e.total) : 0
            options.onUploadProgress!(percent)
          }
        : undefined,
    })
  },

  /** Получить signed URL для прямой загрузки (для больших файлов) */
  getSignedUrl: (data: GetSignedUrlRequest) =>
    request<GetSignedUrlResponse, GetSignedUrlRequest>({
      method: 'POST',
      url: `${UPLOADS_URL}/signed-url`,
      data,
    }),

  /** Удалить файл */
  deleteFile: (fileId: string) =>
    request<void>({
      method: 'DELETE',
      url: `${UPLOADS_URL}/${fileId}`,
    }),

  /** Удалить файл по URL */
  deleteFileByUrl: (fileUrl: string) =>
    request<void, { fileUrl: string }>({
      method: 'DELETE',
      url: `${UPLOADS_URL}/by-url`,
      data: { fileUrl },
    }),

  /** Получить информацию о файле */
  getFileInfo: (fileId: string) =>
    request<UploadedFile>({
      method: 'GET',
      url: `${UPLOADS_URL}/${fileId}`,
    }),
} as const
