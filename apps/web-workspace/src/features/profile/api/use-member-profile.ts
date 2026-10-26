import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { memberService } from '@api/services/memberService'
import type { ApiError } from '@api/types'
import type {
  MemberPermissionsResponse,
  MemberProfile,
  UpdateMemberPrivacyRequest,
  UpdateMemberProfileRequest,
} from '@api/services/member.types'

import { CURRENT_USER_QUERY_KEY } from './use-current-user'

// ================================
// Query Keys
// ================================

export const MEMBER_PROFILE_QUERY_KEY = ['member', 'profile'] as const
export const MEMBER_PERMISSIONS_QUERY_KEY = ['member', 'permissions'] as const

// ================================
// Profile Queries
// ================================

/**
 * Хук для получения профиля member
 */
export function useMemberProfile() {
  return useQuery<MemberProfile>({
    queryKey: MEMBER_PROFILE_QUERY_KEY,
    queryFn: () => memberService.getMe(),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
  })
}

type UseMemberPermissionsOptions = {
  /** Включить запрос (по умолчанию true) */
  enabled?: boolean
}

/**
 * Хук для получения прав доступа member
 * @param options.enabled - запрос выполняется только если true
 */
export function useMemberPermissions(options: UseMemberPermissionsOptions = {}) {
  const { enabled = true } = options

  return useQuery<MemberPermissionsResponse>({
    queryKey: MEMBER_PERMISSIONS_QUERY_KEY,
    queryFn: () => memberService.getPermissions(),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
    enabled,
  })
}

// ================================
// Profile Mutations
// ================================

type UseUpdateMemberProfileOptions = {
  onSuccess?: (data: MemberProfile) => void
  onError?: (error: ApiError) => void
}

/**
 * Хук для обновления профиля member
 */
export function useUpdateMemberProfile(options: UseUpdateMemberProfileOptions = {}) {
  const queryClient = useQueryClient()

  return useMutation<MemberProfile, ApiError, UpdateMemberProfileRequest>({
    mutationFn: payload => memberService.updateProfile(payload),
    onSuccess: data => {
      // Инвалидируем все связанные кеши
      queryClient.invalidateQueries({ queryKey: MEMBER_PROFILE_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY })
      options.onSuccess?.(data)
    },
    onError: options.onError,
  })
}

type UseUpdateMemberPrivacyOptions = {
  onSuccess?: (data: MemberProfile) => void
  onError?: (error: ApiError) => void
}

/**
 * Хук для обновления настроек приватности member
 */
export function useUpdateMemberPrivacy(options: UseUpdateMemberPrivacyOptions = {}) {
  const queryClient = useQueryClient()

  return useMutation<MemberProfile, ApiError, UpdateMemberPrivacyRequest>({
    mutationFn: payload => memberService.updatePrivacy(payload),
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: MEMBER_PROFILE_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY })
      options.onSuccess?.(data)
    },
    onError: options.onError,
  })
}

// ================================
// Avatar Mutations
// ================================

type UseUploadMemberAvatarOptions = {
  onSuccess?: () => void
  onError?: (error: ApiError) => void
}

/**
 * Хук для загрузки аватара member
 */
export function useUploadMemberAvatar(options: UseUploadMemberAvatarOptions = {}) {
  const queryClient = useQueryClient()

  return useMutation<{ avatarUrl: string }, ApiError, File>({
    mutationFn: file => memberService.uploadAvatar(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEMBER_PROFILE_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY })
      options.onSuccess?.()
    },
    onError: options.onError,
  })
}

type UseDeleteMemberAvatarOptions = {
  onSuccess?: () => void
  onError?: (error: ApiError) => void
}

/**
 * Хук для удаления аватара member
 */
export function useDeleteMemberAvatar(options: UseDeleteMemberAvatarOptions = {}) {
  const queryClient = useQueryClient()

  return useMutation<{ message: string }, ApiError, void>({
    mutationFn: () => memberService.deleteAvatar(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEMBER_PROFILE_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY })
      options.onSuccess?.()
    },
    onError: options.onError,
  })
}

// ================================
// Complete Onboarding (member)
// ================================

type UseCompleteMemberOnboardingOptions = {
  onSuccess?: () => void
  onError?: (error: ApiError) => void
}

/**
 * Завершить онбординг участника (POST /workspace/members/me/complete-onboarding).
 */
export function useCompleteMemberOnboarding(options?: UseCompleteMemberOnboardingOptions) {
  const queryClient = useQueryClient()

  return useMutation<void, ApiError, void>({
    mutationFn: () => memberService.completeOnboarding(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEMBER_PROFILE_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY })
      options?.onSuccess?.()
    },
    onError: options?.onError,
  })
}
