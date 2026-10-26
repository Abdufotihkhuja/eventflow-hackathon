/**
 * Схемы валидации для форм управления сотрудниками организации
 */

import { z } from 'zod'
import type { Translator } from '@eventflow/i18n'

/**
 * Схема создания сотрудника (API: POST /api/v1/organizations/members)
 */
export const createCreateMemberSchema = (t: Translator) => z.object({
    email: z
      .string()
      .min(1, t('users.form.validation.emailRequired'))
      .email(t('users.form.validation.invalidEmail'))
      .toLowerCase()
      .trim(),
    firstName: z.string().min(1, t('users.form.validation.firstNameRequired')).trim(),
    lastName: z.string().min(1, t('users.form.validation.lastNameRequired')).trim(),
    phone: z
      .string()
      .regex(/^\+?[0-9\s()-]+$/, t('users.form.validation.invalidPhone'))
      .optional()
      .or(z.literal('')),
    position: z.string().optional().or(z.literal('')),
    department: z.string().optional().or(z.literal('')),
    roleId: z.string().min(1, t('users.form.validation.roleRequired')),
  })

export const createUpdateMemberSchema = (t: Translator) => z.object({
  firstName: z.string().min(1, t('users.form.validation.firstNameRequired')).trim().optional(),
  lastName: z.string().min(1, t('users.form.validation.lastNameRequired')).trim().optional(),
  phone: z
    .string()
    .regex(/^\+?[0-9\s()-]+$/, t('users.form.validation.invalidPhone'))
    .optional()
    .or(z.literal('')),
  position: z.string().optional().or(z.literal('')),
  department: z.string().optional().or(z.literal('')),
  roleId: z.string().optional(),
})

export const createMemberSchema = createCreateMemberSchema((key: string) => key)

/** Invite-only input: direct ACTIVE member creation is not a product flow. */
export type CreateMemberFormInput = z.input<typeof createMemberSchema>
/** Тип для output формы (после парсинга с default значениями) */
export type CreateMemberFormValues = z.output<typeof createMemberSchema>

/**
 * Схема редактирования сотрудника
 */
export const updateMemberSchema = createUpdateMemberSchema((key: string) => key)

export type UpdateMemberFormValues = z.infer<typeof updateMemberSchema>

// Совместимые типовые алиасы
export type CreateUserFormValues = CreateMemberFormValues
export type UpdateUserFormValues = UpdateMemberFormValues
