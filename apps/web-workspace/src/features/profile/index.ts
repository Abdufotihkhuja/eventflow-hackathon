export { useProfileForm, usePasswordForm, useMemberProfileForm } from './lib'
export type { ProfileFormValues, PasswordFormValues, MemberProfileFormValues } from './lib'
export { ProfileForm, PasswordForm, MemberProfileForm, CompanyInfoDialog } from './ui'
export type { ProfileSubmitValues } from './ui'

// API хуки — общие
export {
  useCurrentUser,
  useActorType,
  useIsMember,
  useIsOrganization,
  isOrganizationUser,
  isMemberUser,
  useUpdateProfile,
  useChangePassword,
  useSessionsQuery,
  useTerminateSession,
  useTerminateOtherSessions,
  useUploadLogo,
  useDeleteLogo,
  useCompleteOrgOnboarding,
  useCompleteCompanyInfo,
  useDeleteAccount,
  useSendVerificationCode,
  useVerifyEmail,
  useResendCode,
  VerificationCodeType,
  CURRENT_USER_QUERY_KEY,
  type CurrentUser,
} from './api'

// API хуки — member
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
} from './api'

// Permission helper
export { usePermissions, type UsePermissionsResult } from './api'
