import { workspaceSdk } from '@api/sdk'

import type {
  DeleteMemberAvatarResponse,
  MemberPermissionsResponse,
  MemberProfile,
  UpdateMemberPrivacyRequest,
  UpdateMemberProfileRequest,
  UploadMemberAvatarResponse,
} from './member.types'

export const memberService = {
  // ================================
  // Профиль member
  // ================================

  /** Получить профиль текущего member */
  getMe: () => workspaceSdk.members.getMe() as Promise<MemberProfile>,

  /** Обновить профиль member */
  updateProfile: (payload: UpdateMemberProfileRequest) =>
    workspaceSdk.members.updateProfile(payload) as Promise<MemberProfile>,

  /** Обновить настройки приватности member */
  updatePrivacy: (payload: UpdateMemberPrivacyRequest) =>
    workspaceSdk.members.updatePrivacy(payload) as Promise<MemberProfile>,

  // ================================
  // Аватар
  // ================================

  /** Загрузить аватар member */
  uploadAvatar: (file: File) =>
    workspaceSdk.members.uploadAvatar(file) as Promise<UploadMemberAvatarResponse>,

  /** Удалить аватар member */
  deleteAvatar: () => workspaceSdk.members.deleteAvatar() as Promise<DeleteMemberAvatarResponse>,

  // ================================
  // Права доступа
  // ================================

  /** Получить права доступа member */
  getPermissions: () => workspaceSdk.members.getPermissions() as Promise<MemberPermissionsResponse>,

  /** Завершить онбординг участника */
  completeOnboarding: () => workspaceSdk.members.completeOnboarding() as Promise<void>,
} as const
