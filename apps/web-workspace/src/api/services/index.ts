// ================================
// Auth
// ================================
export { authService } from './authService'
export type {
  // Types
  Organization as AuthOrganization,
  OrganizationMember as AuthMember,
  AuthUser,
  AuthTokens,
  LoginType,
  // Login
  LoginRequest,
  OrganizationLoginRequest,
  MemberLoginRequest,
  OrganizationLoginResponse,
  MemberLoginResponse,
  LoginResponse,
  // Token
  RefreshTokensRequest,
  RefreshTokensResponse,
  LogoutRequest,
  LogoutResponse,
  // Profile
  UpdateOrganizationProfileRequest,
  UpdateMemberProfileRequest,
  UpdateProfileResponse,
  ChangePasswordRequest,
  ChangePasswordResponse,
  UploadLogoResponse,
  UploadAvatarResponse,
} from './auth.types'

// ================================
// Verification (email, codes)
// ================================
export { verificationService } from './verificationService'
export type {
  VerificationCodeType,
  VerificationUserType,
  SendVerificationCodeRequest,
  VerifyEmailRequest,
  ResendCodeRequest,
} from './verification.types'

// ================================
// User permissions/types
// ================================
export type {
  User,
  UserRole,
  UserStatus,
  Permission,
  PermissionGroup,
  CreateUserRequest,
  UpdateUserRequest,
  GetUsersParams,
  GetUsersResponse,
  UserResponse,
  ResendInviteRequest,
} from './user.types'

// ================================
// Organizations
// ================================
export { organizationsService } from './organizationsService'
export {
  MemberStatus,
  MEMBER_STATUS_LABEL_KEYS,
  getMemberStatusLabel,
  getOrganizationRoleDescription,
  getOrganizationRoleLabel,
} from './organization.types'
export { placesService } from './placesService'

// ================================
// Me (унифицированный вход + членство)
// ================================
export { meService } from './meService'
export type {
  UnifiedLoginRequest,
  UnifiedLoginResponse,
  MembershipKind,
  MyOrganizationMembership,
  MyOrganizationsResponse,
  EnterWorkspaceResponse,
} from './me.types'

// ================================
// Organization invites
// ================================
export { invitesService } from './invitesService'
export type {
  InviteAuthMethod,
  InviteStatus,
  InviteNextAction,
  InviteRoleRef,
  InvitePreview,
  AcceptInviteRequest,
  AcceptInviteResponse,
  InviteSummary,
  CreateInviteRequest,
  PendingInviteConflictDetails,
  InviteErrorCode,
} from './invite.types'

// ================================
// Member (сотрудник организации)
// ================================
export { memberService } from './memberService'
export type {
  MemberProfile,
  MemberOrganization,
  MemberPermissionsResponse,
  UpdateMemberProfileRequest as UpdateMemberMeRequest,
  UpdateMemberPrivacyRequest,
  UploadMemberAvatarResponse,
  DeleteMemberAvatarResponse,
} from './member.types'
export type {
  Organization,
  OrganizationMember,
  OrganizationRole,
  MemberStatus as MemberStatusType,
  Permission as OrgPermission,
  MemberPermission,
  RolePermission,
  CreateOrganizationRequest,
  UpdateOrganizationRequest,
  GetOrganizationsParams,
  GetOrganizationsResponse,
  CreateMemberRequest,
  UpdateMemberRequest,
  UpdateMemberPermissionsRequest,
  GetMembersParams,
  GetMembersResponse,
  MemberResponse,
  CreateRoleRequest,
  UpdateRoleRequest,
  GetRolesResponse,
  GetPermissionsResponse,
  DashboardStats,
  DashboardActivityItem,
  GetDashboardActivityParams,
  Follower,
  GetFollowersParams,
  GetFollowersResponse,
  FollowersStats,
  ContactRequest,
  ContactRequestUser,
  ContactRequestStatus,
  GetContactsParams,
  GetContactsResponse,
  ContactsStats,
  UpdateContactStatusRequest,
} from './organization.types'
export { RENTAL_TYPES } from './place.types'
export type {
  Place,
  PlaceStatus,
  PlaceCurrency,
  RentalType,
  PlaceOrganization,
  PlaceCatalogParams,
  MyPlacesParams,
  NearbyPlacesParams,
  PlacesListResponse,
  CreatePlaceRequest,
  UpdatePlaceRequest,
  CreatePlaceRentalRequest,
  PlaceImageUploadResponse,
} from './place.types'

