/**
 * Выгрузка пользователей в XLSX (Super Admin)
 * Endpoint: GET /api/v1/super-admin/users/export
 */

import { useMutation } from '@tanstack/react-query'
import { useLocale, useT } from '@eventflow/i18n/react'
import { toast } from 'sonner'

import { superAdminService } from '@api/services'
import type { ExportAdminUsersParams } from '@api/services'

/** Скачивание blob через синтетическую ссылку. */
function downloadFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  // Отложенный revoke — Safari/Firefox иначе не успевают начать скачивание.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * Ошибку выгрузки бэкенд отдаёт JSON-ом, но responseType: 'blob' превращает
 * её в Blob — читаем текст, чтобы показать сообщение, а не «[object Blob]».
 */
async function readBlobError(error: unknown): Promise<string | null> {
  const payload = (error as { response?: { data?: unknown } })?.response?.data
  if (!(payload instanceof Blob)) return null
  try {
    const parsed: unknown = JSON.parse(await payload.text())
    const message = (parsed as { message?: unknown })?.message
    if (typeof message === 'string') return message
    if (Array.isArray(message)) return message.join(', ')
    return null
  } catch {
    return null
  }
}

export function useExportAdminUsers() {
  const t = useT()
  const locale = useLocale()

  return useMutation({
    mutationFn: async (params: Omit<ExportAdminUsersParams, 'locale'>) => {
      const { blob, filename, total } = await superAdminService.exportUsers({
        ...params,
        locale,
      })
      downloadFile(blob, filename)
      return total
    },
    onSuccess: (total) => {
      toast.success(t('admin.usersExport.toastSuccess', { count: total }))
    },
    onError: (error) => {
      void readBlobError(error).then((message) => {
        toast.error(message ?? t('admin.usersExport.toastError'))
      })
    },
  })
}
