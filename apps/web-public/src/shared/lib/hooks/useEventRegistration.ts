/**
 * TanStack Query мутации для регистрации на мероприятия
 * POST /api/v1/events/{eventId}/register
 * PATCH /api/v1/registrations/{id}/cancel
 * PATCH /api/v1/registrations/{id}
 */

import {
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";

import { CALENDAR_QUERY_KEYS } from "@shared/api/calendarService";
import { EVENT_QUERY_KEYS } from "@shared/api/eventService";
import {
  registrationService,
  REGISTRATION_QUERY_KEYS,
  type CreateRegistrationDto,
  type RegistrationResponse,
  type CancelRegistrationResponse,
} from "@shared/api/registrationService";
import { USER_EVENTS_QUERY_KEYS } from "@shared/api/userEventsService";

// ============================================================================
// Mutation Keys
// ============================================================================

export const EVENT_REGISTRATION_MUTATION_KEYS = {
  register: ["event-registration", "register"] as const,
  cancel: ["event-registration", "cancel"] as const,
} as const;

// ============================================================================
// Register for Event Mutation
// ============================================================================

interface RegisterForEventParams {
  eventId: string;
  data?: CreateRegistrationDto;
  /** Для событий INVITE_ONLY */
  inviteCode?: string;
}

interface UseRegisterForEventOptions {
  onSuccess?: (data: RegistrationResponse) => void;
  onError?: (error: Error) => void;
}

/**
 * Мутация для регистрации на мероприятие
 * Автоматически инвалидирует связанные запросы после успеха
 */
export const useRegisterForEventMutation = (
  options?: UseRegisterForEventOptions
): UseMutationResult<RegistrationResponse, Error, RegisterForEventParams> => {
  const queryClient = useQueryClient();

  return useMutation<RegistrationResponse, Error, RegisterForEventParams>({
    mutationKey: EVENT_REGISTRATION_MUTATION_KEYS.register,
    mutationFn: ({ eventId, data, inviteCode }) =>
      registrationService.register(eventId, data, { inviteCode }),
    onSuccess: (data, variables) => {
      // Инвалидируем список моих регистраций
      void queryClient.invalidateQueries({
        queryKey: [...REGISTRATION_QUERY_KEYS.all, "my"],
      });

      // Инвалидируем проверку возможности регистрации для этого события
      void queryClient.invalidateQueries({
        queryKey: EVENT_QUERY_KEYS.canRegister(variables.eventId),
      });

      // Инвалидируем детали события (чтобы myRegistration обновился на странице события)
      void queryClient.invalidateQueries({
        queryKey: EVENT_QUERY_KEYS.details(),
      });

      // Инвалидируем события пользователя (для /profile/events)
      void queryClient.invalidateQueries({
        queryKey: USER_EVENTS_QUERY_KEYS.all,
      });

      // Инвалидируем календарь пользователя (для /profile/calendar)
      void queryClient.invalidateQueries({
        queryKey: CALENDAR_QUERY_KEYS.all,
      });

      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
};

// ============================================================================
// Cancel Registration Mutation
// ============================================================================

interface CancelRegistrationParams {
  registrationId: string;
  eventId: string; // для инвалидации can-register
}

interface UseCancelRegistrationOptions {
  onSuccess?: (data: CancelRegistrationResponse) => void;
  onError?: (error: Error) => void;
}

/**
 * Мутация для отмены регистрации
 * Автоматически инвалидирует связанные запросы после успеха
 */
export const useCancelRegistrationMutation = (
  options?: UseCancelRegistrationOptions
): UseMutationResult<
  CancelRegistrationResponse,
  Error,
  CancelRegistrationParams
> => {
  const queryClient = useQueryClient();

  return useMutation<
    CancelRegistrationResponse,
    Error,
    CancelRegistrationParams
  >({
    mutationKey: EVENT_REGISTRATION_MUTATION_KEYS.cancel,
    mutationFn: ({ registrationId }) =>
      registrationService.cancelRegistration(registrationId),
    onSuccess: (data, variables) => {
      // Инвалидируем список моих регистраций
      void queryClient.invalidateQueries({
        queryKey: [...REGISTRATION_QUERY_KEYS.all, "my"],
      });

      // Инвалидируем проверку возможности регистрации для этого события
      void queryClient.invalidateQueries({
        queryKey: EVENT_QUERY_KEYS.canRegister(variables.eventId),
      });

      // Инвалидируем QR-код отменённой регистрации
      void queryClient.invalidateQueries({
        queryKey: REGISTRATION_QUERY_KEYS.qr(variables.registrationId),
      });

      // Инвалидируем события пользователя (для /profile/events)
      void queryClient.invalidateQueries({
        queryKey: USER_EVENTS_QUERY_KEYS.all,
      });

      // Инвалидируем календарь пользователя (для /profile/calendar)
      void queryClient.invalidateQueries({
        queryKey: CALENDAR_QUERY_KEYS.all,
      });

      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
};

export type {
  CreateRegistrationDto,
  RegistrationResponse,
  CancelRegistrationResponse,
  RegistrationStatus,
  RegistrationRole,
} from "@shared/api/registrationService";
