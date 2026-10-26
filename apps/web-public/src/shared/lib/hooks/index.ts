export { useActiveSection } from "./useActiveSection";
export { useScrollPosition } from "./useScrollPosition";
export type { UseScrollPositionReturn } from "./useScrollPosition";
export { useScrollProgress } from "./useScrollProgress";
export type { UseScrollProgressReturn } from "./useScrollProgress";
export {
  useBlogPostsQuery,
  useBlogPostQuery,
  useFeaturedPostsQuery,
  useTrendingPostsQuery,
  useBlogCategoriesQuery,
  useRelatedPostsQuery,
  BLOG_QUERY_KEYS,
} from "./useBlogQuery";

// Blog Interactions (лайки, сохранения)
export {
  useCheckLikeQuery,
  useToggleLikeMutation,
  useSavedBlogPostsQuery,
  useCheckSavedQuery,
  useToggleSaveMutation,
  useBlogPostInteractions,
  getBlogInteractionErrorMessage,
} from "./useBlogInteractions";
export type { UseBlogPostInteractionsOptions } from "./useBlogInteractions";
export { useAutoSlider } from "./useAutoSlider";
export { useSyncedState } from "./useSyncedState";
export { useBodyScrollLock } from "./useBodyScrollLock";
export { useEscapeKey } from "./useEscapeKey";
export { useVerifyCertificateOnCode } from "./useVerifyCertificateOnCode";

// User management hooks
export { useHasAuthSession } from "./useHasAuthSession";
export {
  useCurrentUserQuery,
  CURRENT_USER_QUERY_KEY,
} from "./useCurrentUserQuery";
export {
  useUpdateUserMutation,
  UPDATE_USER_MUTATION_KEY,
} from "./useUpdateUserMutation";
export {
  useDeleteUserMutation,
  DELETE_USER_MUTATION_KEY,
} from "./useDeleteUserMutation";
export { useLogoutMutation, LOGOUT_MUTATION_KEY } from "./useLogoutMutation";
export {
  useChangePasswordMutation,
  CHANGE_PASSWORD_MUTATION_KEY,
} from "./useChangePasswordMutation";
export {
  useUploadAvatarMutation,
  useDeleteAvatarMutation,
  UPLOAD_AVATAR_MUTATION_KEY,
  DELETE_AVATAR_MUTATION_KEY,
} from "./useUploadAvatarMutation";
export {
  useSessionsQuery,
  useTerminateSessionMutation,
  useTerminateAllSessionsMutation,
  SESSIONS_QUERY_KEY,
} from "./useSessionsQuery";

// Registration hooks
export {
  useRegistrationQrQuery,
  type Registration,
  type RegistrationQrResponse,
} from "./useRegistrationsQuery";

// Premium e-ticket view-model
export {
  useMyEventTicketQuery,
  type EventTicketViewModel,
} from "./useMyEventTicketQuery";

// Self check-in (самостоятельная отметка посещения USER)
export {
  useAuthReadyState,
  useSelfCheckInMutation,
  useSelfCheckInOnMount,
  SELF_CHECK_IN_MUTATION_KEY,
  type SelfCheckInResult,
} from "./useSelfCheckInMutation";

// Чекаут билета платного события (M-4 / P-15)
export {
  useTicketCheckoutMutation,
  isTicketAlreadyPaidError,
  TICKET_CHECKOUT_MUTATION_KEY,
  type TicketOrder,
  type TicketOrderStatus,
} from "./useTicketCheckoutMutation";

// Онлайн-оплата билета через VIA (M-5)
export {
  useViaPaymentMutation,
  useViaConfirmQuery,
  isViaUnavailableError,
} from "./useViaPayment";

// Events hooks
export {
  usePublicEventsQuery,
  useFeaturedEventsQuery,
  usePublicEventQuery,
  useCanRegisterQuery,
  useOrganizationEventsQuery,
  useInvalidateEvents,
  usePrefetchEvent,
  EVENT_QUERY_KEYS,
  type PublicEventsParams,
  type PublicEventsResponse,
  type PublicEventDetail,
  type PublicEvent,
  type CanRegisterResponse,
  type EventPaymentType,
  type UseOrganizationEventsQueryOptions,
} from "./useEventsQuery";

// Public catalog: вопросы регистрации
export {
  useRegistrationQuestionsQuery,
} from "./useRegistrationQuestionsQuery";
export type { RegistrationQuestionPublic } from "@shared/api/publicCatalogService";

// Event Registration mutations
export {
  useRegisterForEventMutation,
  useCancelRegistrationMutation,
  EVENT_REGISTRATION_MUTATION_KEYS,
  type CreateRegistrationDto,
  type RegistrationResponse,
  type CancelRegistrationResponse,
} from "./useEventRegistration";

// Черновик незавершённой регистрации: продолжить или начать заново
export { useRegistrationDraft } from "./useRegistrationDraft";
export type {
  RegistrationDraftStatus,
  UseRegistrationDraftOptions,
  UseRegistrationDraftReturn,
} from "./useRegistrationDraft";

// Saved Events (сохранённые мероприятия USER)
export {
  useSavedEventsQuery,
  useCheckSavedEventQuery,
  useToggleSavedEventMutation,
  useSaveEventMutation,
  useUnsaveEventMutation,
} from "./useSavedEventsQuery";

