/**
 * TanStack Query мутация для входа пользователя
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { authService, type User } from "@shared/api";
import { CURRENT_USER_QUERY_KEY } from "@shared/lib/hooks/useCurrentUserQuery";
import { rotatePublicQueryScope } from "@shared/lib/queryClient";

import type { LoginCredentials } from "@entities/auth";
import type { UseMutationResult } from "@tanstack/react-query";

export interface LoginError {
  message: string;
  code?: string;
}

export type LoginSuccessData =
  | {
      accountType: "user";
      user: User;
    }
  | {
      accountType: "organization";
      email: string;
    };

export const LOGIN_MUTATION_KEY = ["auth", "login", "user"] as const;

/**
 * Хук для входа пользователя
 * После валидного входа определяет тип аккаунта. Организации не остаются в
 * public-приложении: форма показывает понятный переход в workspace.
 *
 * Процесс:
 * 1. Устанавливаем HttpOnly cookie session через /auth/web/login
 * 2. Запрашиваем данные пользователя через /session/me -> профильный surface
 */
export const useLoginMutation = (): UseMutationResult<
  LoginSuccessData,
  LoginError,
  LoginCredentials
> => {
  const queryClient = useQueryClient();

  return useMutation<LoginSuccessData, LoginError, LoginCredentials>({
    mutationKey: LOGIN_MUTATION_KEY,
    mutationFn: async (
      credentials: LoginCredentials
    ): Promise<LoginSuccessData> => {
      await authService.userLogin(credentials);
      const session = await authService.getSessionMe();

      if (session.actorType === "ORGANIZATION") {
        // HttpOnly-сессия public-приложения не переносится между host-only
        // доменами. Убираем её перед handoff, чтобы организация не осталась
        // в полувошедшем состоянии на публичном сайте.
        await authService.logout().catch(() => undefined);
        rotatePublicQueryScope("anonymous");

        return {
          accountType: "organization",
          email: session.currentAccount.email,
        };
      }

      if (session.actorType !== "USER") {
        await authService.logout().catch(() => undefined);
        rotatePublicQueryScope("anonymous");
        throw new Error("Этот тип аккаунта использует отдельный экран входа");
      }

      rotatePublicQueryScope("personal");

      // Cookie is already installed; bootstrap the account surface.
      const user = (await authService.getCurrentUser()) as User;

      return { accountType: "user", user };
    },
    onSuccess: (data: LoginSuccessData) => {
      if (data.accountType === "user") {
        queryClient.setQueryData(CURRENT_USER_QUERY_KEY, data.user);
      }
    },
  });
};
