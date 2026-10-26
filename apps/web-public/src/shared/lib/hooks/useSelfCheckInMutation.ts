/**
 * TanStack Query мутация самостоятельного check-in участника.
 * POST /api/v1/events/:eventId/attendance/self-check-in
 */

import { useEffect, useRef, useState } from "react";

import {
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";

import {
  attendanceService,
  type SelfCheckInResult,
} from "@shared/api/attendanceService";
import { TICKETS_QUERY_KEYS } from "@shared/api/ticketsService";
import { isAuthenticated } from "@shared/lib/apiClient";

export const SELF_CHECK_IN_MUTATION_KEY = [
  "attendance",
  "self-check-in",
] as const;

export const useSelfCheckInMutation = (): UseMutationResult<
  SelfCheckInResult,
  Error,
  string
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: SELF_CHECK_IN_MUTATION_KEY,
    mutationFn: (eventId: string) => attendanceService.selfCheckIn(eventId),
    // Глобальный default mutations.retry=1 повторил бы и детерминированные
    // 400/404/409 — check-in шлём строго один раз.
    retry: false,
    onSuccess: (_data, eventId) => {
      // После отметки статус e-ticket меняется на checked_in — сбрасываем кеш.
      void queryClient.invalidateQueries({
        queryKey: TICKETS_QUERY_KEYS.myEventTicket(eventId),
      });
    },
  });
};

/**
 * Автозапуск self-check-in ровно один раз, когда условия выполнены
 * (валидный eventId из QR + авторизованный пользователь). Побочный эффект
 * инкапсулирован в хуке (не в прикладном компоненте); ref-guard защищает
 * от двойного POST при StrictMode-двойном прогоне эффектов в dev.
 */
export function useSelfCheckInOnMount(
  eventId: string,
  enabled: boolean,
  fire: (eventId: string) => void
): void {
  const hasFired = useRef(false);
  // eslint-disable-next-line no-restricted-syntax -- инкапсулированный side-effect в кастомном хуке
  useEffect(() => {
    if (!enabled || hasFired.current) return;
    hasFired.current = true;
    fire(eventId);
  }, [eventId, enabled, fire]);
}

/**
 * Auth-состояние после гидрации: null на сервере и до маунта, затем реальный
 * isAuthenticated(). isAuthenticated() читает localStorage и на сервере всегда
 * false — прямое использование в разметке даёт hydration mismatch и вспышку
 * sign-in gate у залогиненных; пока null, страница показывает нейтральный
 * спиннер.
 */
export function useAuthReadyState(): boolean | null {
  const [authed, setAuthed] = useState<boolean | null>(null);
  // eslint-disable-next-line no-restricted-syntax -- инкапсулированный side-effect в кастомном хуке
  useEffect(() => {
    setAuthed(isAuthenticated());
  }, []);
  return authed;
}

export type { SelfCheckInResult };
