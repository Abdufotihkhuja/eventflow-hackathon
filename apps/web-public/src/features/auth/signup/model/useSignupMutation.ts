import { useMutation, type UseMutationResult } from "@tanstack/react-query";

import { authService, type User } from "@shared/api";
import { rotatePublicQueryScope } from "@shared/lib/queryClient";

import type { SignupFormData } from "./schema";

export interface SignupSuccessData {
  user?: User;
  message?: string;
  accountType: "user" | "organizer";
  emailVerificationRequired?: boolean;
}

export const SIGNUP_MUTATION_KEY = ["auth", "signup"] as const;

/**
 * Хук для регистрации пользователя или организатора
 * Автоматически определяет endpoint по accountType
 *
 * Процесс для пользователя:
 * 1. Регистрируем и устанавливаем HttpOnly cookie session
 * 2. Запрашиваем данные через /session/me -> профильный surface
 *
 * Процесс для организатора:
 * 1. Регистрируем и получаем сообщение об успехе
 * 2. Редирект на страницу с информацией о входе через app.eventflow.uz
 */
export const useSignupMutation = (): UseMutationResult<
  SignupSuccessData,
  Error,
  SignupFormData
> => {
  return useMutation({
    mutationKey: SIGNUP_MUTATION_KEY,
    mutationFn: async (data: SignupFormData): Promise<SignupSuccessData> => {
      if (data.accountType === "user") {
        // Registration installs the cookie session without exposing tokens.
        const registration = await authService.userRegister({
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          password: data.password,
          passwordConfirm: data.passwordConfirm,
        });

        rotatePublicQueryScope("personal");

        // Получаем данные пользователя
        const user = await authService.getCurrentUser();

        return {
          user: user as User,
          accountType: "user",
          emailVerificationRequired: registration.emailVerificationRequired,
        };
      }

      const response = await authService.organizerRegister({
        organizationName: data.organizationName,
        email: data.email,
        password: data.password,
        passwordConfirm: data.passwordConfirm,
        description: data.description,
      });

      return {
        message: response.message,
        accountType: "organizer",
        emailVerificationRequired: response.emailVerificationRequired,
      };
    },
  });
};
