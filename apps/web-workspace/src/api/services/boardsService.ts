/**
 * API сервис для управления Kanban досками
 * @see https://eventflow.uz/api/docs#/boards
 */

import { request } from '@api/apiClient'

import type {
  Board,
  BoardColumn,
  BoardMember,
  CreateBoardRequest,
  UpdateBoardRequest,
  GetBoardsParams,
  GetBoardsResponse,
  BoardDetailResponse,
  BoardStatsResponse,
  CreateColumnRequest,
  UpdateColumnRequest,
  ReorderColumnsRequest,
  AddBoardMemberRequest,
  UpdateBoardMemberRoleRequest,
  GetBoardMembersResponse,
} from './board.types'

const BOARDS_URL = '/v1/boards'

// ================================
// Boards CRUD
// ================================

export const boardsService = {
  /** Получить список досок организации */
  getBoards: (params?: GetBoardsParams) =>
    request<GetBoardsResponse>({
      method: 'GET',
      url: BOARDS_URL,
      params,
    }),

  /** Получить доску по ID (с колонками и задачами) */
  getBoard: (boardId: string) =>
    request<BoardDetailResponse>({
      method: 'GET',
      url: `${BOARDS_URL}/${boardId}`,
    }),

  /** Создать доску */
  createBoard: (data: CreateBoardRequest) =>
    request<Board, CreateBoardRequest>({
      method: 'POST',
      url: BOARDS_URL,
      data,
    }),

  /** Обновить доску */
  updateBoard: (boardId: string, data: UpdateBoardRequest) =>
    request<Board, UpdateBoardRequest>({
      method: 'PATCH',
      url: `${BOARDS_URL}/${boardId}`,
      data,
    }),

  /** Удалить доску */
  deleteBoard: (boardId: string) =>
    request<void>({
      method: 'DELETE',
      url: `${BOARDS_URL}/${boardId}`,
    }),

  /** Получить статистику доски */
  getStats: (boardId: string) =>
    request<BoardStatsResponse>({
      method: 'GET',
      url: `${BOARDS_URL}/${boardId}/stats`,
    }),

  /** Переключить статус избранного */
  toggleFavorite: (boardId: string) =>
    request<Board>({
      method: 'POST',
      url: `${BOARDS_URL}/${boardId}/favorite`,
    }),

  /** Архивировать доску */
  archive: (boardId: string) =>
    request<Board>({
      method: 'POST',
      url: `${BOARDS_URL}/${boardId}/archive`,
    }),

  // ================================
  // Columns
  // ================================

  /** Получить колонки доски */
  getColumns: (boardId: string) =>
    request<BoardColumn[]>({
      method: 'GET',
      url: `${BOARDS_URL}/${boardId}/columns`,
    }),

  /** Создать колонку */
  createColumn: (boardId: string, data: CreateColumnRequest) =>
    request<BoardColumn, CreateColumnRequest>({
      method: 'POST',
      url: `${BOARDS_URL}/${boardId}/columns`,
      data,
    }),

  /** Обновить колонку */
  updateColumn: (boardId: string, columnId: string, data: UpdateColumnRequest) =>
    request<BoardColumn, UpdateColumnRequest>({
      method: 'PATCH',
      url: `${BOARDS_URL}/${boardId}/columns/${columnId}`,
      data,
    }),

  /** Удалить колонку */
  deleteColumn: (boardId: string, columnId: string) =>
    request<void>({
      method: 'DELETE',
      url: `${BOARDS_URL}/${boardId}/columns/${columnId}`,
    }),

  /** Изменить порядок колонок */
  reorderColumns: (boardId: string, data: ReorderColumnsRequest) =>
    request<BoardColumn[], ReorderColumnsRequest>({
      method: 'PATCH',
      url: `${BOARDS_URL}/${boardId}/columns/reorder`,
      data,
    }),

  // ================================
  // Board Members
  // ================================

  /** Получить участников доски */
  getMembers: (boardId: string) =>
    request<GetBoardMembersResponse>({
      method: 'GET',
      url: `${BOARDS_URL}/${boardId}/members`,
    }),

  /** Добавить участника в доску */
  addMember: (boardId: string, data: AddBoardMemberRequest) =>
    request<BoardMember, AddBoardMemberRequest>({
      method: 'POST',
      url: `${BOARDS_URL}/${boardId}/members`,
      data,
    }),

  /** Изменить роль участника */
  updateMemberRole: (boardId: string, memberId: string, data: UpdateBoardMemberRoleRequest) =>
    request<BoardMember, UpdateBoardMemberRoleRequest>({
      method: 'PATCH',
      url: `${BOARDS_URL}/${boardId}/members/${memberId}`,
      data,
    }),

  /** Удалить участника из доски */
  removeMember: (boardId: string, memberId: string) =>
    request<void>({
      method: 'DELETE',
      url: `${BOARDS_URL}/${boardId}/members/${memberId}`,
    }),

  /** Покинуть доску */
  leaveBoard: (boardId: string) =>
    request<void>({
      method: 'DELETE',
      url: `${BOARDS_URL}/${boardId}/members/leave`,
    }),
} as const
