import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo } from 'react'
import { useForm } from 'react-hook-form'

import { loginSchema, type LoginFormValues } from './schemas/login-schema'

type UseLoginFormParams = {
  defaultValues?: Partial<LoginFormValues>
}

export function useLoginForm({ defaultValues }: UseLoginFormParams = {}) {
  const initialValues = useMemo<LoginFormValues>(
    () => ({
      email: '',
      password: '',
      inn: '',
      rememberMe: false,
      loginType: 'organization',
      ...defaultValues,
    }),
    [defaultValues]
  )

  return useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema) as any,
    mode: 'onBlur',
    defaultValues: initialValues,
  })
}
