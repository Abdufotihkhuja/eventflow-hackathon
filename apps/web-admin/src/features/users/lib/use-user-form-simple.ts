/**
 * Хуки для управления формами сотрудников организации
 */

import { useForm, type UseFormProps } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import {
  createMemberSchema,
  updateMemberSchema,
  type CreateMemberFormInput,
  type UpdateMemberFormValues,
} from './schemas/user-schema'

/**
 * Хук для формы создания сотрудника
 * Создание всегда проходит через приглашение.
 */
export function useCreateUserForm(options?: UseFormProps<CreateMemberFormInput>) {
  return useForm<CreateMemberFormInput>({
    resolver: zodResolver(createMemberSchema),
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
  return useForm<UpdateMemberFormValues>({
    resolver: zodResolver(updateMemberSchema),
    mode: 'onBlur',
    defaultValues: options?.defaultValues || {},
  })
}
