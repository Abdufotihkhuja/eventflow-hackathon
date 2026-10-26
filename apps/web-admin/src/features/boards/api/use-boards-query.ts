/**
 * Хуки для работы со списком досок
 */

import { useQuery } from '@tanstack/react-query'

import { boardsService } from '@api/services'
import type { GetBoardsParams } from '@api/services'

// ================================
// Query Keys
// ================================

export const boardsKeys = {
  all: ['boards'] as const,
  lists: () => [...boardsKeys.all, 'list'] as const,
  list: (params?: GetBoardsParams) => [...boardsKeys.lists(), params] as const,
  details: () => [...boardsKeys.all, 'detail'] as const,
  detail: (id: string) => [...boardsKeys.details(), id] as const,
  stats: (id: string) => [...boardsKeys.detail(id), 'stats'] as const,
  members: (id: string) => [...boardsKeys.detail(id), 'members'] as const,
  columns: (id: string) => [...boardsKeys.detail(id), 'columns'] as const,
  activities: (id: string) => [...boardsKeys.detail(id), 'activities'] as const,
}

// ================================
// Queries
// ================================

/**
 * Хук для получения списка досок организации
 */
export function useBoardsQuery(params?: GetBoardsParams) {
  return useQuery({
    queryKey: boardsKeys.list(params),
    queryFn: () => boardsService.getBoards(params),
    staleTime: 30_000, // 30 секунд
    refetchOnWindowFocus: true,
  })
}
