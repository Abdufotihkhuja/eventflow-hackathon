export {
  useCurrentUser,
  useSessionActorType,
  useActorType,
  useIsMember,
  useIsOrganization,
  isOrganizationUser,
  isMemberUser,
  SESSION_ACTOR_TYPE_QUERY_KEY,
  CURRENT_USER_QUERY_KEY,
  type CurrentUser,
} from './use-current-user'
export { useUpdateProfile } from './use-update-profile'
export { useChangePassword } from './use-change-password'
export {
  useSessionsQuery,
  useTerminateSession,
  useTerminateOtherSessions,
  SESSIONS_QUERY_KEY,
} from './use-sessions'
export { useUploadLogo, useDeleteLogo } from './use-upload-avatar'
export { useDeleteAccount } from './use-delete-account'
export { useCompleteOrgOnboarding } from './use-complete-onboarding'
export { useCompleteCompanyInfo } from './use-complete-company-info'
export {
  useSendVerificationCode,
  useVerifyEmail,
  useResendCode,
  VerificationCodeType,
} from './use-email-verification'

export { usePermissions, type UsePermissionsResult } from './use-permissions'

// Member-specific hooks
export {
  useMemberProfile,
  useUpdateMemberProfile,
  useUpdateMemberPrivacy,
  useMemberPermissions,
  useUploadMemberAvatar,
  useDeleteMemberAvatar,
  useCompleteMemberOnboarding,
  MEMBER_PROFILE_QUERY_KEY,
  MEMBER_PERMISSIONS_QUERY_KEY,
} from './use-member-profile'
