import { z } from 'zod'
import type { Translator } from '@eventflow/i18n'

/**
 * Валидация телефона: допускает форматы +998901234567, +998 90 123 45 67, 998901234567
 */
const phoneRegex = /^(\+?\d{1,3}[\s-]?)?(\(?\d{2,3}\)?[\s-]?)?[\d\s-]{6,14}$/

/**
 * Схема валидации формы редактирования профиля member
 */
const fallbackT: Translator = key => key

export const createMemberProfileSchema = (t: Translator) => z.object({
  firstName: z
    .string()
    .min(2, t('profile.validation.firstNameMin'))
    .max(50, t('profile.validation.firstNameMax')),
  lastName: z
    .string()
    .min(2, t('profile.validation.lastNameMin'))
    .max(50, t('profile.validation.lastNameMax')),
  phone: z
    .string()
    .refine(val => !val || phoneRegex.test(val), t('profile.validation.invalidPhone'))
    .optional()
    .or(z.literal('')),
  position: z
    .string()
    .max(100, t('profile.validation.positionMax'))
    .optional()
    .or(z.literal('')),
  department: z
    .string()
    .max(100, t('profile.validation.departmentMax'))
    .optional()
    .or(z.literal('')),
  bio: z
    .string()
    .max(2000, t('profile.validation.bioMax'))
    .optional()
    .or(z.literal('')),
  location: z
    .string()
    .max(255, t('profile.validation.locationMax'))
    .optional()
    .or(z.literal('')),
})

export const memberProfileSchema = createMemberProfileSchema(fallbackT)

export type MemberProfileFormValues = z.infer<typeof memberProfileSchema>