// ================================
// Events
// ================================
export { eventsService } from './eventsService'
export type {
  Event,
  EventType,
  EventFormat,
  EventStatus,
  EventParticipant,
  ParticipantStatus,
  AttendanceRecord as EventAttendanceRecord,
  EventChatMessage,
  CustomRegistrationQuestion,
  Speaker as EventSpeaker,
  AgendaItem as EventAgendaItem,
  Gender,
  CreateEventRequest,
  CreateEventResponse,
  UpdateEventRequest,
  UpdateEventResponse,
  GetEventsRequest,
  GetEventsResponse,
  GetEventParticipantsRequest,
  GetEventParticipantsResponse,
  GetAttendanceRequest,
  GetAttendanceResponse,
  ExportParticipantsRequest,
  ExportParticipantsResponse,
  // Comments
  EventComment,
  CreateEventCommentRequest,
  UpdateEventCommentRequest,
  GetEventCommentsParams,
  GetEventCommentsResponse,
  SuggestEventSlugResponse,
  CheckEventSlugResponse,
  EventInvitation,
  SendEventInvitationsResponse,
} from './event.types'

// ================================
// Categories (тематики событий)
// ================================
export { categoriesService } from './categoriesService'
export type { EventCategoryOption } from './categoriesService'

// ================================
// Public Events
// ================================
export { publicEventsService } from './publicEventsService'
export type {
  PublicEvent,
  SearchEventsParams,
  SearchEventsResponse,
  GetPublicEventResponse,
  GetFeaturedEventsResponse,
  GetUpcomingEventsResponse,
  GetSimilarEventsResponse,
} from './publicEvents.types'

// ================================
// Speakers
// ================================
export { speakersService } from './speakersService'
export type {
  Speaker,
  InvitationStatus,
  CreateSpeakerRequest,
  UpdateSpeakerRequest,
  GetSpeakersResponse,
  ReorderSpeakersRequest,
  InviteSpeakerRequest,
  InviteSpeakerResponse,
  SpeakerInvitation,
  AcceptInvitationRequest,
  RejectInvitationRequest,
} from './speaker.types'

// ================================
// Agenda
// ================================
export { agendaService } from './agendaService'
export { agendaMaterialsService } from './agendaMaterialsService'
export type {
  AgendaItem,
  AgendaItemType,
  CreateAgendaItemRequest,
  UpdateAgendaItemRequest,
  GetAgendaResponse,
  ReorderAgendaRequest,
  // Materials
  AgendaMaterial,
  AgendaMaterialType,
  GetAgendaMaterialsResponse,
  UploadAgendaMaterialResponse,
  UploadAgendaMaterialMultipleResponse,
  AddAgendaLinkRequest,
} from './agenda.types'

// ================================
// Registrations
// ================================
export {
  registrationQuestionsService,
  eventRegistrationsService,
  userRegistrationsService,
  publicRegistrationsService,
} from './registrationsService'
export { QuestionType, QuestionCategory } from './registration.types'
export type {
  Registration,
  RegistrationStatus,
  RegistrationRole,
  RegistrationUser,
  RegistrationQuestion,
  PublicQuestion,
  QuestionType as QuestionTypeType,
  QuestionCategory as QuestionCategoryType,
  QuestionAnswer,
  CreateQuestionRequest,
  UpdateQuestionRequest,
  GetQuestionsResponse,
  GetPublicQuestionsResponse,
  ReorderQuestionsRequest,
  CreateRegistrationRequest,
  UpdateRegistrationRequest,
  GetRegistrationsParams,
  GetRegistrationsResponse,
  BulkUpdateRegistrationsRequest,
  BulkUpdateRegistrationsResponse,
  ExportRegistrationsRequest,
  ExportRegistrationsResponse,
} from './registration.types'

// ================================
// Attendance
// ================================
export { attendanceService } from './attendanceService'
export type {
  AttendanceRecord,
  AttendanceStatus,
  DailyAttendanceSummary,
  AttendanceByDate,
  MarkAttendanceRequest,
  BulkMarkAttendanceRequest,
  BulkMarkAttendanceResponse,
  GetAttendanceParams,
  GetAttendanceResponse as AttendanceResponse,
  GetAttendanceStatsResponse,
  CheckInRequest,
  CheckOutRequest,
  QRCheckInRequest,
  CheckInLandingQrResponse,
  CheckInByCodeResponse,
} from './attendance.types'

// ================================
// Event Analytics
// ================================
export { eventAnalyticsService } from './eventAnalyticsService'
export type {
  AnalyticsGenderFilter,
  AnalyticsAgeGroup,
  AnalyticsTestStatusFilter,
  AnalyticsRegionFilter,
  EventAnalyticsQuery,
  AnalyticsBucket,
  AnalyticsOverview,
  AnalyticsDemographics,
  AnalyticsTrendPoint,
  AnalyticsTests,
  AnalyticsQuestion,
  AnalyticsQuestionType,
  AnalyticsQuestionCategory,
  AnalyticsQuestions,
  AnalyticsFunnel,
  AnalyticsMeta,
  EventAnalyticsResponse,
} from './eventAnalytics.types'

