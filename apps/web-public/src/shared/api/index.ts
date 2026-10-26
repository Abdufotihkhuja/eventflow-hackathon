// Auth Service
export {
  authService,
  // Account types
  type AccountType,
  // User types
  type User,
  type Organization as AuthOrganization,
  // Token types
  type AuthTokens,
  // Request types
  type LoginCredentials,
  type UserSignupCredentials,
  type OrganizerSignupCredentials,
  type RefreshTokenRequest,
  type UpdateUserData,
  type ChangePasswordData,
  // Response types
  type TokensOnlyResponse,
  type MessageResponse,
  type RefreshTokenResponse,
  type OAuthRedirectResponse,
  type UploadAvatarResponse,
  type Session,
  // OAuth types
  type OAuthUserType,
  type AuthUserType,
  type UserGender,
  type UserProfileStatus,
  type UserSpecialization,
} from "./authService";

// Events Service
export {
  eventService,
  EVENT_QUERY_KEYS,
  type EventFormat,
  type EventStatus,
  type EventPaymentType,
  type EventCategory,
  type RegistrationStatus as EventRegistrationStatus,
  type PublicEvent,
  type PublicEventDetail,
  type PublicEventOrganization,
  type EventAgendaItem,
  type EventSpeaker,
  type EventFaq,
  type PublicEventsParams,
  type PublicEventsResponse,
  type PaginationMeta,
  type CanRegisterResponse,
} from "./eventService";

// Blog Service
export {
  blogService,
  BLOG_QUERY_KEYS,
  type ApiBlogCategory,
  type ApiBlogAuthor,
  type ApiBlogPost,
  type ApiBlogParams,
  type ApiBlogListResponse,
  type ApiBlogCategoryInfo,
} from "./blogService";

// Blog Interactions Service (лайки, сохранения)
export {
  blogInteractionsService,
  BLOG_INTERACTIONS_QUERY_KEYS,
  type CheckLikeResponse,
  type LikeResponse,
  type CheckSavedResponse,
  type SavePostResponse,
  type SavedBlogPostItem,
  type SavedBlogPost,
  type GetSavedPostsParams,
  type SavedBlogPostsResponse,
} from "./blogInteractionsService";

// Profile Service
// Registration Service
export {
  registrationService,
  REGISTRATION_QUERY_KEYS,
  type Registration,
  type RegistrationEvent,
  type RegistrationUser,
  type RegistrationAnswer,
  type RegistrationStatus,
  type RegistrationQrResponse,
  type CreateRegistrationDto,
  type RegistrationResponse,
  type CancelRegistrationResponse,
  type RegistrationRole,
  type RegistrationAnswerDto,
} from "./registrationService";

// Articles Service (избранные статьи)
export {
  articlesService,
  ARTICLES_QUERY_KEYS,
  type SavedArticle,
  type SavedArticlesResponse,
  type SaveArticleDto,
  type SaveArticleResponse,
  type DeleteArticleResponse,
  type CheckArticleResponse,
  type GetArticlesParams,
  type DeleteArticleByUrlDto,
} from "./articlesService";

// Calendar Service (календарь пользователя)
export {
  calendarService,
  CALENDAR_QUERY_KEYS,
  type CalendarRole,
  type CalendarDayType,
  type CalendarDay,
  type CalendarDayActivity,
  type CalendarMonthResponse,
  type CalendarEventItem,
  type CalendarEventsResponse,
  type GetCalendarParams,
  type GetCalendarEventsParams,
  type EventFormat as CalendarEventFormat,
} from "./calendarService";

// User Events Service (события пользователя - расширенный API)
export {
  userEventsService,
  USER_EVENTS_QUERY_KEYS,
  type UserEventStatus,
  type UserEventRole,
  type UserEventFormat,
  type UserEventFilter,
  type PublicEventStatus,
  type UserEventInfo,
  type UserEventAttendance,
  type UserEventCertificate,
  type UserEventItem,
  type UserEventsStats,
  type UserEventsResponse,
  type GetUserEventsParams,
} from "./userEventsService";

// Users Service (профиль, приватность, экспорт, доп. поля профиля)
export {
  usersService,
  USERS_QUERY_KEYS,
  type PrivacySettings,
  type UpdatePrivacySettingsDto,
  type UpdatePrivacyResponse,
  type UserExportData,
  type ProfileOptionsResponse,
  type ProfileOptionCodeLabel,
  type ProfileOptionValueLabel,
} from "./usersService";

