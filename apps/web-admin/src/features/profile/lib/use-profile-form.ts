import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'

import { profileSchema, type ProfileFormValues } from './schemas/profile-schema'

type UseProfileFormParams = {
  defaultValues?: Partial<ProfileFormValues>
}

/**
 * Хук для управления формой редактирования профиля организации.
 * Использует react-hook-form + zod валидацию.
 */
export function useProfileForm({ defaultValues }: UseProfileFormParams = {}) {
  const initialValues = useMemo<ProfileFormValues>(
    () => ({
      organizationName: '',
      description: '',
      phone: '',
      inn: '',
      industry: '',
      companySize: '',
      ...defaultValues,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    mode: 'onBlur',
    defaultValues: initialValues,
  })

  // Синхронизируем значения формы при изменении defaultValues
  useEffect(() => {
    if (defaultValues) {
      form.reset({
        organizationName: defaultValues.organizationName ?? '',
        description: defaultValues.description ?? '',
        phone: defaultValues.phone ?? '',
        inn: defaultValues.inn ?? '',
        industry: defaultValues.industry ?? '',
        companySize: defaultValues.companySize ?? '',
      })
    }
  }, [defaultValues, form])

  return form
}
