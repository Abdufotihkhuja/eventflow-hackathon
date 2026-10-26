import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useT } from '@eventflow/i18n/react'

import { createMemberProfileSchema, type MemberProfileFormValues } from './schemas/member-profile-schema'

type UseMemberProfileFormOptions = {
  defaultValues?: Partial<MemberProfileFormValues>
}

/**
 * Хук для формы редактирования профиля member
 */
export function useMemberProfileForm(options: UseMemberProfileFormOptions = {}) {
  const t = useT()

  return useForm<MemberProfileFormValues>({
    resolver: zodResolver(createMemberProfileSchema(t)),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      position: '',
      department: '',
      bio: '',
      location: '',
      ...options.defaultValues,
    },
    mode: 'onBlur',
  })
}
