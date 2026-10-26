import type {
  ApiTransport,
  OperationQuery,
  OperationRequestBody,
  OperationSuccessResponse,
} from "@eventflow/api-contracts";

type OrganizationLoginBody = OperationRequestBody<
  "/api/v1/auth/organization/login",
  "post"
>;
type OrganizationLoginResponse = OperationSuccessResponse<
  "/api/v1/auth/organization/login",
  "post"
>;
type MemberLoginBody = OperationRequestBody<
  "/api/v1/auth/member/login",
  "post"
>;
type WorkspacePlansResponse = OperationSuccessResponse<
  "/api/v1/billing/plans",
  "get"
>;
type WorkspaceBillingStatusResponse = OperationSuccessResponse<
  "/api/v1/billing/status",
  "get"
>;
type WorkspaceEntitlementsResponse = OperationSuccessResponse<
  "/api/v1/billing/entitlements",
  "get"
>;
type CreateBillingRequestBody = OperationRequestBody<
  "/api/v1/billing/requests",
  "post"
>;
type CreateBillingRequestResponse = OperationSuccessResponse<
  "/api/v1/billing/requests",
  "post"
>;
type BillingRequestsResponse = OperationSuccessResponse<
  "/api/v1/billing/requests",
  "get"
>;
type BillingWalletResponse = OperationSuccessResponse<
  "/api/v1/billing/wallet",
  "get"
>;
type MemberLoginResponse = OperationSuccessResponse<
  "/api/v1/auth/member/login",
  "post"
>;
type SuperAdminLoginBody = OperationRequestBody<
  "/api/v1/auth/superadmin/login",
  "post"
>;
type RefreshBody = OperationRequestBody<"/api/v1/auth/refresh", "post">;
type RefreshResponse = OperationSuccessResponse<"/api/v1/auth/refresh", "post">;
type LogoutBody = OperationRequestBody<"/api/v1/auth/logout", "post">;
type SessionMeResponse = OperationSuccessResponse<"/api/v1/session/me", "get">;
type SessionV2Response = OperationSuccessResponse<"/api/v2/session/me", "get">;
type ScopeContextV2Response = OperationSuccessResponse<
  "/api/v2/session/context",
  "get"
>;
export type EventFlowScope = "personal" | `organization:${string}`;
type WorkspaceProfileResponse = OperationSuccessResponse<
  "/api/v1/workspace/me",
  "get"
>;
type UpdateOrganizationBody = OperationRequestBody<
  "/api/v1/workspace/me",
  "patch"
>;
type MemberProfileResponse = OperationSuccessResponse<
  "/api/v1/workspace/members/me",
  "get"
>;
type UpdateMemberProfileBody = OperationRequestBody<
  "/api/v1/workspace/members/me",
  "patch"
>;
type UpdateMemberPrivacyBody = OperationRequestBody<
  "/api/v1/workspace/members/me/privacy",
  "patch"
>;
type MemberPermissionsResponse = OperationSuccessResponse<
  "/api/v1/workspace/members/me/permissions",
  "get"
>;
type ChangePasswordBody = OperationRequestBody<
  "/api/v1/auth/change-password",
  "patch"
>;
type SessionsListResponse = OperationSuccessResponse<
  "/api/v1/auth/sessions",
  "get"
>;
type EventsListQuery = OperationQuery<"/api/v1/events", "get">;
type EventsListResponse = OperationSuccessResponse<"/api/v1/events", "get">;
type CreateEventBody = OperationRequestBody<"/api/v1/events", "post">;
type CreateEventResponse = OperationSuccessResponse<"/api/v1/events", "post">;
type EventResponse = OperationSuccessResponse<"/api/v1/events/{id}", "get">;
type UpdateEventBody = OperationRequestBody<"/api/v1/events/{id}", "patch">;
type UpdateEventResponse = OperationSuccessResponse<
  "/api/v1/events/{id}",
  "patch"
>;
type RegistrationsListQuery = OperationQuery<
  "/api/v1/events/{eventId}/registrations",
  "get"
>;
type RegistrationsListResponse = OperationSuccessResponse<
  "/api/v1/events/{eventId}/registrations",
  "get"
>;
type RegistrationResponse = OperationSuccessResponse<
  "/api/v1/events/{eventId}/registrations/{id}",
  "get"