// Pointer capability (гейт hover-анимаций на тач-устройствах)
export { useFinePointer } from "./useFinePointer";

// Portal
export { usePortal } from "./usePortal";

// Articles (избранные статьи)
export {
  useSavedArticlesQuery,
  useCheckArticleQuery,
  useSaveArticleMutation,
  useDeleteArticleByUrlMutation,
  useDeleteArticleByIdMutation,
  useInvalidateArticles,
  useToggleArticleSave,
  ARTICLES_QUERY_KEYS,
  type SavedArticle,
  type SavedArticlesResponse,
  type SaveArticleDto,
  type SaveArticleResponse,
  type DeleteArticleResponse,
  type CheckArticleResponse,
  type GetArticlesParams,
} from "./useArticlesQuery";

// Calendar (календарь пользователя)
export {
  useUserCalendarQuery,
  useCalendarEventsQuery,
  useCurrentMonthCalendar,
  CALENDAR_QUERY_KEYS,
  type CalendarMonthResponse,
  type CalendarEventsResponse,
  type GetCalendarParams,
  type GetCalendarEventsParams,
  type CalendarDay,
  type CalendarDayActivity,
  type CalendarEventItem,
  type CalendarRole,
  type CalendarDayType,
  type EventFormat as CalendarEventFormat,
} from "./useCalendarQuery";

// Certificates (сертификаты пользователя)
export {
  useCertificatesQuery,
  useCertificatesStatsQuery,
  useCertificateQuery,
  useCreateCertificateMutation,
  useUpdateCertificateMutation,
  useDeleteCertificateMutation,
  useInvalidateCertificates,
  CERTIFICATES_QUERY_KEYS,
  type Certificate,
  type EventCertificate,
  type GetCertificatesParams as CertificatesParams,
  type CertificatesResponse,
  type CertificatesStatsResponse,
  type CreateCertificateDto,
  type UpdateCertificateDto,
  type CertificateResponse,
  type DeleteCertificateResponse,
} from "./useCertificatesQuery";

// User Events (события пользователя - расширенный API)
export {
  useUserEventsQuery,
  useUserEventsStatsQuery,
  useInvalidateUserEvents,
  USER_EVENTS_QUERY_KEYS,
  type UserEventsResponse,
  type UserEventsStats,
  type GetUserEventsParams,
  type UserEventItem,
  type UserEventInfo,
  type UserEventAttendance,
  type UserEventCertificate,
  type UserEventStatus,
  type UserEventRole,
  type UserEventFormat,
  type UserEventFilter,
} from "./useUserEventsQuery";

// Privacy Settings (настройки приватности)
export {
  usePrivacySettingsMutation,
  PRIVACY_SETTINGS_MUTATION_KEY,
} from "./usePrivacySettingsMutation";

// Export Data (экспорт данных пользователя)
export {
  useExportDataQuery,
  downloadExportData,
  EXPORT_DATA_QUERY_KEY,
} from "./useExportDataQuery";

// Organizations (организации)
export {
  useOrganizationQuery,
  useUpdateOrganizationMutation,
  useDeleteOrganizationMutation,
  useUploadOrganizationLogoMutation,
  useDeleteOrganizationLogoMutation,
} from "./useOrganizationQuery";

// Organization Roles (роли организации)
export {
  useOrganizationRolesQuery,
  useOrganizationRoleQuery,
  useCreateRoleMutation,
  useUpdateRoleMutation,
  useDeleteRoleMutation,
  usePermissionsQuery,
} from "./useOrganizationRolesQuery";

// Public Stats (публичная статистика платформы)
export {
  usePlatformStatsQuery,
  useOrganizationPublicStatsQuery,
} from "./usePlatformStatsQuery";

// Organization Follow (подписка на организаторов USER)
export {
  useOrganizationPublicProfileQuery,
  useIsFollowingQuery,
  useFollowOrganizationMutation,
  useUnfollowOrganizationMutation,
  useContactOrganizationMutation,
  getOrganizationFollowErrorMessage,
} from "./useOrganizationFollow";

// Blog Comments
export { useBlogComments, type BlogCommentNode } from "./useBlogComments";

// Event Comments
export { useEventComments, type EventCommentNode } from "./useEventComments";

// Utility hooks
export { useInterval } from "./useInterval";
export { useEmailVerification } from "./useEmailVerification";

// Email change hooks
export {
  useRequestEmailChangeMutation,
  useConfirmEmailChangeMutation,
} from "./useChangeEmailMutation";

export { useDocumentTitle } from "./useDocumentTitle";

// Motion / interaction primitives
export { useReducedMotion } from "./useReducedMotion";
export { useHaptic } from "./useHaptic";

// Приглашения в команду организации (кабинет участника)
export {
  useMyOrganizationInvitesQuery,
  useAcceptMyOrganizationInviteMutation,
  useDeclineMyOrganizationInviteMutation,
  useMyOrganizationsQuery,
  ORGANIZATION_INVITES_QUERY_KEYS,
  MY_ORGANIZATIONS_QUERY_KEY,
} from "./useMyOrganizationInvites";
export type {
  MyInvite,
  AcceptMyInviteResult,
  MyOrganizationSummary,
} from "./useMyOrganizationInvites";