// Certificates Service (сертификаты пользователя)
export {
  certificatesService,
  CERTIFICATES_QUERY_KEYS,
  CERTIFICATE_PDF_EXTENSION,
  CERTIFICATE_PDF_WIDTH,
  CERTIFICATE_PDF_HEIGHT,
  CERTIFICATE_PDF_ASPECT_RATIO,
  type Certificate,
  type EventCertificate,
  type GetCertificatesParams,
  type CertificatesResponse,
  type CertificatesStatsResponse,
  type CreateCertificateDto,
  type UpdateCertificateDto,
  type CertificateResponse,
  type DeleteCertificateResponse,
  type CertificateFilter,
  type VerifyCertificateRequest,
  type VerifyCertificateResponse,
  type CertificateVerifyPayload,
} from "./certificatesService";

// Organizations Service (организации)
export {
  organizationsService,
  ORGANIZATIONS_QUERY_KEYS,
  type Organization,
  type OrganizationVerificationStatus,
  type UpdateOrganizationDto,
  type UploadLogoResponse,
  type DeleteLogoResponse,
} from "./organizationsService";

// Organization Roles Service (роли организации)
export {
  organizationRolesService,
  permissionsService,
  ORGANIZATION_ROLES_QUERY_KEYS,
  type OrganizationRole,
  type CreateRoleDto,
  type UpdateRoleDto,
  type Permission,
  type PermissionGroup,
} from "./organizationRolesService";

// Public Stats Service (публичная статистика платформы)
export {
  publicStatsService,
  PUBLIC_STATS_QUERY_KEYS,
  type PublicStatItem,
  type PublicParticipantsStat,
  type PublicConversionStat,
  type PlatformStats,
  type OrganizationPublicStats,
} from "./publicStatsService";

// Public Catalog (теги, категории, подборки)
export {
  publicCatalogService,
  PUBLIC_CATALOG_QUERY_KEYS,
  type EventTag,
  type GetTagsParams,
  type TagCategory,
  type Category,
  type Collection,
  type CollectionEventItem,
  type RegistrationQuestionPublic,
} from "./publicCatalogService";

// Saved Events Service (сохранённые мероприятия USER)
export {
  savedEventsService,
  SAVED_EVENTS_QUERY_KEYS,
  type SavedEventItem,
  type SavedEventsResponse,
  type SavedEventsParams,
  type CheckSavedEventResponse,
} from "./savedEventsService";

// Event Comments Service (комментарии к событиям USER)
export {
  eventCommentsService,
  EVENT_COMMENTS_QUERY_KEYS,
  type EventComment,
  type EventCommentsResponse,
  type EventCommentsParams,
  type CreateEventCommentDto,
  type UpdateEventCommentDto,
  type LikeCommentBody,
} from "./eventCommentsService";

// Blog Comments Service (комментарии к статьям блога USER)
export {
  blogCommentsService,
  BLOG_COMMENTS_QUERY_KEYS,
  type BlogComment,
  type BlogCommentsResponse,
  type BlogCommentsParams,
  type CreateBlogCommentDto,
  type UpdateBlogCommentDto,
} from "./blogCommentsService";

// Organization Public Service (подписки, контакт USER)
export {
  organizationPublicService,
  ORGANIZATION_PUBLIC_QUERY_KEYS,
  type OrganizationPublicProfile,
  type CreateContactRequestDto,
} from "./organizationPublicService";

// Tickets Service (билеты USER)
export {
  ticketsService,
  TICKETS_QUERY_KEYS,
  type TicketDesign,
  type TicketResponse,
  type DownloadAllTicketsBody,
  type DownloadAllTicketsResponse,
} from "./ticketsService";

// Attendance Service (самостоятельный check-in USER)
export {
  attendanceService,
  type SelfCheckInAttendance,
  type SelfCheckInEvent,
  type SelfCheckInResult,
  type SelfCheckInErrorCode,
  type SelfCheckInAlreadyUsedErrorData,
} from "./attendanceService";

// Speaker Invite Service (приглашения спикера USER)
export {
  speakerInviteService,
  type SpeakerInvitePage,
  type AcceptSpeakerInviteBody,
  type RejectSpeakerInviteBody,
} from "./speakerInviteService";

// Verification Service (верификация email с кодами)
export { verificationService } from "./verificationService";
export type {
  VerificationCodeType,
  SendCodeRequest,
  VerifyEmailRequest,
  ResetPasswordRequest,
  ResendCodeRequest,
  ChangeEmailRequest,
  ChangeEmailConfirmRequest,
  ApiResponse,
  ChangeEmailResponse,
} from "./types/verification";
export { VerificationCodeType as VerificationCodeTypeEnum } from "./types/verification";

// Organization Invites (приглашения в команду — кабинет приглашённого)
export {
  organizationInvitesService,
  ORGANIZATION_INVITES_QUERY_KEYS,
} from "./organizationInvitesService";
export {
  myOrganizationsService,
  MY_ORGANIZATIONS_QUERY_KEY,
} from "./organizationInvitesService";
export type {
  MyInvite,
  MyInviteRole,
  AcceptMyInviteResult,
  MyOrganizationSummary,
} from "./organizationInvitesService";
