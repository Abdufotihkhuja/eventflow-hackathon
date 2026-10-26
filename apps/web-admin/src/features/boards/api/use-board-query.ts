/**
 * Хук для получения доски по ID
 */

import { useQuery } from '@tanstack/react-query'

import { boardsService } from '@api/services'

import { boardsKeys } from './use-boards-query'

/**
 * Хук для получения доски по ID (с колонками и задачами)
 */
export function useBoardQuery(boardId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: boardsKeys.detail(boardId!),
    queryFn: () => boardsService.getBoard(boardId!),
    enabled: !!boardId && enabled,
    staleTime: 60_000, // 1 минута
  })
}

/**
 * Хук для получения статистики доски
 */
export function useBoardStatsQuery(boardId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: boardsKeys.stats(boardId!),
    queryFn: () => boardsService.getStats(boardId!),
    enabled: !!boardId && enabled,
    staleTime: 30_000, // 30 секунд
  })
}

/**
 * Хук для получения участников доски
 */
export function useBoardMembersQuery(boardId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: boardsKeys.members(boardId!),
    queryFn: () => boardsService.getMembers(boardId!),
    enabled: !!boardId && enabled,
    staleTime: 60_000, // 1 минута
  })
}
