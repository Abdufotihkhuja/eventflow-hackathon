import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  registrationQuestionsService,
  type CreateQuestionRequest,
  type UpdateQuestionRequest,
} from '@api/services'
import type { ApiError } from '@api/types'

// ================================
// Query Keys
// ================================

export const questionsKeys = {
  all: (eventId: string) => ['events', eventId, 'questions'] as const,
  list: (eventId: string) => [...questionsKeys.all(eventId), 'list'] as const,
  public: (eventId: string) => [...questionsKeys.all(eventId), 'public'] as const,
}

// ================================
// Helpers
// ================================

/** Извлечь сообщение об ошибке из API ответа */
function getErrorMessage(error: ApiError): string {
  // Если message это массив (валидация), объединяем
  const details = error.details as { message?: string | string[] }
  if (details?.message) {
    if (Array.isArray(details.message)) {
      return details.message.join('. ')
    }
    return details.message
  }
  return error.message || 'Произошла ошибка'
}

// ================================
// Queries
// ================================

/**
 * Получить вопросы для организаторов (С правильными ответами)
 * Используется в админ-панели для управления вопросами
 */
export function useQuestionsQuery(eventId: string) {
  return useQuery({
    queryKey: questionsKeys.list(eventId),
    queryFn: () => registrationQuestionsService.getQuestions(eventId),
    enabled: !!eventId,
    staleTime: 60_000,
  })
}

/**
 * Получить публичные вопросы для участников (БЕЗ правильных ответов)
 * Используется в форме регистрации
 */
export function usePublicQuestionsQuery(eventId: string) {
  return useQuery({
    queryKey: questionsKeys.public(eventId),
    queryFn: () => registrationQuestionsService.getPublicQuestions(eventId),
    enabled: !!eventId,
    staleTime: 60_000,
  })
}

// ================================
// Mutations
// ================================

/**
 * Создать вопрос
 */
export function useCreateQuestion(eventId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateQuestionRequest) =>
      registrationQuestionsService.createQuestion(eventId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: questionsKeys.list(eventId) })
      toast.success('Вопрос создан')
    },
    onError: (error: ApiError) => {
      toast.error(getErrorMessage(error))
    },
  })
}

/**
 * Обновить вопрос
 */
export function useUpdateQuestion(eventId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ questionId, data }: { questionId: string; data: UpdateQuestionRequest }) =>
      registrationQuestionsService.updateQuestion(eventId, questionId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: questionsKeys.list(eventId) })
      toast.success('Вопрос обновлён')
    },
    onError: (error: ApiError) => {
      toast.error(getErrorMessage(error))
    },
  })
}

/**
 * Удалить вопрос
 */
export function useDeleteQuestion(eventId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (questionId: string) =>
      registrationQuestionsService.deleteQuestion(eventId, questionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: questionsKeys.list(eventId) })
      toast.success('Вопрос удалён')
    },
    onError: (error: ApiError) => {
      toast.error(getErrorMessage(error))
    },
  })
}

/**
 * Изменить порядок вопросов
 */
export function useReorderQuestions(eventId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { questionIds: string[] }) =>
      registrationQuestionsService.reorderQuestions(eventId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: questionsKeys.list(eventId) })
    },
    onError: (error: ApiError) => {
      toast.error(getErrorMessage(error))
    },
  })
}
