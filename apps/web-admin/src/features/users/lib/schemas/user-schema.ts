/**
 * Схемы валидации для форм управления сотрудниками организации
 */

import { createTranslator, fallbackLocale, getStoredLocale, messagesByLocale } from '@eventflow/i18n'
import { z } from 'zod'

const locale = getStoredLocale() ?? fallbackLocale
const t = createTranslator(locale, messagesByLocale)

/**
 * Схема создания приглашения (API: POST /api/v1/organizations/invites)
 */
export const createMemberSchema = z.object({
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

/** Invite-only input: Membership создаётся только после acceptance. */
export type CreateMemberFormInput = z.input<typeof createMemberSchema>
/** Тип для output формы (после парсинга с default значениями) */
export type CreateMemberFormValues = z.output<typeof createMemberSchema>

/**
 * Схема редактирования сотрудника
 */
export const updateMemberSchema = z.object({
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

export type UpdateMemberFormValues = z.infer<typeof updateMemberSchema>

// Совместимые типовые алиасы
export type CreateUserFormValues = CreateMemberFormValues
export type UpdateUserFormValues = UpdateMemberFormValues
