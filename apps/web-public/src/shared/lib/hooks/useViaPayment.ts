/**
 * VIA-оплата билета (M-5 поверх M-4 / P-15).
 *
 * Старт: POST .../ticket-order/via → hosted-ссылка платёжной страницы VIA,
 * покупатель уходит на неё редиректом. Возврат: страница
 * /payment/via/return вызывает confirm — бэкенд перепроверяет статус
 * инвойса у VIA серверным запросом (браузерному возврату не доверяем).
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";

import { EVENT_QUERY_KEYS } from "@shared/api/eventService";
import {
  registrationService,
  type ViaPaymentConfirmation,
  type ViaPaymentStart,
} from "@shared/api/registrationService";
import { USER_EVENTS_QUERY_KEYS } from "@shared/api/userEventsService";
import { ApiError } from "@shared/lib/apiClient";

/** 403 VIA_UNAVAILABLE — провайдер выключен для организации события. */
export const isViaUnavailableError = (error: unknown): boolean =>
  error instanceof ApiError &&
  error.status === 403 &&
  error.data.code === "VIA_UNAVAILABLE";

export const useViaPaymentMutation = (): UseMutationResult<
  ViaPaymentStart,
  Error,
  { registrationId: string; locale: string }
> =>
  useMutation({
    mutationKey: ["billing", "via-start"],
    mutationFn: ({ registrationId, locale }) =>
      registrationService.startViaPayment(registrationId, locale),
    // Создание инвойса не ретраим: детерминированные 403/409 повторов не лечат.
    retry: false,
  });

/**
 * Серверная сверка после возврата с платёжной страницы VIA. Query (а не
 * mutation): выполняется на маунте страницы возврата без useEffect
 * (правило web-public), результат кэшируется по registrationId.
 */
export const useViaConfirmQuery = (
  registrationId: string | null
): UseQueryResult<ViaPaymentConfirmation> => {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ["billing", "via-confirm", registrationId],
    enabled: registrationId !== null,
    retry: 1,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const result = await registrationService.confirmViaPayment(
        registrationId as string
      );
      if (result.paid) {
        // Оплата подтверждена → регистрация APPROVED: сбрасываем детали
        // события (myRegistration) и «мои события» (паритет с чекаутом).
        void queryClient.invalidateQueries({
          queryKey: EVENT_QUERY_KEYS.details(),
        });
        void queryClient.invalidateQueries({
          queryKey: USER_EVENTS_QUERY_KEYS.all,
        });
      }
      return result;
    },
  });
};
