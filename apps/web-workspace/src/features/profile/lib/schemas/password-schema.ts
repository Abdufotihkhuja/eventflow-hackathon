import { z } from 'zod'
import type { Translator } from '@eventflow/i18n'

/**
 * Схема валидации формы смены пароля
 */
const fallbackT: Translator = key => key

export const createPasswordSchema = (t: Translator) => z
  .object({
    currentPassword: z.string().min(1, t('security.password.validation.currentRequired')),
    newPassword: z
      .string()
      .min(8, t('security.password.validation.newMin'))
      .regex(/[A-Z]/, t('security.password.validation.uppercase'))
      .regex(/[a-z]/, t('security.password.validation.lowercase'))
      .regex(/[0-9]/, t('security.password.validation.digit')),
    confirmPassword: z.string().min(1, t('security.password.validation.confirmRequired')),
  })
  .refine(data => data.newPassword === data.confirmPassword, {
    message: t('security.password.validation.mismatch'),
    path: ['confirmPassword'],
  })
  .refine(data => data.currentPassword !== data.newPassword, {
    message: t('security.password.validation.sameAsCurrent'),
    path: ['newPassword'],
  })

export const passwordSchema = createPasswordSchema(fallbackT)

export type PasswordFormValues = z.infer<typeof passwordSchema>
