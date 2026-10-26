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
export { MemberStatus, MEMBER_STATUS_LABEL_KEYS } from './organization.types'
export { placesService } from './placesService'

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
} from './event.types'

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
// Super Admin
// ================================
export { superAdminService } from './superAdminService'
export type {
  SystemStats,
  AdminUser,
  AdminOrganization,
  AdminEvent,
  GetSystemStatsResponse,
  GetAdminUsersParams,
  GetAdminUsersResponse,
  UpdateAdminUserRequest,
  GetAdminOrganizationsParams,
  GetAdminOrganizationsResponse,
  UpdateAdminOrganizationRequest,
  GetAdminEventsParams,
  GetAdminEventsResponse,
  UpdateAdminEventRequest,
  GetVerificationCodesParams,
  GetVerificationCodesResponse,
  VerificationCode,
  AdminBlogPost,
  GetAdminBlogPostsParams,
  GetAdminBlogPostsResponse,
  RejectBlogPostRequest,
  BlogPostStatus as AdminBlogPostStatus,
  AdminCategory,
  GetAdminCategoriesParams,
  GetAdminCategoriesResponse,
  CreateAdminCategoryRequest,
  UpdateAdminCategoryRequest,
  AdminCollection,
  GetAdminCollectionsParams,
  GetAdminCollectionsResponse,
  CreateAdminCollectionRequest,
  UpdateAdminCollectionRequest,
  AddEventsToCollectionRequest,
  RemoveEventsFromCollectionRequest,
  ReorderCollectionEventsRequest,
} from './superAdmin.types'

// ================================
// Blog
// ================================
export {
  blogPostsService,
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
// Billing (super admin, S-2/S-3/S-4/S-19)
// ================================
export { billingAdminService } from './billingService'
export { accessMaskService } from './accessMaskService'
export type { AccessMask, SetAccessMaskRequest } from './accessMaskService'
export type {
  PlanKey,
  BillingSource,
  PlanPurchaseStatus,
  OrderKind,
  OrderStatus,
  BillingCurrency,
  PaymentProvider,
  PaymentTxStatus,
  EntitlementKey,
  CreditMode,
  RevenueType,
  UsageMeter,
  EventCredits,
  ActivePlanPurchase,
  OrgBillingStatus,
  OrgEntitlements,
  BillingOverride,
  BillingOrder,
  AdminOrgBilling,
  PaymentTransaction,
  ActivatePlanRequest,
  ExtendPlanRequest,
  ExpirePlanRequest,
  AdjustCreditsRequest,
  RecordPaymentRequest,
  ReversePaymentRequest,
  SetOverrideRequest,
  RevokeOverrideRequest,
  SuspendOrgRequest,
  CompGrantRequest,
  SetEnforcementResult,
  PayoutOwedRow,
  RecordPayoutRequest,
  PayoutRecord,
  EnforcementState,
  ViaState,
  SetViaResult,
  ExpiringPack,
  MonetizationOverview,
  RevenueEntryType,
  RevenueChannel,
  RevenueTypeRow,
  RevenueChannelRow,
  RevenueSummary,
  RevenuePeriodQuery,
  BillingAuditAction,
  BillingAuditEntry,
  BillingAuditQuery,
  BillingAuditPage,
  AddonSkuKind,
  CoinMetric,
  AdBillingUnit,
  CatalogPlan,
  CatalogAddonSku,
  BillingCatalog,
  UpdatePricingRequest,
} from './billing.types'

// ================================
// App Builds (мобильные сборки)
// ================================
export { appBuildsService } from './appBuildsService'
export type { AppBuild, AppBuildPlatform, UploadAppBuildRequest } from './appBuild.types'