>;
type RejectRegistrationBody = OperationRequestBody<
  "/api/v1/events/{eventId}/registrations/{id}/reject",
  "patch"
>;
type TemplatesResponse = OperationSuccessResponse<
  "/api/v1/events/{eventId}/certificates/templates",
  "get"
>;
type EventCertificatesQuery = OperationQuery<
  "/api/v1/events/{eventId}/certificates",
  "get"
>;
type EventCertificatesResponse = OperationSuccessResponse<
  "/api/v1/events/{eventId}/certificates",
  "get"
>;
type GenerateCertificatesBody = OperationRequestBody<
  "/api/v1/events/{eventId}/certificates/generate",
  "post"
>;
type GenerateCertificatesResponse = OperationSuccessResponse<
  "/api/v1/events/{eventId}/certificates/generate",
  "post"
>;
type ArtifactRecipientsQuery = OperationQuery<
  "/api/v1/events/{eventId}/artifact-recipients",
  "get"
>;
type ArtifactRecipientsResponse = OperationSuccessResponse<
  "/api/v1/events/{eventId}/artifact-recipients",
  "get"
>;
type CreateArtifactRecipientBody = OperationRequestBody<
  "/api/v1/events/{eventId}/artifact-recipients",
  "post"
>;
type CreateArtifactRecipientResponse = OperationSuccessResponse<
  "/api/v1/events/{eventId}/artifact-recipients",
  "post"
>;
type BatchCreateArtifactRecipientsBody = OperationRequestBody<
  "/api/v1/events/{eventId}/artifact-recipients/batch",
  "post"
>;
type BatchCreateArtifactRecipientsResponse = OperationSuccessResponse<
  "/api/v1/events/{eventId}/artifact-recipients/batch",
  "post"
>;
type UpdateArtifactRecipientBody = OperationRequestBody<
  "/api/v1/events/{eventId}/artifact-recipients/{recipientId}",
  "patch"
>;
type ArtifactRecipientResponse = OperationSuccessResponse<
  "/api/v1/events/{eventId}/artifact-recipients/{recipientId}",
  "patch"
>;
type AssignArtifactRecipientRoleBody = OperationRequestBody<
  "/api/v1/events/{eventId}/artifact-recipients/{recipientId}/roles",
  "post"
>;
type ArtifactRecipientRoleAssignmentResponse = OperationSuccessResponse<
  "/api/v1/events/{eventId}/artifact-recipients/{recipientId}/roles",
  "post"
>;
type DeactivateArtifactRecipientRoleResponse = OperationSuccessResponse<
  "/api/v1/events/{eventId}/artifact-recipients/{recipientId}/roles/{roleId}",
  "delete"
>;
type ArtifactTemplateSummaryQuery = OperationQuery<
  "/api/v1/events/{eventId}/artifacts/template-summary",
  "get"
>;
type ArtifactTemplateSummaryResponse = OperationSuccessResponse<
  "/api/v1/events/{eventId}/artifacts/template-summary",
  "get"
>;
type ArtifactBulkPreviewBody = OperationRequestBody<
  "/api/v1/events/{eventId}/artifacts/bulk-preview",
  "post"
>;
type ArtifactBulkPreviewResponse = OperationSuccessResponse<
  "/api/v1/events/{eventId}/artifacts/bulk-preview",
  "post"
>;
type RecipientRolesResponse = OperationSuccessResponse<
  "/api/v1/events/{eventId}/recipient-roles",
  "get"
>;
type CreateRecipientRoleBody = OperationRequestBody<
  "/api/v1/events/{eventId}/recipient-roles",
  "post"
>;
type RecipientRoleResponse = OperationSuccessResponse<
  "/api/v1/events/{eventId}/recipient-roles",
  "post"
>;
type UpdateRecipientRoleBody = OperationRequestBody<
  "/api/v1/events/{eventId}/recipient-roles/{roleId}",
  "patch"
>;
type RecipientRoleDeletePreviewResponse = OperationSuccessResponse<
  "/api/v1/events/{eventId}/recipient-roles/{roleId}/delete-preview",
  "get"
>;
type PublicEventBySlugResponse = OperationSuccessResponse<
  "/api/v1/events/by-slug/{slug}",
  "get"
>;
type CanRegisterResponse = OperationSuccessResponse<
  "/api/v1/public/events/{id}/can-register",
  "get"
