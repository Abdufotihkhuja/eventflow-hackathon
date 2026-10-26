/**
 * Хуки для управления формами сотрудников организации
 */

import { useForm, type UseFormProps } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useT } from '@eventflow/i18n/react'

import {
  createCreateMemberSchema,
  createUpdateMemberSchema,
  type CreateMemberFormInput,
  type UpdateMemberFormValues,
} from './schemas/user-schema'

/**
 * Хук для формы создания сотрудника
 * Создание всегда проходит через приглашение.
 */
export function useCreateUserForm(options?: UseFormProps<CreateMemberFormInput>) {
  const t = useT()
  return useForm<CreateMemberFormInput>({
    resolver: zodResolver(createCreateMemberSchema(t)),
    mode: 'onChange',
    defaultValues: {
      email: '',
      firstName: '',
      lastName: '',
      phone: '',
      position: '',
      department: '',
      roleId: '',
      ...options?.defaultValues,
    },
  })
}

/**
 * Хук для формы редактирования сотрудника
 */
export function useUpdateUserForm(options?: UseFormProps<UpdateMemberFormValues>) {
  const t = useT()
  return useForm<UpdateMemberFormValues>({
    resolver: zodResolver(createUpdateMemberSchema(t)),
    mode: 'onBlur',
    defaultValues: options?.defaultValues || {},
  })
}
