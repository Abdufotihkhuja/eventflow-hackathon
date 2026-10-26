import { z } from 'zod'
import type { Translator } from '@eventflow/i18n'

/**
 * Валидация телефона: допускает форматы +998901234567, +998 90 123 45 67, 998901234567
 */
const phoneRegex = /^(\+?\d{1,3}[\s-]?)?(\(?\d{2,3}\)?[\s-]?)?[\d\s-]{6,14}$/

/**
 * Валидация ИНН: от 9 до 20 цифр
 */
const innRegex = /^\d{9,20}$/

/**
 * Мягкая валидация сайта: домен с опциональным протоколом
 */
const websiteRegex = /^(https?:\/\/)?[\w-]+(\.[\w-]+)+([/?#].*)?$/i

/**
 * Схема валидации формы редактирования профиля организации
 */
const fallbackT: Translator = key => key

export const createProfileSchema = (t: Translator) => z.object({
  organizationName: z
    .string()
    .min(2, t('profile.validation.organizationNameMin'))
    .max(100, t('profile.validation.organizationNameMax')),
  description: z
    .string()
    .max(500, t('profile.validation.descriptionMax'))
    .optional()
    .or(z.literal('')),
  phone: z
    .string()
    .refine(val => !val || phoneRegex.test(val), t('profile.validation.invalidPhone'))
    .optional()
    .or(z.literal('')),
  inn: z
    .string()
    .refine(val => !val || innRegex.test(val), t('profile.validation.innDigits'))
    .optional()
    .or(z.literal('')),
  industry: z.string().max(100, t('profile.validation.max100')).optional().or(z.literal('')),
  companySize: z.string().regex(/^\d*$/, t('profile.validation.digitsOnly')).optional().or(z.literal('')),
  address: z.string().max(500, t('profile.validation.max500')).optional().or(z.literal('')),
  website: z
    .string()
    .refine(val => !val || websiteRegex.test(val), t('profile.validation.invalidWebsite'))
    .optional()
    .or(z.literal('')),
})

export const profileSchema = createProfileSchema(fallbackT)

export type ProfileFormValues = z.infer<typeof profileSchema>