// ================================
// Tickets
// ================================
export { ticketsService } from './ticketsService'
export { TicketDesign } from './ticket.types'
export type {
  TicketDesign as TicketDesignType,
  DownloadTicketParams,
  DownloadAllTicketsRequest,
  TicketUrls,
  CheckInResult,
} from './ticket.types'

// ================================
// Badges
// ================================
export { badgeTemplatesService, eventBadgesService } from './badgesService'
export type {
  BadgeFieldArea,
  BadgeRecipientRole,
  BadgeSizePreset,
  BadgeTemplate,
  GetBadgeTemplatesResponse,
  CreateBadgeTemplateRequest,
  DownloadBadgesRequest,
} from './badge.types'

// ================================
// Certificates
// ================================
export {
  certificateTemplatesService,
  eventCertificatesService,
  organizerCertificatesService,
  myCertificatesService,
  certificateVerificationService,
} from './certificatesService'
export type {
  Certificate,
  CertificateRecipientRole,
  CertificateSizePreset,
  CertificateTemplate,
  TemplateFieldArea,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  GetTemplatesResponse,
  IssueCertificateRequest,
  BulkIssueCertificatesRequest,
  BulkIssueCertificatesResponse,
  GetCertificatesParams,
  GetCertificatesResponse,
  GetMyCertificatesResponse,
  GenerateCertificatesRequest,
  GenerateCertificatesResponse,
  GenerateEventCertificatesBody,
  VerifyCertificateRequest,
  VerifyCertificateResponse,
} from './certificate.types'

// ================================
// Artifact recipients / roles / template summary / bulk preview
// ================================
export {
  artifactRecipientsService,
  artifactTemplateSummaryService,
  artifactBulkPreviewService,
  recipientRolesService,
} from './artifactRecipientsService'
export type {
  RecipientRole,
  RecipientRoleKind,
  CreateRecipientRoleRequest,
  UpdateRecipientRoleRequest,
  RecipientRoleDeletePreview,
  RecipientRoleDeletePreviewCounts,
  ArtifactRecipient,
  ArtifactRecipientStatus,
  ArtifactRecipientAssignmentStatus,
  ArtifactRecipientSourceType,
  ArtifactRecipientAssignedRole,
  ArtifactRecipientSourceSummary,
  GetArtifactRecipientsParams,
  GetArtifactRecipientsResponse,
  CreateManualArtifactRecipientRequest,
  UpdateManualArtifactRecipientRequest,
  ArtifactRecipientCreateResult,
  AssignArtifactRecipientRoleRequest,
  ArtifactRecipientRoleAssignmentSummary,
  ArtifactRecipientRoleAssignmentResult,
  ArtifactTemplateStatus,
  ArtifactTemplateSummaryTemplate,
  ArtifactTemplateTypeSummary,
  ArtifactTemplateRoleSummary,
  ArtifactTemplateSummaryResponse,
  GetArtifactTemplateSummaryParams,
  ArtifactType,
  ArtifactBulkScope,
  ArtifactBulkPreviewRequest,
  ArtifactBulkPreviewResponse,
  ArtifactBulkPreviewRole,
  ArtifactBulkPreviewStatusBreakdown,
  ArtifactBulkPreviewMissingTemplate,
  ArtifactBulkPreviewWarning,
  ArtifactBulkPreviewWarningCode,
  ArtifactBulkPreviewExcludedRecipient,
} from './artifact-recipient.types'

// ================================
// Boards (Kanban)
// ================================
export { boardsService } from './boardsService'
export type {
  Board,
  BoardListItem,
  BoardColumn,
  BoardTask,
  BoardMember,
  BoardMemberRole,
  BoardVisibility,
  BoardSettings,
  BoardStatsResponse,
  TaskAssignee,
  TaskTag,
  TaskType,
  TaskPriority,
  CreateBoardRequest,
  UpdateBoardRequest,
  GetBoardsParams,
  GetBoardsResponse,
  BoardDetailResponse,
  CreateColumnRequest,
  UpdateColumnRequest,
  ReorderColumnsRequest,
  AddBoardMemberRequest,
  UpdateBoardMemberRoleRequest,
  GetBoardMembersResponse,
} from './board.types'

