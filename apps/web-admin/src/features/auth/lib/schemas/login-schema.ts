import { z } from 'zod'

/**
 * Тип входа: организация или сотрудник
 */
export const loginTypeSchema = z.enum(['organization', 'member'])
export type LoginTypeValue = z.infer<typeof loginTypeSchema>

/**
 * Схема формы входа
 * ИНН обязателен при входе как сотрудник
 */
export const loginSchema = z
  .object({
    email: z.string().min(1, 'Email обязателен').email('Некорректный формат email'),
    password: z.string().min(6, 'Минимум 6 символов'),
    inn: z.string().optional(),
    rememberMe: z.boolean().default(false),
    loginType: loginTypeSchema.default('organization'),
  })
  .refine(
    data => {
      // ИНН обязателен только для сотрудника
      if (data.loginType === 'member') {
        return data.inn && data.inn.length >= 9
      }
      return true
    },
    {
      message: 'ИНН организации обязателен (минимум 9 цифр)',
      path: ['inn'],
    }
  )

export type LoginFormValues = z.infer<typeof loginSchema>
