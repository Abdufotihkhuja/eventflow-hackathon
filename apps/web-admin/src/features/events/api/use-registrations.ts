import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  eventRegistrationsService,
  userRegistrationsService,
  type GetRegistrationsParams,
} from '@api/services'

import { eventsKeys } from './use-events-query'

// ================================
// Query Keys
// ================================

export const registrationsKeys = {
  all: ['registrations'] as const,
  event: (eventId: string) => [...registrationsKeys.all, 'event', eventId] as const,
  list: (eventId: string, params?: GetRegistrationsParams) =>
    [...registrationsKeys.event(eventId), 'list', params] as const,
  detail: (eventId: string, registrationId: string) =>
    [...registrationsKeys.event(eventId), 'detail', registrationId] as const,
  my: () => [...registrationsKeys.all, 'my'] as const,
}

// ================================
// Queries для организаторов
// ================================

/**
 * Получить регистрации события
 */
export function useEventRegistrationsQuery(eventId: string, params?: GetRegistrationsParams) {
  return useQuery({
    queryKey: registrationsKeys.list(eventId, params),
    queryFn: () => eventRegistrationsService.getRegistrations(eventId, params),
    enabled: !!eventId,
    staleTime: 30_000,
    retry: 2,
  })
}

/**
 * Получить регистрацию по ID
 * @param options.enabled — выполнять запрос (по умолчанию true при переданном registrationId)
 */
export function useRegistrationQuery(
  eventId: string,
  registrationId: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: registrationsKeys.detail(eventId, registrationId),
    queryFn: () => eventRegistrationsService.getRegistration(eventId, registrationId),
    enabled: options?.enabled !== false && !!registrationId,
  })
}

// ================================
// Mutations для организаторов
// ================================

/**
 * Одобрить регистрацию
 */
export function useApproveRegistration(eventId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (registrationId: string) =>
      eventRegistrationsService.approveRegistration(eventId, registrationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: registrationsKeys.event(eventId) })
    },
  })
}

/**
 * Отклонить регистрацию
 */
export function useRejectRegistration(eventId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ registrationId, reason }: { registrationId: string; reason?: string }) =>
      eventRegistrationsService.rejectRegistration(eventId, registrationId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: registrationsKeys.event(eventId) })
    },
  })
}

/**
 * Массовое одобрение регистраций
 */
export function useBulkApproveRegistrations(eventId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (registrationIds: string[]) =>
      eventRegistrationsService.bulkApprove(eventId, registrationIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: registrationsKeys.event(eventId) })
    },
  })
}

/**
 * Массовое отклонение регистраций
 */
export function useBulkRejectRegistrations(eventId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ registrationIds, reason }: { registrationIds: string[]; reason?: string }) =>
      eventRegistrationsService.bulkReject(eventId, registrationIds, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: registrationsKeys.event(eventId) })
    },
  })
}

/**
 * Экспорт регистраций
 */
export function useExportRegistrations(eventId: string) {
  return useMutation({
    mutationFn: (params: { format: 'csv' | 'xlsx'; fields?: string[] }) =>
      eventRegistrationsService.exportRegistrations(eventId, params),
    onSuccess: data => {
      // Открываем ссылку на скачивание
      window.open(data.downloadUrl, '_blank')
    },
  })
}

// ================================
// Queries и Mutations для участников
// ================================

/**
 * Получить мои регистрации
 */
export function useMyRegistrationsQuery() {
  return useQuery({
    queryKey: registrationsKeys.my(),
    queryFn: () => userRegistrationsService.getMyRegistrations(),
    staleTime: 60_000,
  })
}

/** Сообщение при 403 на POST register (только по приглашению) */
export const INVITE_ONLY_REGISTRATION_MESSAGE =
  'Регистрация на это мероприятие доступна только по приглашению. Введите действующий код приглашения.'

/**
 * Зарегистрироваться на событие.
 * Для INVITE_ONLY передавайте inviteCode (из поля ввода или из URL ?inviteCode=).
 */
export function useRegisterForEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      eventId,
      data,
      inviteCode,
    }: {
      eventId: string
      data: {
        firstName: string
        lastName: string
        email: string
        phone?: string
        role?: string
        answers?: { questionId: string; value: string | string[] | number | boolean }[]
      }
      inviteCode?: string
    }) => {
      const requestData = {
        ...data,
        answers: data.answers?.map(a => ({
          questionId: a.questionId,
          answer: Array.isArray(a.value) ? a.value.join(', ') : String(a.value),
        })),
      }
      return userRegistrationsService.register(eventId, requestData, inviteCode)
    },
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: registrationsKeys.my() })
      queryClient.invalidateQueries({ queryKey: eventsKeys.detail(eventId) })
    },
  })
}

/**
 * Отменить свою регистрацию
 */
export function useCancelMyRegistration() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (registrationId: string) =>
      userRegistrationsService.cancelRegistration(registrationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: registrationsKeys.my() })
    },
  })
}

/**
 * Получить QR-код регистрации
 */
export function useRegistrationQrCode(registrationId: string) {
  return useQuery({
    queryKey: ['registrations', registrationId, 'qr'],
    queryFn: () => userRegistrationsService.getQrCode(registrationId),
    enabled: !!registrationId,
    staleTime: Infinity, // QR-код не меняется
  })
}

/**
 * Получить мой сертификат
 */
export function useMyCertificate(registrationId: string) {
  return useQuery({
    queryKey: ['registrations', registrationId, 'certificate'],
    queryFn: () => userRegistrationsService.getMyCertificate(registrationId),
    enabled: !!registrationId,
  })
}