>;
type AttendanceResponse = OperationSuccessResponse<
  "/api/v1/events/{eventId}/attendance",
  "get"
>;
type AttendanceQuery = OperationQuery<
  "/api/v1/events/{eventId}/attendance",
  "get"
>;
type TranslateBatchBody = OperationRequestBody<
  "/api/v1/translations/batch",
  "post"
>;
type TranslateBatchResponse = OperationSuccessResponse<
  "/api/v1/translations/batch",
  "post"
>;

// ── W6 additions (mobile organizer surface) — append-only ────────────────────
type DashboardStatsResponse = OperationSuccessResponse<
  "/api/v1/organizations/dashboard/stats",
  "get"
>;
type DashboardActivityQuery = OperationQuery<
  "/api/v1/organizations/dashboard/activity",
  "get"
>;
type DashboardActivityResponse = OperationSuccessResponse<
  "/api/v1/organizations/dashboard/activity",
  "get"
>;
type InvitesListResponse = OperationSuccessResponse<
  "/api/v1/organizations/invites",
  "get"
>;
type CreateInviteBody = OperationRequestBody<
  "/api/v1/organizations/invites",
  "post"
>;
type CreateInviteResponse = OperationSuccessResponse<
  "/api/v1/organizations/invites",
  "post"
>;
type ResendInviteResponse = OperationSuccessResponse<
  "/api/v1/organizations/invites/{inviteId}/resend",
  "post"
>;
type RevokeInviteResponse = OperationSuccessResponse<
  "/api/v1/organizations/invites/{inviteId}",
  "delete"
>;
type EventAnalyticsQuery = OperationQuery<
  "/api/v1/events/{eventId}/analytics",
  "get"
>;

/**
 * Whitelisted organization-member shape. GET /organizations/members used to
 * leak `passwordHash`/`invitationToken`/`tokenExpiresAt` (fixed server-side at
 * the query level); this mapper keeps the client boundary safe regardless —
 * raw member rows must NEVER reach UI code.
 */
export interface SafeWorkspaceMember {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  position: string | null;
  avatarUrl: string | null;
  status: string | null;
  roleId: string | null;
  roleName: string | null;
  createdAt: string | null;
}

/** Roles catalog row (GET /organizations/roles — response untyped in the
 *  generated contract; shape verified against roles.controller.ts). */
export interface WorkspaceRoleSummary {
  id: string;
  name: string;
  isSystem?: boolean;
}

// Организаторская лента уведомлений (BL-13): контракт /api/v1/notifications
// теперь входит в поверхность workspace — мобильный инбокс переезжает с сырого
// apiTransport на эти методы (CONTRACT_DIFF §7.3).
type NotificationsQuery = OperationQuery<"/api/v1/notifications", "get">;
type NotificationsListResponse = OperationSuccessResponse<
  "/api/v1/notifications",
  "get"
>;
type NotificationsUnreadCountResponse = OperationSuccessResponse<
  "/api/v1/notifications/unread-count",
  "get"
>;
type MarkNotificationsReadBody = OperationRequestBody<
  "/api/v1/notifications/read",
  "patch"
>;
type MarkNotificationsReadResponse = OperationSuccessResponse<
  "/api/v1/notifications/read",
  "patch"
>;

function pickString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

/** Explicit field whitelist — anything not listed here is dropped. */
export function sanitizeMember(raw: unknown): SafeWorkspaceMember {
  const row = (raw ?? {}) as Record<string, unknown>;
  const role = (row.role ?? null) as Record<string, unknown> | null;
  return {
    id: pickString(row.id) ?? "",
    email: pickString(row.email),
    firstName: pickString(row.firstName),
    lastName: pickString(row.lastName),
    position: pickString(row.position),
    avatarUrl: pickString(row.avatarUrl),
    status: pickString(row.status),
    roleId: pickString(row.roleId),
    roleName: role ? pickString(role.name) : null,
    createdAt: pickString(row.createdAt),
  };
}

