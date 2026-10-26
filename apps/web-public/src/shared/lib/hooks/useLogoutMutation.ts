"use client";

/**
 * TanStack Query мутация для выхода из системы
 * POST /api/v1/auth/logout
 */

import { useRouter } from "next/navigation";

import { useMutation, type UseMutationResult } from "@tanstack/react-query";

import { useLocale } from "@eventflow/i18n/react";
import { authService } from "@shared/api";
import { clearAuthSession } from "@shared/lib/apiClient";
import { withLocalePath } from "@shared/lib/i18n-routing";

export const LOGOUT_MUTATION_KEY = ["auth", "logout"] as const;

interface UseLogoutMutationOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  redirectTo?: string;
}

/**
 * Хук для выхода из системы
 * Очищает токен, инвалидирует кеш и редиректит на указанную страницу
 */
export const useLogoutMutation = (
  options?: UseLogoutMutationOptions
): UseMutationResult<void, Error, void> => {
  const locale = useLocale();
  const router = useRouter();

  return useMutation({
    mutationKey: LOGOUT_MUTATION_KEY,
    mutationFn: async () => {
      // Пробуем выйти через API, но не блокируем если упадёт
      try {
        await authService.logout();
      } catch {
        // Игнорируем ошибку — всё равно очищаем локальные данные
      }
    },
    onSuccess: () => {
      // Полностью очищаем сессию и кэш, чтобы не осталось stale-данных пользователя
      clearAuthSession();

      // Коллбек
      options?.onSuccess?.();

      // Редирект
      if (options?.redirectTo) {
        router.push(withLocalePath(options.redirectTo, locale));
      } else {
        router.push(withLocalePath("/", locale));
      }
    },
    onError: (error: Error) => {
      options?.onError?.(error);
    },
  });
};
