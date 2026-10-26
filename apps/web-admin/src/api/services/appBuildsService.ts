/**
 * API сервис для сборок мобильного приложения (Super Admin)
 * Endpoints: /api/v1/super-admin/app-builds
 */

import { api } from '@api/config'
import { request } from '@api/apiClient'

import type { AppBuild, UploadAppBuildRequest } from './appBuild.types'

const APP_BUILDS_URL = '/api/v1/super-admin/app-builds'

// Сборки — до 400 МБ: дефолтные 15s клиента обрывают передачу на медленном
// канале, поэтому для upload/download свой потолок (синхронен с nginx 600s).
const TRANSFER_TIMEOUT_MS = 600_000

export const appBuildsService = {
  /** Список сборок (новые сверху) */
  getBuilds: () =>
    request<AppBuild[]>({
      method: 'GET',
      url: APP_BUILDS_URL,
    }),

  /** Загрузить сборку (APK/AAB/IPA) */
  uploadBuild: ({ file, platform, version, notes, onUploadProgress }: UploadAppBuildRequest) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('platform', platform)
    formData.append('version', version)
    if (notes) formData.append('notes', notes)

    return request<AppBuild, FormData>({
      method: 'POST',
      url: APP_BUILDS_URL,
      data: formData,
      timeout: TRANSFER_TIMEOUT_MS,
      onUploadProgress: onUploadProgress
        ? (e) => {
            const percent = e.total ? Math.round((e.loaded * 100) / e.total) : 0
            onUploadProgress(percent)
          }
        : undefined,
    })
  },

  /** Скачать сборку как Blob (мимо request-обёртки — она распаковывает JSON) */
  downloadBuild: async (id: string): Promise<Blob> => {
    const response = await api.get<Blob>(`${APP_BUILDS_URL}/${id}/download`, {
      responseType: 'blob',
      timeout: TRANSFER_TIMEOUT_MS,
    })
    return response.data
  },

  /** Удалить сборку */
  deleteBuild: (id: string) =>
    request<{ message: string }>({
      method: 'DELETE',
      url: `${APP_BUILDS_URL}/${id}`,
    }),
} as const
