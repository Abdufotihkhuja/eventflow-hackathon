/**
 * Хук для получения статистики системы
 */

import { useQuery } from '@tanstack/react-query'

import { superAdminService } from '@api/services'
import type { SystemStats } from '@api/services/superAdmin.types'

export const SYSTEM_STATS_QUERY_KEY = ['super-admin', 'system-stats'] as const

export function useSystemStats() {
  return useQuery<SystemStats>({
    queryKey: SYSTEM_STATS_QUERY_KEY,
    queryFn: () => superAdminService.getStats(),
    staleTime: 30 * 1000, // 30 секунд
    refetchInterval: 60 * 1000, // Обновление каждую минуту
  })
}
