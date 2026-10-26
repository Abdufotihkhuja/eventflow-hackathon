import { z } from "zod";

import type { Translator } from "@eventflow/i18n";

/**
 * Схема валидации формы восстановления пароля
 */
export const createForgotPasswordSchema = (t: Translator) =>
  z.object({
    email: z
      .string()
      .min(1, t("public.auth.validation.emailRequired"))
      .email(t("public.auth.validation.invalidEmail")),
  });

export const forgotPasswordSchema = createForgotPasswordSchema((key) => key);

/**
 * Тип данных формы восстановления пароля
 */
export type ForgotPasswordFormData = z.infer<
  ReturnType<typeof createForgotPasswordSchema>
>;
