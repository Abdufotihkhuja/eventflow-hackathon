/**
 * Хуки для работы с кодами верификации (Super Admin)
 * Endpoint: GET /api/v1/super-admin/verification-codes
 */

import { useQuery } from '@tanstack/react-query'

import { superAdminService } from '@api/services'
import type {
  GetVerificationCodesParams,
  GetVerificationCodesResponse,
} from '@api/services/superAdmin.types'

export const VERIFICATION_CODES_QUERY_KEY = ['super-admin', 'verification-codes'] as const

// ================================
// Query: список кодов верификации
// ================================

export function useVerificationCodes(params?: GetVerificationCodesParams) {
  return useQuery<GetVerificationCodesResponse>({
    queryKey: [...VERIFICATION_CODES_QUERY_KEY, params],
    queryFn: () => superAdminService.getVerificationCodes(params),
  })
}
