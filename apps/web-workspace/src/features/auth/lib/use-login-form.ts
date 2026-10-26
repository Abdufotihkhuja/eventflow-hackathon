import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { useT } from '@eventflow/i18n/react'

import { createLoginSchema, type LoginFormValues } from './schemas/login-schema'

type UseLoginFormParams = {
  defaultValues?: Partial<LoginFormValues>
}

export function useLoginForm({ defaultValues }: UseLoginFormParams = {}) {
  const t = useT()
  const initialValues = useMemo<LoginFormValues>(
    () => ({
      email: '',
      password: '',
      rememberMe: false,
      ...defaultValues,
    }),
    [defaultValues]
  )

  return useForm<LoginFormValues>({
    resolver: zodResolver(createLoginSchema(t)) as never,
    mode: 'onBlur',
    defaultValues: initialValues,
  })
}
