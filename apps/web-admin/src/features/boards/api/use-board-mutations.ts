/**
 * Мутации для работы с досками
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { boardsService } from '@api/services'
import type {
  CreateBoardRequest,
  UpdateBoardRequest,
  CreateColumnRequest,
  UpdateColumnRequest,
  ReorderColumnsRequest,
  AddBoardMemberRequest,
  UpdateBoardMemberRoleRequest,
} from '@api/services'

import { boardsKeys } from './use-boards-query'

// ================================
// Board Mutations
// ================================

/**
 * Хук для создания доски
 */
export function useCreateBoard() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateBoardRequest) => boardsService.createBoard(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boardsKeys.lists() })
    },
  })
}

/**
 * Хук для обновления доски
 */
export function useUpdateBoard() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ boardId, data }: { boardId: string; data: UpdateBoardRequest }) =>
      boardsService.updateBoard(boardId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: boardsKeys.detail(variables.boardId) })
      queryClient.invalidateQueries({ queryKey: boardsKeys.lists() })
    },
  })
}

/**
 * Хук для удаления доски
 */
export function useDeleteBoard() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (boardId: string) => boardsService.deleteBoard(boardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boardsKeys.lists() })
    },
  })
}

/**
 * Хук для переключения избранного статуса доски
 */
export function useToggleBoardFavorite() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (boardId: string) => boardsService.toggleFavorite(boardId),
    onSuccess: (_, boardId) => {
      queryClient.invalidateQueries({ queryKey: boardsKeys.detail(boardId) })
      queryClient.invalidateQueries({ queryKey: boardsKeys.lists() })
    },
  })
}

/**
 * Хук для архивирования доски
 */
export function useArchiveBoard() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (boardId: string) => boardsService.archive(boardId),
    onSuccess: (_, boardId) => {
      queryClient.invalidateQueries({ queryKey: boardsKeys.detail(boardId) })
      queryClient.invalidateQueries({ queryKey: boardsKeys.lists() })
    },
  })
}

// ================================
// Column Mutations
// ================================

/**
 * Хук для создания колонки
 */
export function useCreateColumn() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ boardId, data }: { boardId: string; data: CreateColumnRequest }) =>
      boardsService.createColumn(boardId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: boardsKeys.detail(variables.boardId) })
      queryClient.invalidateQueries({ queryKey: boardsKeys.columns(variables.boardId) })
    },
  })
}

/**
 * Хук для обновления колонки
 */
export function useUpdateColumn() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      boardId,
      columnId,
      data,
    }: {
      boardId: string
      columnId: string
      data: UpdateColumnRequest
    }) => boardsService.updateColumn(boardId, columnId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: boardsKeys.detail(variables.boardId) })
    },
  })
}

/**
 * Хук для удаления колонки
 */
export function useDeleteColumn() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ boardId, columnId }: { boardId: string; columnId: string }) =>
      boardsService.deleteColumn(boardId, columnId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: boardsKeys.detail(variables.boardId) })
    },
  })
}

/**
 * Хук для изменения порядка колонок
 */
export function useReorderColumns() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ boardId, data }: { boardId: string; data: ReorderColumnsRequest }) =>
      boardsService.reorderColumns(boardId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: boardsKeys.detail(variables.boardId) })
    },
  })
}

// ================================
// Board Member Mutations
// ================================

/**
 * Хук для добавления участника в доску
 */
export function useAddBoardMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ boardId, data }: { boardId: string; data: AddBoardMemberRequest }) =>
      boardsService.addMember(boardId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: boardsKeys.members(variables.boardId) })
      queryClient.invalidateQueries({ queryKey: boardsKeys.detail(variables.boardId) })
    },
  })
}

/**
 * Хук для изменения роли участника
 */
export function useUpdateBoardMemberRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      boardId,
      memberId,
      data,
    }: {
      boardId: string
      memberId: string
      data: UpdateBoardMemberRoleRequest
    }) => boardsService.updateMemberRole(boardId, memberId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: boardsKeys.members(variables.boardId) })
    },
  })
}

/**
 * Хук для удаления участника из доски
 */
export function useRemoveBoardMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ boardId, memberId }: { boardId: string; memberId: string }) =>
      boardsService.removeMember(boardId, memberId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: boardsKeys.members(variables.boardId) })
      queryClient.invalidateQueries({ queryKey: boardsKeys.detail(variables.boardId) })
    },
  })
}

/**
 * Хук для покидания доски
 */
export function useLeaveBoard() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (boardId: string) => boardsService.leaveBoard(boardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boardsKeys.lists() })
    },
  })
}
