// Config & Client
export {
  API_BASE_URL,
  API_TIMEOUT,
  MEDIA_BASE_URL,
  getMediaUrl,
  api,
  clearAuthTokens,
  getAccessToken,
  getRefreshToken,
  setAuthTokens,
  tokenStorageKeys,
  markWorkspaceSelectionPending,
  clearWorkspaceSelectionPending,
  isWorkspaceSelectionPending,
  type UserType,
} from './config'
export { request, apiClient } from './apiClient'
export type { ApiResponse, ApiError, HttpMethod, RequestConfig } from './types'

// ================================
// Services
// ================================

// Auth
export { authService } from './services'
export type {
  // Types
  AuthOrganization,
  AuthMember,
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
} from './services'

// User types
export type {
  User,
  UserRole,
  UserStatus,
  CreateUserRequest,
  UpdateUserRequest,
  GetUsersParams,
  GetUsersResponse,
  UserResponse,
  ResendInviteRequest,
} from './services'

// Me (unified login + memberships) & Organization invites
export { meService, invitesService } from './services'
export type {
  UnifiedLoginRequest,
  UnifiedLoginResponse,
  MembershipKind,
  MyOrganizationMembership,
  MyOrganizationsResponse,
  EnterWorkspaceResponse,
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
} from './services'

// Organizations
export { organizationsService, memberService } from './services'
export type {
  Organization,
  OrganizationMember,
  OrganizationRole,
  CreateOrganizationRequest,
  UpdateOrganizationRequest,
  GetOrganizationsParams,
  GetOrganizationsResponse,
  GetMembersParams,
  GetMembersResponse,
  CreateRoleRequest,
  UpdateRoleRequest,
  GetRolesResponse,
  GetPermissionsResponse,
  // Member types
  MemberProfile,
  MemberOrganization,
  MemberPermissionsResponse,
  UpdateMemberMeRequest,
  UpdateMemberPrivacyRequest,
  UploadMemberAvatarResponse,
  DeleteMemberAvatarResponse,
} from './services'

// Events
export { eventsService, publicEventsService } from './services'
export type {
  Event,
  EventType,
  EventFormat,
  EventStatus,
  EventParticipant,
  ParticipantStatus,
  EventChatMessage,
  CustomRegistrationQuestion,
  Gender,
  CreateEventRequest,
  CreateEventResponse,
  UpdateEventRequest,
  UpdateEventResponse,
  GetEventsRequest,
  GetEventsResponse,
  GetEventParticipantsRequest,
  GetEventParticipantsResponse,
  ExportParticipantsRequest,
  ExportParticipantsResponse,
  PublicEvent,
  SearchEventsParams,
  SearchEventsResponse,
  GetPublicEventResponse,
  GetFeaturedEventsResponse,
  GetUpcomingEventsResponse,
  GetSimilarEventsResponse,
} from './services'

// Speakers & Agenda
export { speakersService, agendaService } from './services'
export type {
  Speaker,
  CreateSpeakerRequest,
  UpdateSpeakerRequest,
  GetSpeakersResponse,
  ReorderSpeakersRequest,
  AgendaItem,
  AgendaItemType,
  CreateAgendaItemRequest,
  UpdateAgendaItemRequest,
  GetAgendaResponse,
  ReorderAgendaRequest,
} from './services'

// Registrations
export {
  registrationQuestionsService,
  eventRegistrationsService,
  publicRegistrationsService,
} from './services'
export type {
  Registration,
  RegistrationStatus,
  RegistrationRole,
  RegistrationUser,
  RegistrationQuestion,
  PublicQuestion,
  QuestionType,
  QuestionCategory,
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
} from './services'

// Attendance
export { attendanceService } from './services'
export type {
  AttendanceRecord,
  AttendanceStatus,
  DailyAttendanceSummary,
  AttendanceByDate,
  MarkAttendanceRequest,
  BulkMarkAttendanceRequest,
  BulkMarkAttendanceResponse,
  GetAttendanceParams,
  GetAttendanceStatsResponse,
  CheckInRequest,
  CheckOutRequest,
  QRCheckInRequest,
} from './services'

// Certificates
export {
  certificateTemplatesService,
  eventCertificatesService,
  myCertificatesService,
  certificateVerificationService,
} from './services'
export type {
  Certificate,
  CertificateTemplate,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  GetTemplatesResponse,
  IssueCertificateRequest,
  BulkIssueCertificatesRequest,
  BulkIssueCertificatesResponse,
  GetCertificatesParams,
  GetCertificatesResponse,
  GetMyCertificatesResponse,
  VerifyCertificateRequest,
  VerifyCertificateResponse,
} from './services'

// Boards & Tasks
export { boardsService, tasksService } from './services'
export type {
  Board,
  BoardColumn,
  BoardMember,
  BoardVisibility,
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
  Task,
  TaskPriority,
  TaskTag,
  TaskComment,
  TaskChecklist,
  ChecklistItem,
  TaskAttachment,
  TaskActivity,
  CreateTaskRequest,
  UpdateTaskRequest,
  MoveTaskRequest,
  GetTasksParams,
  GetTasksResponse,
  TaskDetailResponse,
  CreateTagRequest,
  UpdateTagRequest,
  GetTagsResponse,
  CreateCommentRequest,
  UpdateCommentRequest,
  GetCommentsResponse,
  CreateChecklistRequest,
  UpdateChecklistRequest,
  CreateChecklistItemRequest,
  UpdateChecklistItemRequest,
  UploadAttachmentResponse,
  GetActivitiesParams,
  GetActivitiesResponse,
} from './services'

// Uploads
export { uploadsService } from './services'
export type {
  UploadedFile,
  UploadType,
  UploadFileRequest,
  UploadFileResponse,
  UploadMultipleFilesRequest,
  UploadMultipleFilesResponse,
  GetSignedUrlRequest,
  GetSignedUrlResponse,
  DeleteFileRequest,
} from './services'

// Event Mail
export { eventMailService } from './services'
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
  CreateEmailTemplateRequest,
  UpdateEmailTemplateRequest,
  GetEmailTemplatesResponse,
  PreviewEmailRequest,
  PreviewEmailResponse,
  GetScheduledEmailsResponse,
} from './services'

// Stats
export { statsService } from './services'
export type { MonthlyStatsResponse, StatsParams } from './services'
