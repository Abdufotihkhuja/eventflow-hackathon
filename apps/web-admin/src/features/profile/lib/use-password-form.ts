import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo } from 'react'
import { useForm } from 'react-hook-form'

import { passwordSchema, type PasswordFormValues } from './schemas/password-schema'

/**
 * Хук для управления формой смены пароля.
 * Использует react-hook-form + zod валидацию.
 */
export function usePasswordForm() {
  const initialValues = useMemo<PasswordFormValues>(
    () => ({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    }),
    []
  )

  return useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    mode: 'onBlur',
    defaultValues: initialValues,
  })
}
