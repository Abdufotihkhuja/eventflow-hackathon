import { z } from 'zod'

/**
 * Валидация телефона: допускает форматы +998901234567, +998 90 123 45 67, 998901234567
 */
const phoneRegex = /^(\+?\d{1,3}[\s-]?)?(\(?\d{2,3}\)?[\s-]?)?[\d\s-]{6,14}$/

/**
 * Валидация ИНН: от 9 до 20 цифр
 */
const innRegex = /^\d{9,20}$/

/**
 * Схема валидации формы редактирования профиля организации
 */
export const profileSchema = z.object({
  organizationName: z
    .string()
    .min(2, 'Название должно содержать минимум 2 символа')
    .max(100, 'Название не должно превышать 100 символов'),
  description: z
    .string()
    .max(500, 'Описание не должно превышать 500 символов')
    .optional()
    .or(z.literal('')),
  phone: z
    .string()
    .refine(val => !val || phoneRegex.test(val), 'Некорректный номер телефона')
    .optional()
    .or(z.literal('')),
  inn: z
    .string()
    .refine(val => !val || innRegex.test(val), 'ИНН должен содержать от 9 до 20 цифр')
    .optional()
    .or(z.literal('')),
  industry: z.string().max(100, 'Не более 100 символов').optional().or(z.literal('')),
  companySize: z.string().regex(/^\d*$/, 'Только цифры').optional().or(z.literal('')),
})

export type ProfileFormValues = z.infer<typeof profileSchema>
