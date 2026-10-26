import { useMutation, useQueryClient } from '@tanstack/react-query'

import { authService } from '@api/services/authService'
import type { Organization, UploadLogoResponse } from '@api/services/auth.types'
import type { ApiError } from '@api/types'

import { CURRENT_USER_QUERY_KEY } from './use-current-user'

type UseUploadLogoOptions = {
  onSuccess?: (data: UploadLogoResponse) => void
  onError?: (error: ApiError) => void
}

/**
 * Хук для загрузки логотипа организации
 */
export function useUploadLogo(options?: UseUploadLogoOptions) {
  const queryClient = useQueryClient()

  return useMutation<UploadLogoResponse, ApiError, File>({
    mutationFn: file => authService.uploadOrganizationLogo(file),
    onSuccess: data => {
      queryClient.setQueryData<{ type: 'organization'; data: Organization }>(CURRENT_USER_QUERY_KEY, prev => {
        if (!prev || prev.type !== 'organization') return prev
        return { ...prev, data: { ...prev.data, logoUrl: data.logoUrl } }
      })
      options?.onSuccess?.(data)
    },
    onError: options?.onError,
  })
}

/**
 * Хук для удаления логотипа организации
 */
export function useDeleteLogo(options?: {
  onSuccess?: () => void
  onError?: (error: ApiError) => void
}) {
  const queryClient = useQueryClient()

  return useMutation<{ message: string }, ApiError>({
    mutationFn: () => authService.deleteOrganizationLogo(),
    onSuccess: () => {
      queryClient.setQueryData<{ type: 'organization'; data: Organization }>(CURRENT_USER_QUERY_KEY, prev => {
        if (!prev || prev.type !== 'organization') return prev
        return { ...prev, data: { ...prev.data, logoUrl: null } }
      })
      options?.onSuccess?.()
    },
    onError: options?.onError,
  })
}