// ================================
// Tasks
// ================================
export { tasksService } from './tasksService'
export type {
  Task,
  TaskComment,
  TaskChecklist,
  ChecklistItem,
  TaskAttachment,
  TaskActivity,
  CreateTaskRequest,
  UpdateTaskRequest,
  MoveTaskRequest,
  AddAssigneesRequest,
  GetTasksParams,
  GetTasksResponse,
  TaskDetailResponse,
  CreateTagRequest,
  UpdateTagRequest,
  GetTagsResponse as TaskGetTagsResponse,
  CreateCommentRequest,
  UpdateCommentRequest,
  GetCommentsResponse,
  CreateChecklistRequest,
  UpdateChecklistRequest,
  CreateChecklistItemRequest,
  UpdateChecklistItemRequest,
  GetAttachmentsResponse,
  UploadAttachmentResponse,
  GetActivitiesParams,
  GetActivitiesResponse,
} from './task.types'

// ================================
// Uploads
// ================================
export { uploadsService } from './uploadsService'
export { UploadType } from './upload.types'
export type {
  UploadedFile,
  UploadType as UploadTypeType,
  UploadFileRequest,
  UploadFileResponse,
  UploadMultipleFilesRequest,
  UploadMultipleFilesResponse,
  GetSignedUrlRequest,
  GetSignedUrlResponse,
  DeleteFileRequest,
} from './upload.types'

// ================================
// Event Mail
// ================================
export { eventMailService } from './eventMailService'
export type {
  EmailLog,
  EmailTemplate,
  EmailType,
  EmailStatus,
  ScheduledEmail,
  SendEmailRequest,
  SendEmailResponse,
  GetEmailLogsParams,
  GetEmailLogsResponse,
  CreateTemplateRequest as CreateEmailTemplateRequest,
  UpdateTemplateRequest as UpdateEmailTemplateRequest,
  GetTemplatesResponse as GetEmailTemplatesResponse,
  PreviewEmailRequest,
  PreviewEmailResponse,
  GetScheduledEmailsResponse,
} from './mail.types'

// ================================
// Stats
// ================================
export { statsService } from './statsService'
export type { MonthlyStatsResponse, StatsParams } from './stats.types'

// ================================
// Blog
// ================================
export {
  blogPostsService,
  blogCategoriesService,
  publicBlogService,
  blogCommentsService,
  blogLikesService,
  savedBlogPostsService,
} from './blogService'
export type {
  BlogPost,
  BlogPostPreview,
  BlogPostsResponse,
  BlogPostStatus,
  BlogSortBy,
  BlogTag,
  BlogCategory,
  BlogPostCategoryRelation,
  BlogAuthor,
  BlogComment,
  CommentsResponse,
  ContentBlock,
  CreateBlogPostDto,
  UpdateBlogPostDto,
  GetBlogPostsParams,
  GetPublishedBlogPostsParams,
  CreateCommentDto,
  UpdateCommentDto,
  GetCommentsParams,
  LikeCheckResponse,
  SaveCheckResponse,
  SortOrder,
  SuggestBlogSlugResponse,
  CheckBlogSlugResponse,
} from './blog.types'

// ================================
// Tags
// ================================
export { organizationTagsService, eventTagsService } from './tagsService'
export type {
  Tag,
  OrganizationTag,
  EventTag,
  GetTagsParams,
  GetTagsResponse,
  CreateTagParams,
} from './tagsService'

// ================================
// Per-event rooms (залы)
// ================================
export { eventRoomsService } from './eventRoomsService'
export type {
  EventRoom,
  CreateEventRoomRequest,
  UpdateEventRoomRequest,
} from './eventRooms.types'

// ================================
// Per-event checkpoints (окна отметок)
// ================================
export { eventCheckpointsService } from './eventCheckpointsService'
export type {
  EventCheckpoint,
  CreateEventCheckpointRequest,
  UpdateEventCheckpointRequest,
  CheckpointMatrixParticipant,
  CheckpointAttendanceMatrix,
} from './eventCheckpoints.types'

// ================================
// Billing (тарифы кабинета, C-1)
// ================================
export { billingService } from './billingService'
export type {
  BillingCatalog,
  BillingPlan,
  BillingAddonSku,
  BillingStatus,
  ActivePlanPurchase,
  BillingEntitlements,
  BillingUsageMeter,
  BillingEventCredits,
  CreateBillingRequestInput,
  BillingOrder,
  BillingPlanKey,
  BillingOrderKind,
  BillingOrderStatus,
  BillingWallet,
  BillingWalletEntry,
  BillingCoinMetric,
  BillingCoinLedgerKind,
} from './billingService'

// Notifications (центр уведомлений организации)
export { notificationsService } from './notificationsService'
export type {
  Notification,
  NotificationListResponse,
  NotificationPayload,
  NotificationType,
  UnreadCountResponse,
  MarkNotificationsReadRequest,
} from './notification.types'
