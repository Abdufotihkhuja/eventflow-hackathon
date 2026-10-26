import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { memberProfileSchema, type MemberProfileFormValues } from './schemas/member-profile-schema'

type UseMemberProfileFormOptions = {
  defaultValues?: Partial<MemberProfileFormValues>
}

/**
 * Хук для формы редактирования профиля member
 */
export function useMemberProfileForm(options: UseMemberProfileFormOptions = {}) {
  return useForm<MemberProfileFormValues>({
    resolver: zodResolver(memberProfileSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      position: '',
      department: '',
      ...options.defaultValues,
    },
    mode: 'onBlur',
  })
}
