/**
 * Хуки для сборок мобильного приложения (Super Admin)
 * Endpoints: GET/POST/DELETE /api/v1/super-admin/app-builds
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useT } from '@eventflow/i18n/react'
import { toast } from 'sonner'

import { appBuildsService } from '@api/services'
import type { AppBuild, UploadAppBuildRequest } from '@api/services'

export const APP_BUILDS_QUERY_KEY = ['super-admin', 'app-builds'] as const

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

export function useAppBuilds() {
  return useQuery<AppBuild[]>({
    queryKey: [...APP_BUILDS_QUERY_KEY],
    queryFn: () => appBuildsService.getBuilds(),
    staleTime: 30 * 1000,
  })
}

export function useUploadAppBuild() {
  const t = useT()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UploadAppBuildRequest) => appBuildsService.uploadBuild(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...APP_BUILDS_QUERY_KEY] })
      toast.success(t('admin.toasts.appBuildUploaded'))
    },
    onError: () => {
      toast.error(t('admin.toasts.appBuildUploadError'))
    },
  })
}

export function useDownloadAppBuild() {
  const t = useT()

  return useMutation({
    mutationFn: async (build: AppBuild) => {
      const blob = await appBuildsService.downloadBuild(build.id)
      downloadFile(blob, build.originalName)
    },
    onError: () => {
      toast.error(t('admin.toasts.appBuildDownloadError'))
    },
  })
}

export function useDeleteAppBuild() {
  const t = useT()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => appBuildsService.deleteBuild(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...APP_BUILDS_QUERY_KEY] })
      toast.success(t('admin.toasts.appBuildDeleted'))
    },
    onError: () => {
      toast.error(t('admin.toasts.appBuildDeleteError'))
    },
  })
}
