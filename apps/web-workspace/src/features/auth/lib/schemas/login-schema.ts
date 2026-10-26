import { z } from 'zod'
import type { Translator } from '@eventflow/i18n'

/**
 * Схема унифицированной формы входа (без ИНН и выбора типа).
 * Один email + пароль для всех: владельцев организаций, пользователей и сотрудников.
 */
export const createLoginSchema = (t: Translator) =>
  z.object({
    email: z
      .string()
      .min(1, t('security.login.validation.emailRequired'))
      .email(t('security.login.validation.invalidEmail')),
    password: z.string().min(6, t('security.login.validation.passwordMin')),
    rememberMe: z.boolean().default(false),
  })

export const loginSchema = createLoginSchema((key: string) => key)

export type LoginFormValues = z.infer<typeof loginSchema>