export function createWorkspaceSdk(transport: ApiTransport) {
  return {
    auth: {
      loginOrganization: (body: OrganizationLoginBody) =>
        transport<OrganizationLoginResponse, OrganizationLoginBody>({
          method: "POST",
          url: "/api/v1/auth/organization/login",
          data: body,
          skipAuth: true,
        }),
      loginMember: (body: MemberLoginBody) =>
        transport<MemberLoginResponse, MemberLoginBody>({
          method: "POST",
          url: "/api/v1/auth/member/login",
          data: body,
          skipAuth: true,
        }),
      loginSuperAdmin: (body: SuperAdminLoginBody) =>
        transport<OrganizationLoginResponse, SuperAdminLoginBody>({
          method: "POST",
          url: "/api/v1/auth/superadmin/login",
          data: body,
          skipAuth: true,
        }),
      refresh: (body: RefreshBody) =>
        transport<RefreshResponse, RefreshBody>({
          method: "POST",
          url: "/api/v1/auth/refresh",
          data: body,
          skipAuth: true,
        }),
      logout: (body?: LogoutBody) =>
        transport<void, LogoutBody | undefined>({
          method: "POST",
          url: "/api/v1/auth/logout",
          data: body,
        }),
      getOrganizationMe: () =>
        transport<WorkspaceProfileResponse>({
          method: "GET",
          url: "/api/v1/workspace/me",
        }),
      updateOrganizationProfile: (body: UpdateOrganizationBody) =>
        transport<WorkspaceProfileResponse, UpdateOrganizationBody>({
          method: "PATCH",
          url: "/api/v1/workspace/me",
          data: body,
        }),
      changePassword: (body: ChangePasswordBody) =>
        transport<{ message: string }, ChangePasswordBody>({
          method: "PATCH",
          url: "/api/v1/auth/change-password",
          data: body,
        }),
      getSessions: (refreshToken?: string) =>
        transport<SessionsListResponse>({
          method: "GET",
          url: "/api/v1/auth/sessions",
          headers: refreshToken
            ? { "x-refresh-token": refreshToken }
            : undefined,
        }),
      terminateSession: (id: string) =>
        transport<{ message: string }>({
          method: "DELETE",
          url: `/api/v1/auth/sessions/${id}`,
        }),
      terminateOtherSessions: (refreshToken: string) =>
        transport<{ message: string; terminatedCount: number }>({
          method: "DELETE",
          url: "/api/v1/auth/sessions",
          headers: { "x-refresh-token": refreshToken },
        }),
      uploadOrganizationLogo: (file: File) => {
        const data = new FormData();
        data.append("logo", file);
        return transport<WorkspaceProfileResponse, FormData>({
          method: "POST",
          url: "/api/v1/workspace/me/logo",
          data,
        });
      },
      deleteOrganizationLogo: () =>
        transport<WorkspaceProfileResponse>({
          method: "DELETE",
          url: "/api/v1/workspace/me/logo",
        }),
      deleteAccount: () =>
        transport<void>({
          method: "DELETE",
          url: "/api/v1/workspace/me",
        }),
      completeOnboarding: () =>
        transport<WorkspaceProfileResponse>({
          method: "POST",
          url: "/api/v1/workspace/me/complete-onboarding",
        }),
      completeCompanyInfo: () =>
        transport<WorkspaceProfileResponse>({
          method: "POST",
          url: "/api/v1/workspace/me/complete-company-info",
        }),
    },
    session: {
      getMe: () =>
        transport<SessionMeResponse>({
          method: "GET",
          url: "/api/v1/session/me",
        }),
      getScopes: () =>
        transport<SessionV2Response>({
          method: "GET",
          url: "/api/v2/session/me",
        }),
      getContext: (scope: EventFlowScope) =>
        transport<ScopeContextV2Response>({
          method: "GET",
          url: "/api/v2/session/context",
          headers: { "X-EventFlow-Scope": scope },
        }),
    },
    members: {
      getMe: () =>
        transport<MemberProfileResponse>({
          method: "GET",
          url: "/api/v1/workspace/members/me",
        }),
      updateProfile: (body: UpdateMemberProfileBody) =>
        transport<MemberProfileResponse, UpdateMemberProfileBody>({
          method: "PATCH",
          url: "/api/v1/workspace/members/me",
          data: body,
        }),
      updatePrivacy: (body: UpdateMemberPrivacyBody) =>
        transport<MemberProfileResponse, UpdateMemberPrivacyBody>({
          method: "PATCH",
          url: "/api/v1/workspace/members/me/privacy",
          data: body,
        }),
      uploadAvatar: (file: File) => {
        const data = new FormData();
        data.append("avatar", file);
        return transport<MemberProfileResponse, FormData>({
          method: "POST",
          url: "/api/v1/workspace/members/me/avatar",
          data,
        });
      },
      deleteAvatar: () =>
        transport<MemberProfileResponse>({
          method: "DELETE",
          url: "/api/v1/workspace/members/me/avatar",
        }),
      completeOnboarding: () =>
        transport<MemberProfileResponse>({
          method: "POST",
          url: "/api/v1/workspace/members/me/complete-onboarding",
        }),
      getPermissions: () =>
        transport<MemberPermissionsResponse>({
          method: "GET",
          url: "/api/v1/workspace/members/me/permissions",
        }),
    },
    events: {
      getEvents: (query?: EventsListQuery) =>
        transport<EventsListResponse>({
          method: "GET",
          url: "/api/v1/events",
          params: query as Record<string, unknown> | undefined,
        }),
      getEvent: (id: string) =>
        transport<EventResponse>({
          method: "GET",
          url: `/api/v1/events/${id}`,
        }),
      createEvent: (body: CreateEventBody | FormData) =>
        transport<CreateEventResponse, CreateEventBody | FormData>({
          method: "POST",
          url: "/api/v1/events",
          data: body,
        }),
      updateEvent: (id: string, body: UpdateEventBody | FormData) =>
        transport<UpdateEventResponse, UpdateEventBody | FormData>({
          method: "PATCH",
          url: `/api/v1/events/${id}`,
          data: body,
        }),
      deleteEvent: (id: string) =>
        transport<void>({
          method: "DELETE",
          url: `/api/v1/events/${id}`,
        }),
      submitForReview: (id: string) =>
        transport<EventResponse>({
          method: "POST",
          url: `/api/v1/events/${id}/submit-review`,
        }),
      cancelEvent: (id: string) =>
        transport<EventResponse>({
          method: "POST",
          url: `/api/v1/events/${id}/cancel`,
        }),
      completeEvent: (id: string) =>
        transport<EventResponse>({
          method: "POST",
          url: `/api/v1/events/${id}/complete`,
        }),
      regenerateInviteCode: (id: string) =>
        transport<{ inviteCode: string }>({
          method: "POST",
          url: `/api/v1/events/${id}/regenerate-invite-code`,
        }),
      getInviteLink: (id: string) =>
        transport<{ inviteLink: string; inviteCode: string }>({
          method: "GET",
          url: `/api/v1/events/${id}/invite-link`,
        }),
      sendInvitation: (id: string, body: { email: string }) =>
        transport<{ message: string }, { email: string }>({
          method: "POST",
          url: `/api/v1/events/${id}/send-invitation`,
          data: body,
        }),
      getAttendance: (eventId: string, query?: AttendanceQuery) =>
        transport<AttendanceResponse>({
          method: "GET",
          url: `/api/v1/events/${eventId}/attendance`,
          params: query as Record<string, unknown> | undefined,
        }),
      suggestSlug: (query: { title: string; excludeId?: string }) =>
        transport<{ slug: string }>({
          method: "GET",
          url: "/api/v1/events/suggest-slug",
          params: query,
        }),
      checkSlug: (query: { slug: string; excludeId?: string }) =>
        transport<{ available: boolean }>({
          method: "GET",
          url: "/api/v1/events/check-slug",
          params: query,
        }),
      getEventBySlug: (slug: string) =>
        transport<PublicEventBySlugResponse>({
          method: "GET",
          url: `/api/v1/events/by-slug/${encodeURIComponent(slug)}`,
          skipAuth: true,
        }),
      canRegister: (id: string) =>
        transport<CanRegisterResponse>({
          method: "GET",
          url: `/api/v1/public/events/${id}/can-register`,
          skipAuth: true,
        }),
      getArtifactRecipients: (
        eventId: string,
        query?: ArtifactRecipientsQuery,
      ) =>
        transport<ArtifactRecipientsResponse>({
          method: "GET",
          url: `/api/v1/events/${eventId}/artifact-recipients`,
          params: query as Record<string, unknown> | undefined,
        }),
      createArtifactRecipient: (
        eventId: string,
        body: CreateArtifactRecipientBody,
      ) =>
        transport<CreateArtifactRecipientResponse, CreateArtifactRecipientBody>(
          {
            method: "POST",
            url: `/api/v1/events/${eventId}/artifact-recipients`,
            data: body,
          },
        ),
      batchCreateArtifactRecipients: (
        eventId: string,
        body: BatchCreateArtifactRecipientsBody,
      ) =>
        transport<
          BatchCreateArtifactRecipientsResponse,
          BatchCreateArtifactRecipientsBody
        >({
          method: "POST",
          url: `/api/v1/events/${eventId}/artifact-recipients/batch`,
          data: body,
        }),
      updateArtifactRecipient: (
        eventId: string,
        recipientId: string,
        body: UpdateArtifactRecipientBody,
      ) =>
        transport<ArtifactRecipientResponse, UpdateArtifactRecipientBody>({
          method: "PATCH",
          url: `/api/v1/events/${eventId}/artifact-recipients/${recipientId}`,
          data: body,
        }),
      assignArtifactRecipientRole: (
        eventId: string,
        recipientId: string,
        body: AssignArtifactRecipientRoleBody,
      ) =>
        transport<
          ArtifactRecipientRoleAssignmentResponse,
          AssignArtifactRecipientRoleBody
        >({
          method: "POST",
          url: `/api/v1/events/${eventId}/artifact-recipients/${recipientId}/roles`,
          data: body,
        }),
      deactivateArtifactRecipientRole: (
        eventId: string,
        recipientId: string,
        roleId: string,
      ) =>
        transport<DeactivateArtifactRecipientRoleResponse>({
          method: "DELETE",
          url: `/api/v1/events/${eventId}/artifact-recipients/${recipientId}/roles/${roleId}`,
        }),
      getArtifactTemplateSummary: (
        eventId: string,
        query?: ArtifactTemplateSummaryQuery,
      ) =>
        transport<ArtifactTemplateSummaryResponse>({
          method: "GET",
          url: `/api/v1/events/${eventId}/artifacts/template-summary`,
          params: query as Record<string, unknown> | undefined,
        }),
      getArtifactBulkPreview: (
        eventId: string,
        body: ArtifactBulkPreviewBody,
      ) =>
        transport<ArtifactBulkPreviewResponse, ArtifactBulkPreviewBody>({
          method: "POST",
          url: `/api/v1/events/${eventId}/artifacts/bulk-preview`,
          data: body,
        }),
      getRecipientRoles: (eventId: string) =>
        transport<RecipientRolesResponse>({
          method: "GET",
          url: `/api/v1/events/${eventId}/recipient-roles`,
        }),
      createRecipientRole: (eventId: string, body: CreateRecipientRoleBody) =>
        transport<RecipientRoleResponse, CreateRecipientRoleBody>({
          method: "POST",
          url: `/api/v1/events/${eventId}/recipient-roles`,
          data: body,
        }),
      updateRecipientRole: (
        eventId: string,
        roleId: string,
        body: UpdateRecipientRoleBody,
      ) =>
        transport<RecipientRoleResponse, UpdateRecipientRoleBody>({
          method: "PATCH",
          url: `/api/v1/events/${eventId}/recipient-roles/${roleId}`,
          data: body,
        }),
      deactivateRecipientRole: (eventId: string, roleId: string) =>
        transport<RecipientRoleResponse>({
          method: "POST",
          url: `/api/v1/events/${eventId}/recipient-roles/${roleId}/deactivate`,
        }),
      activateRecipientRole: (eventId: string, roleId: string) =>
        transport<RecipientRoleResponse>({
          method: "POST",
          url: `/api/v1/events/${eventId}/recipient-roles/${roleId}/activate`,
        }),
      getRecipientRoleDeletePreview: (eventId: string, roleId: string) =>
        transport<RecipientRoleDeletePreviewResponse>({
          method: "GET",
          url: `/api/v1/events/${eventId}/recipient-roles/${roleId}/delete-preview`,
        }),
      /** Aggregated, PII-free registration analytics (EVENTS_READ). The
       *  generated contract carries no response schema — callers narrow. */
      getAnalytics: (eventId: string, query?: EventAnalyticsQuery) =>
        transport<unknown>({
          method: "GET",
          url: `/api/v1/events/${eventId}/analytics`,
          params: query as Record<string, unknown> | undefined,
        }),
    },
    registrations: {
      getRegistrations: (eventId: string, query?: RegistrationsListQuery) =>
        transport<RegistrationsListResponse>({
          method: "GET",
          url: `/api/v1/events/${eventId}/registrations`,
          params: query as Record<string, unknown> | undefined,
        }),
      getRegistration: (eventId: string, id: string) =>
        transport<RegistrationResponse>({
          method: "GET",
          url: `/api/v1/events/${eventId}/registrations/${id}`,
        }),
      approveRegistration: (eventId: string, id: string) =>
        transport<RegistrationResponse>({
          method: "PATCH",
          url: `/api/v1/events/${eventId}/registrations/${id}/approve`,
        }),
      rejectRegistration: (
        eventId: string,
        id: string,
        body: RejectRegistrationBody,
      ) =>
        transport<RegistrationResponse, RejectRegistrationBody>({
          method: "PATCH",
          url: `/api/v1/events/${eventId}/registrations/${id}/reject`,
          data: body,
        }),
      cancelRegistration: (
        eventId: string,
        id: string,
        body: RejectRegistrationBody,
      ) =>
        transport<RegistrationResponse, RejectRegistrationBody>({
          method: "PATCH",
          url: `/api/v1/events/${eventId}/registrations/${id}/cancel`,
          data: body,
        }),
      revokeApproval: (
        eventId: string,
        id: string,
        body: RejectRegistrationBody,
      ) =>
        transport<RegistrationResponse, RejectRegistrationBody>({
          method: "PATCH",
          url: `/api/v1/events/${eventId}/registrations/${id}/revoke`,
          data: body,
        }),
      bulkApprove: (eventId: string, ids: string[]) =>
        transport<{ approved: number }, { ids: string[] }>({
          method: "POST",
          url: `/api/v1/events/${eventId}/registrations/bulk-approve`,
          data: { ids },
        }),
      bulkReject: (eventId: string, ids: string[], reason?: string) =>
        transport<{ rejected: number }, { ids: string[]; reason?: string }>({
          method: "POST",
          url: `/api/v1/events/${eventId}/registrations/bulk-reject`,
          data: { ids, reason },
        }),
    },
    certificates: {
      getTemplates: (eventId: string) =>
        transport<TemplatesResponse>({
          method: "GET",
          url: `/api/v1/events/${eventId}/certificates/templates`,
        }),
      createTemplate: (eventId: string, body: FormData) =>
        transport<unknown, FormData>({
          method: "POST",
          url: `/api/v1/events/${eventId}/certificates/templates`,
          data: body,
        }),
      updateTemplate: (eventId: string, templateId: string, body: FormData) =>
        transport<unknown, FormData>({
          method: "PATCH",
          url: `/api/v1/events/${eventId}/certificates/templates/${templateId}`,
          data: body,
        }),
      deleteTemplate: (eventId: string, templateId: string) =>
        transport<void>({
          method: "DELETE",
          url: `/api/v1/events/${eventId}/certificates/templates/${templateId}`,
        }),
      getCertificates: (eventId: string, query?: EventCertificatesQuery) =>
        transport<EventCertificatesResponse>({
          method: "GET",
          url: `/api/v1/events/${eventId}/certificates`,
          params: query as Record<string, unknown> | undefined,
        }),
      generateCertificates: (eventId: string, body: GenerateCertificatesBody) =>
        transport<GenerateCertificatesResponse, GenerateCertificatesBody>({
          method: "POST",
          url: `/api/v1/events/${eventId}/certificates/generate`,
          data: body,
        }),
      downloadCertificate: (eventId: string, certificateId: string) =>
        transport<unknown>({
          method: "GET",
          url: `/api/v1/events/${eventId}/certificates/${certificateId}/download`,
          responseType: "blob",
        }),
      verifyCertificate: (body: { code?: string; certificateId?: string }) =>
        transport<unknown, { code?: string; certificateId?: string }>({
          method: "POST",
          url: "/api/v1/certificates/verify",
          data: body,
          skipAuth: true,
        }),
    },
    translations: {
      translateBatch: (body: TranslateBatchBody) =>
        transport<TranslateBatchResponse, TranslateBatchBody>({
          method: "POST",
          url: "/api/v1/translations/batch",
          data: body,
        }),
    },
    billing: {
      /** Каталог тарифов для кабинета (M-1, billing:view). Деньги — строки. */
      getPlans: () =>
        transport<WorkspacePlansResponse>({
          method: "GET",
          url: "/api/v1/billing/plans",
        }),
      /** Статус тарифа: живой пакет + снапшоты (M-3). */
      getStatus: () =>
        transport<WorkspaceBillingStatusResponse>({
          method: "GET",
          url: "/api/v1/billing/status",
        }),
      /** Эффективные энтайтлменты + счётчики окон (E-14, display-only). */
      getEntitlements: () =>
        transport<WorkspaceEntitlementsResponse>({
          method: "GET",
          url: "/api/v1/billing/entitlements",
        }),
      /** Заявка managed-фазы: тариф/монеты/реклама (M-13, billing:manage). */
      createRequest: (body: CreateBillingRequestBody) =>
        transport<CreateBillingRequestResponse, CreateBillingRequestBody>({
          method: "POST",
          url: "/api/v1/billing/requests",
          data: body,
        }),
      /** История биллинг-заказов организации (C-5/C-8). */
      listRequests: () =>
        transport<BillingRequestsResponse>({
          method: "GET",
          url: "/api/v1/billing/requests",
        }),
      /** Кошелёк монет: балансы + история (C-6; AI — в секундах, делить на 60). */
      getWallet: () =>
        transport<BillingWalletResponse>({
          method: "GET",
          url: "/api/v1/billing/wallet",
        }),
    },
    // ── W6 additions (mobile organizer surface) — append-only ────────────────
    dashboard: {
      /** GET /organizations/dashboard/stats — NB: the `tickets` block counts
       *  KANBAN TASKS, not event tickets; `period`/activity `timeAgo` strings
       *  arrive pre-formatted in Russian — re-format client-side. */
      getStats: () =>
        transport<DashboardStatsResponse>({
          method: "GET",
          url: "/api/v1/organizations/dashboard/stats",
        }),
      /** Team activity over the last 24h. Rebuild copy from `type` +
       *  `entityName` + `createdAt`; `description`/`timeAgo` are Russian. */
      getActivity: (query?: DashboardActivityQuery) =>
        transport<DashboardActivityResponse>({
          method: "GET",
          url: "/api/v1/organizations/dashboard/activity",
          params: query as Record<string, unknown> | undefined,
        }),
    },
    team: {
      /** Organization members — ALWAYS sanitized through the field whitelist
       *  (`sanitizeMember`); the raw row must never reach a screen. */
      getMembers: async (): Promise<SafeWorkspaceMember[]> => {
        const raw = await transport<unknown>({
          method: "GET",
          url: "/api/v1/organizations/members",
        });
        return Array.isArray(raw) ? raw.map(sanitizeMember) : [];
      },
    },
    invites: {
      list: (query?: { status?: string }) =>
        transport<InvitesListResponse>({
          method: "GET",
          url: "/api/v1/organizations/invites",
          params: query as Record<string, unknown> | undefined,
        }),
      create: (body: CreateInviteBody) =>
        transport<CreateInviteResponse, CreateInviteBody>({
          method: "POST",
          url: "/api/v1/organizations/invites",
          data: body,
        }),
      resend: (inviteId: string) =>
        transport<ResendInviteResponse>({
          method: "POST",
          url: `/api/v1/organizations/invites/${inviteId}/resend`,
        }),
      revoke: (inviteId: string) =>
        transport<RevokeInviteResponse>({
          method: "DELETE",
          url: `/api/v1/organizations/invites/${inviteId}`,
        }),
    },
    roles: {
      list: () =>
        transport<WorkspaceRoleSummary[]>({
          method: "GET",
          url: "/api/v1/organizations/roles",
        }),
    },
    notifications: {
      list: (query?: NotificationsQuery) =>
        transport<NotificationsListResponse>({
          method: "GET",
          url: "/api/v1/notifications",
          params: query as Record<string, unknown> | undefined,
        }),
      unreadCount: () =>
        transport<NotificationsUnreadCountResponse>({
          method: "GET",
          url: "/api/v1/notifications/unread-count",
        }),
      /** Без списка ids отмечает прочитанной всю ленту организации. */
      markRead: (body?: MarkNotificationsReadBody) =>
        transport<MarkNotificationsReadResponse, MarkNotificationsReadBody>({
          method: "PATCH",
          url: "/api/v1/notifications/read",
          data: body ?? {},
        }),
    },
  };
}
