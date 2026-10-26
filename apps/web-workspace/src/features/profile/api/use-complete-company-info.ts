import { useMutation, useQueryClient } from '@tanstack/react-query'

import { authService } from '@api/services/authService'
import type { Organization } from '@api/services/auth.types'
import type { ApiError } from '@api/types'

import { CURRENT_USER_QUERY_KEY } from './use-current-user'

/**
 * Хук для завершения блока Company Information.
 * POST /api/v1/workspace/me/complete-company-info
 * После вызова popup «Заполните доп. поля» больше не показывается.
 */
export function useCompleteCompanyInfo() {
  const queryClient = useQueryClient()

  return useMutation<Organization, ApiError, void>({
    mutationFn: () => authService.completeCompanyInfo(),
    onSuccess: data => {
      queryClient.setQueryData(CURRENT_USER_QUERY_KEY, {
        type: 'organization',
        data,
      })
    },
  })
}
