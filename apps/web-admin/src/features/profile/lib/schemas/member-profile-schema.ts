import { z } from 'zod'

/**
 * Валидация телефона: допускает форматы +998901234567, +998 90 123 45 67, 998901234567
 */
const phoneRegex = /^(\+?\d{1,3}[\s-]?)?(\(?\d{2,3}\)?[\s-]?)?[\d\s-]{6,14}$/

/**
 * Схема валидации формы редактирования профиля member
 */
export const memberProfileSchema = z.object({
  firstName: z
    .string()
    .min(2, 'Имя должно содержать минимум 2 символа')
    .max(50, 'Имя не должно превышать 50 символов'),
  lastName: z
    .string()
    .min(2, 'Фамилия должна содержать минимум 2 символа')
    .max(50, 'Фамилия не должна превышать 50 символов'),
  phone: z
    .string()
    .refine(val => !val || phoneRegex.test(val), 'Некорректный номер телефона')
    .optional()
    .or(z.literal('')),
  position: z
    .string()
    .max(100, 'Должность не должна превышать 100 символов')
    .optional()
    .or(z.literal('')),
  department: z
    .string()
    .max(100, 'Отдел не должен превышать 100 символов')
    .optional()
    .or(z.literal('')),
})

export type MemberProfileFormValues = z.infer<typeof memberProfileSchema>
