import { zodResolver } from '@hookform/resolvers/zod'
import { useT } from '@eventflow/i18n/react'
import { useMemo } from 'react'
import { useForm } from 'react-hook-form'

import { createPasswordSchema, type PasswordFormValues } from './schemas/password-schema'

/**
 * Хук для управления формой смены пароля.
 * Использует react-hook-form + zod валидацию.
 */
export function usePasswordForm() {
  const t = useT()
  const initialValues = useMemo<PasswordFormValues>(
    () => ({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    }),
    []
  )

  return useForm<PasswordFormValues>({
    resolver: zodResolver(createPasswordSchema(t)),
    mode: 'onBlur',
    defaultValues: initialValues,
  })
}
