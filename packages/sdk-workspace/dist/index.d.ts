import type { ApiTransport, OperationQuery, OperationRequestBody } from "@eventflow/api-contracts";
type OrganizationLoginBody = OperationRequestBody<"/api/v1/auth/organization/login", "post">;
type MemberLoginBody = OperationRequestBody<"/api/v1/auth/member/login", "post">;
type CreateBillingRequestBody = OperationRequestBody<"/api/v1/billing/requests", "post">;
type SuperAdminLoginBody = OperationRequestBody<"/api/v1/auth/superadmin/login", "post">;
type RefreshBody = OperationRequestBody<"/api/v1/auth/refresh", "post">;
type LogoutBody = OperationRequestBody<"/api/v1/auth/logout", "post">;
export type EventFlowScope = "personal" | `organization:${string}`;
type UpdateOrganizationBody = OperationRequestBody<"/api/v1/workspace/me", "patch">;
type UpdateMemberProfileBody = OperationRequestBody<"/api/v1/workspace/members/me", "patch">;
type UpdateMemberPrivacyBody = OperationRequestBody<"/api/v1/workspace/members/me/privacy", "patch">;
type ChangePasswordBody = OperationRequestBody<"/api/v1/auth/change-password", "patch">;
type EventsListQuery = OperationQuery<"/api/v1/events", "get">;
type CreateEventBody = OperationRequestBody<"/api/v1/events", "post">;
type UpdateEventBody = OperationRequestBody<"/api/v1/events/{id}", "patch">;
type RegistrationsListQuery = OperationQuery<"/api/v1/events/{eventId}/registrations", "get">;
type RejectRegistrationBody = OperationRequestBody<"/api/v1/events/{eventId}/registrations/{id}/reject", "patch">;
type EventCertificatesQuery = OperationQuery<"/api/v1/events/{eventId}/certificates", "get">;
type GenerateCertificatesBody = OperationRequestBody<"/api/v1/events/{eventId}/certificates/generate", "post">;
type ArtifactRecipientsQuery = OperationQuery<"/api/v1/events/{eventId}/artifact-recipients", "get">;
type CreateArtifactRecipientBody = OperationRequestBody<"/api/v1/events/{eventId}/artifact-recipients", "post">;
type BatchCreateArtifactRecipientsBody = OperationRequestBody<"/api/v1/events/{eventId}/artifact-recipients/batch", "post">;
type UpdateArtifactRecipientBody = OperationRequestBody<"/api/v1/events/{eventId}/artifact-recipients/{recipientId}", "patch">;
type AssignArtifactRecipientRoleBody = OperationRequestBody<"/api/v1/events/{eventId}/artifact-recipients/{recipientId}/roles", "post">;
type ArtifactTemplateSummaryQuery = OperationQuery<"/api/v1/events/{eventId}/artifacts/template-summary", "get">;
type ArtifactBulkPreviewBody = OperationRequestBody<"/api/v1/events/{eventId}/artifacts/bulk-preview", "post">;
type CreateRecipientRoleBody = OperationRequestBody<"/api/v1/events/{eventId}/recipient-roles", "post">;
type UpdateRecipientRoleBody = OperationRequestBody<"/api/v1/events/{eventId}/recipient-roles/{roleId}", "patch">;
type AttendanceQuery = OperationQuery<"/api/v1/events/{eventId}/attendance", "get">;
type TranslateBatchBody = OperationRequestBody<"/api/v1/translations/batch", "post">;
type DashboardActivityQuery = OperationQuery<"/api/v1/organizations/dashboard/activity", "get">;
type CreateInviteBody = OperationRequestBody<"/api/v1/organizations/invites", "post">;
type EventAnalyticsQuery = OperationQuery<"/api/v1/events/{eventId}/analytics", "get">;
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
type NotificationsQuery = OperationQuery<"/api/v1/notifications", "get">;
type MarkNotificationsReadBody = OperationRequestBody<"/api/v1/notifications/read", "patch">;
/** Explicit field whitelist — anything not listed here is dropped. */
export declare function sanitizeMember(raw: unknown): SafeWorkspaceMember;
export declare function createWorkspaceSdk(transport: ApiTransport): {
    auth: {
        loginOrganization: (body: OrganizationLoginBody) => Promise<{
            accessToken: string;
            refreshToken: string;
            isNewUser?: boolean;
            isOnboardingCompleted?: boolean;
            emailVerificationRequired?: boolean;
        }>;
        loginMember: (body: MemberLoginBody) => Promise<{
            accessToken: string;
            refreshToken: string;
            isNewUser?: boolean;
            isOnboardingCompleted?: boolean;
            emailVerificationRequired?: boolean;
        }>;
        loginSuperAdmin: (body: SuperAdminLoginBody) => Promise<{
            accessToken: string;
            refreshToken: string;
            isNewUser?: boolean;
            isOnboardingCompleted?: boolean;
            emailVerificationRequired?: boolean;
        }>;
        refresh: (body: RefreshBody) => Promise<{
            accessToken: string;
            refreshToken: string;
            isNewUser?: boolean;
            isOnboardingCompleted?: boolean;
            emailVerificationRequired?: boolean;
        }>;
        logout: (body?: LogoutBody) => Promise<void>;
        getOrganizationMe: () => Promise<{
            id: string;
            organizationName: string;
            email: string;
            inn?: Record<string, never>;
            description?: Record<string, never>;
            translations?: {
                [key: string]: {
                    [key: string]: string;
                };
            };
            translationMeta?: {
                [key: string]: {
                    [key: string]: {
                        [key: string]: unknown;
                    };
                };
            };
            phone?: Record<string, never>;
            address?: Record<string, never>;
            website?: Record<string, never>;
            logoUrl?: Record<string, never>;
            authProvider: import("@eventflow/api-contracts").OrganizationEntityAuthProvider;
            isEmailVerified: boolean;
            isOnboardingCompleted: boolean;
            industry?: Record<string, never>;
            companySize?: Record<string, never>;
            companyInfoCompleted: boolean;
            placesFeatureEnabled: boolean;
            needsCompanyInfo: boolean;
            verificationStatus: import("@eventflow/api-contracts").OrganizationEntityVerificationStatus;
            rejectionReason?: Record<string, never>;
            verifiedAt?: Record<string, never>;
            createdAt: string;
            updatedAt: string;
        }>;
        updateOrganizationProfile: (body: UpdateOrganizationBody) => Promise<{
            id: string;
            organizationName: string;
            email: string;
            inn?: Record<string, never>;
            description?: Record<string, never>;
            translations?: {
                [key: string]: {
                    [key: string]: string;
                };
            };
            translationMeta?: {
                [key: string]: {
                    [key: string]: {
                        [key: string]: unknown;
                    };
                };
            };
            phone?: Record<string, never>;
            address?: Record<string, never>;
            website?: Record<string, never>;
            logoUrl?: Record<string, never>;
            authProvider: import("@eventflow/api-contracts").OrganizationEntityAuthProvider;
            isEmailVerified: boolean;
            isOnboardingCompleted: boolean;
            industry?: Record<string, never>;
            companySize?: Record<string, never>;
            companyInfoCompleted: boolean;
            placesFeatureEnabled: boolean;
            needsCompanyInfo: boolean;
            verificationStatus: import("@eventflow/api-contracts").OrganizationEntityVerificationStatus;
            rejectionReason?: Record<string, never>;
            verifiedAt?: Record<string, never>;
            createdAt: string;
            updatedAt: string;
        }>;
        changePassword: (body: ChangePasswordBody) => Promise<{
            message: string;
        }>;
        getSessions: (refreshToken?: string) => Promise<{
            id: string;
            userAgent: Record<string, never>;
            ipAddress: Record<string, never>;
            lastUsedAt: string;
            createdAt: string;
            expiresAt: string;
            isCurrent: boolean;
        }[]>;
        terminateSession: (id: string) => Promise<{
            message: string;
        }>;
        terminateOtherSessions: (refreshToken: string) => Promise<{
            message: string;
            terminatedCount: number;
        }>;
        uploadOrganizationLogo: (file: File) => Promise<{
            id: string;
            organizationName: string;
            email: string;
            inn?: Record<string, never>;
            description?: Record<string, never>;
            translations?: {
                [key: string]: {
                    [key: string]: string;
                };
            };
            translationMeta?: {
                [key: string]: {
                    [key: string]: {
                        [key: string]: unknown;
                    };
                };
            };
            phone?: Record<string, never>;
            address?: Record<string, never>;
            website?: Record<string, never>;
            logoUrl?: Record<string, never>;
            authProvider: import("@eventflow/api-contracts").OrganizationEntityAuthProvider;
            isEmailVerified: boolean;
            isOnboardingCompleted: boolean;
            industry?: Record<string, never>;
            companySize?: Record<string, never>;
            companyInfoCompleted: boolean;
            placesFeatureEnabled: boolean;
            needsCompanyInfo: boolean;
            verificationStatus: import("@eventflow/api-contracts").OrganizationEntityVerificationStatus;
            rejectionReason?: Record<string, never>;
            verifiedAt?: Record<string, never>;
            createdAt: string;
            updatedAt: string;
        }>;
        deleteOrganizationLogo: () => Promise<{
            id: string;
            organizationName: string;
            email: string;
            inn?: Record<string, never>;
            description?: Record<string, never>;
            translations?: {
                [key: string]: {
                    [key: string]: string;
                };
            };
            translationMeta?: {
                [key: string]: {
                    [key: string]: {
                        [key: string]: unknown;
                    };
                };
            };
            phone?: Record<string, never>;
            address?: Record<string, never>;
            website?: Record<string, never>;
            logoUrl?: Record<string, never>;
            authProvider: import("@eventflow/api-contracts").OrganizationEntityAuthProvider;
            isEmailVerified: boolean;
            isOnboardingCompleted: boolean;
            industry?: Record<string, never>;
            companySize?: Record<string, never>;
            companyInfoCompleted: boolean;
            placesFeatureEnabled: boolean;
            needsCompanyInfo: boolean;
            verificationStatus: import("@eventflow/api-contracts").OrganizationEntityVerificationStatus;
            rejectionReason?: Record<string, never>;
            verifiedAt?: Record<string, never>;
            createdAt: string;
            updatedAt: string;
        }>;
        deleteAccount: () => Promise<void>;
        completeOnboarding: () => Promise<{
            id: string;
            organizationName: string;
            email: string;
            inn?: Record<string, never>;
            description?: Record<string, never>;
            translations?: {
                [key: string]: {
                    [key: string]: string;
                };
            };
            translationMeta?: {
                [key: string]: {
                    [key: string]: {
                        [key: string]: unknown;
                    };
                };
            };
            phone?: Record<string, never>;
            address?: Record<string, never>;
            website?: Record<string, never>;
            logoUrl?: Record<string, never>;
            authProvider: import("@eventflow/api-contracts").OrganizationEntityAuthProvider;
            isEmailVerified: boolean;
            isOnboardingCompleted: boolean;
            industry?: Record<string, never>;
            companySize?: Record<string, never>;
            companyInfoCompleted: boolean;
            placesFeatureEnabled: boolean;
            needsCompanyInfo: boolean;
            verificationStatus: import("@eventflow/api-contracts").OrganizationEntityVerificationStatus;
            rejectionReason?: Record<string, never>;
            verifiedAt?: Record<string, never>;
            createdAt: string;
            updatedAt: string;
        }>;
        completeCompanyInfo: () => Promise<{
            id: string;
            organizationName: string;
            email: string;
            inn?: Record<string, never>;
            description?: Record<string, never>;
            translations?: {
                [key: string]: {
                    [key: string]: string;
                };
            };
            translationMeta?: {
                [key: string]: {
                    [key: string]: {
                        [key: string]: unknown;
                    };
                };
            };
            phone?: Record<string, never>;
            address?: Record<string, never>;
            website?: Record<string, never>;
            logoUrl?: Record<string, never>;
            authProvider: import("@eventflow/api-contracts").OrganizationEntityAuthProvider;
            isEmailVerified: boolean;
            isOnboardingCompleted: boolean;
            industry?: Record<string, never>;
            companySize?: Record<string, never>;
            companyInfoCompleted: boolean;
            placesFeatureEnabled: boolean;
            needsCompanyInfo: boolean;
            verificationStatus: import("@eventflow/api-contracts").OrganizationEntityVerificationStatus;
            rejectionReason?: Record<string, never>;
            verifiedAt?: Record<string, never>;
            createdAt: string;
            updatedAt: string;
        }>;
    };
    session: {
        getMe: () => Promise<{
            currentAccount: import("@eventflow/api-contracts").components["schemas"]["SessionAccountDto"];
            activeWorkspace?: import("@eventflow/api-contracts").components["schemas"]["SessionWorkspaceDto"] | null;
            memberships: import("@eventflow/api-contracts").components["schemas"]["SessionMembershipDto"][];
            platformRole?: import("@eventflow/api-contracts").SessionMeResponseDtoPlatformRole;
            actorType: import("@eventflow/api-contracts").SessionMeResponseDtoActorType;
            accessDeniedPermissions: string[];
        }>;
        getScopes: () => Promise<{
            account: import("@eventflow/api-contracts").components["schemas"]["SessionV2AccountDto"];
            personalScope: import("@eventflow/api-contracts").components["schemas"]["PersonalScopeV2Dto"];
            organizationScopes: import("@eventflow/api-contracts").components["schemas"]["OrganizationScopeV2Dto"][];
        }>;
        getContext: (scope: EventFlowScope) => Promise<{
            kind: import("@eventflow/api-contracts").ResolvedScopeV2ResponseDtoKind;
            accountId: string;
            userId: string | null;
            organizationId: string | null;
            membershipId: string | null;
            capabilities: string[];
        }>;
    };
    members: {
        getMe: () => Promise<{
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            phone?: string;
            position?: string;
            department?: string;
            avatarUrl?: string;
            bio?: string;
            location?: string;
            status: import("@eventflow/api-contracts").MemberProfileResponseDtoStatus;
            isPublicProfile: boolean;
            showEmail: boolean;
            showPhone: boolean;
            isOnboardingCompleted: boolean;
            role: import("@eventflow/api-contracts").components["schemas"]["MemberRoleDto"];
            organization: import("@eventflow/api-contracts").components["schemas"]["MemberOrganizationDto"];
            permissions: string[];
            createdAt: string;
        }>;
        updateProfile: (body: UpdateMemberProfileBody) => Promise<{
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            phone?: string;
            position?: string;
            department?: string;
            avatarUrl?: string;
            bio?: string;
            location?: string;
            status: import("@eventflow/api-contracts").MemberProfileResponseDtoStatus;
            isPublicProfile: boolean;
            showEmail: boolean;
            showPhone: boolean;
            isOnboardingCompleted: boolean;
            role: import("@eventflow/api-contracts").components["schemas"]["MemberRoleDto"];
            organization: import("@eventflow/api-contracts").components["schemas"]["MemberOrganizationDto"];
            permissions: string[];
            createdAt: string;
        }>;
        updatePrivacy: (body: UpdateMemberPrivacyBody) => Promise<{
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            phone?: string;
            position?: string;
            department?: string;
            avatarUrl?: string;
            bio?: string;
            location?: string;
            status: import("@eventflow/api-contracts").MemberProfileResponseDtoStatus;
            isPublicProfile: boolean;
            showEmail: boolean;
            showPhone: boolean;
            isOnboardingCompleted: boolean;
            role: import("@eventflow/api-contracts").components["schemas"]["MemberRoleDto"];
            organization: import("@eventflow/api-contracts").components["schemas"]["MemberOrganizationDto"];
            permissions: string[];
            createdAt: string;
        }>;
        uploadAvatar: (file: File) => Promise<{
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            phone?: string;
            position?: string;
            department?: string;
            avatarUrl?: string;
            bio?: string;
            location?: string;
            status: import("@eventflow/api-contracts").MemberProfileResponseDtoStatus;
            isPublicProfile: boolean;
            showEmail: boolean;
            showPhone: boolean;
            isOnboardingCompleted: boolean;
            role: import("@eventflow/api-contracts").components["schemas"]["MemberRoleDto"];
            organization: import("@eventflow/api-contracts").components["schemas"]["MemberOrganizationDto"];
            permissions: string[];
            createdAt: string;
        }>;
        deleteAvatar: () => Promise<{
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            phone?: string;
            position?: string;
            department?: string;
            avatarUrl?: string;
            bio?: string;
            location?: string;
            status: import("@eventflow/api-contracts").MemberProfileResponseDtoStatus;
            isPublicProfile: boolean;
            showEmail: boolean;
            showPhone: boolean;
            isOnboardingCompleted: boolean;
            role: import("@eventflow/api-contracts").components["schemas"]["MemberRoleDto"];
            organization: import("@eventflow/api-contracts").components["schemas"]["MemberOrganizationDto"];
            permissions: string[];
            createdAt: string;
        }>;
        completeOnboarding: () => Promise<{
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            phone?: string;
            position?: string;
            department?: string;
            avatarUrl?: string;
            bio?: string;
            location?: string;
            status: import("@eventflow/api-contracts").MemberProfileResponseDtoStatus;
            isPublicProfile: boolean;
            showEmail: boolean;
            showPhone: boolean;
            isOnboardingCompleted: boolean;
            role: import("@eventflow/api-contracts").components["schemas"]["MemberRoleDto"];
            organization: import("@eventflow/api-contracts").components["schemas"]["MemberOrganizationDto"];
            permissions: string[];
            createdAt: string;
        }>;
        getPermissions: () => Promise<{
            role: import("@eventflow/api-contracts").components["schemas"]["MemberPermissionsRoleDto"];
            rolePermissions: import("@eventflow/api-contracts").components["schemas"]["PermissionCatalogItemDto"][];
            individualPermissions: import("@eventflow/api-contracts").components["schemas"]["PermissionCatalogItemDto"][];
            allPermissions: import("@eventflow/api-contracts").components["schemas"]["PermissionCatalogItemDto"][];
            permissions: string[];
            permissionsByCategory: Record<string, never>;
        }>;
    };
    events: {
        getEvents: (query?: EventsListQuery) => Promise<never>;
        getEvent: (id: string) => Promise<never>;
        createEvent: (body: CreateEventBody | FormData) => Promise<never>;
        updateEvent: (id: string, body: UpdateEventBody | FormData) => Promise<never>;
        deleteEvent: (id: string) => Promise<void>;
        submitForReview: (id: string) => Promise<never>;
        cancelEvent: (id: string) => Promise<never>;
        completeEvent: (id: string) => Promise<never>;
        regenerateInviteCode: (id: string) => Promise<{
            inviteCode: string;
        }>;
        getInviteLink: (id: string) => Promise<{
            inviteLink: string;
            inviteCode: string;
        }>;
        sendInvitation: (id: string, body: {
            email: string;
        }) => Promise<{
            message: string;
        }>;
        getAttendance: (eventId: string, query?: AttendanceQuery) => Promise<never>;
        suggestSlug: (query: {
            title: string;
            excludeId?: string;
        }) => Promise<{
            slug: string;
        }>;
        checkSlug: (query: {
            slug: string;
            excludeId?: string;
        }) => Promise<{
            available: boolean;
        }>;
        getEventBySlug: (slug: string) => Promise<never>;
        canRegister: (id: string) => Promise<{
            canRegister: boolean;
            reason?: string;
            reasonCode?: import("@eventflow/api-contracts").CanRegisterDtoReasonCode;
            accessType: string;
            requiresInviteCode: boolean;
        }>;
        getArtifactRecipients: (eventId: string, query?: ArtifactRecipientsQuery) => Promise<{
            data: import("@eventflow/api-contracts").components["schemas"]["ArtifactRecipientDto"][];
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        }>;
        createArtifactRecipient: (eventId: string, body: CreateArtifactRecipientBody) => Promise<{
            recipient: import("@eventflow/api-contracts").components["schemas"]["ArtifactRecipientDto"];
            created: boolean;
            reused: boolean;
        }>;
        batchCreateArtifactRecipients: (eventId: string, body: BatchCreateArtifactRecipientsBody) => Promise<{
            results: import("@eventflow/api-contracts").components["schemas"]["BatchRecipientResultRowDto"][];
            createdCount: number;
            reusedCount: number;
            failedCount: number;
        }>;
        updateArtifactRecipient: (eventId: string, recipientId: string, body: UpdateArtifactRecipientBody) => Promise<{
            id: string;
            displayName: string;
            firstName: string | null;
            lastName: string | null;
            email: string | null;
            status: import("@eventflow/api-contracts").ArtifactRecipientDtoStatus;
            roles: import("@eventflow/api-contracts").components["schemas"]["ArtifactRecipientRoleDto"][];
            sources: import("@eventflow/api-contracts").components["schemas"]["ArtifactRecipientSourceSummaryDto"];
            createdAt: string;
            updatedAt: string;
        }>;
        assignArtifactRecipientRole: (eventId: string, recipientId: string, body: AssignArtifactRecipientRoleBody) => Promise<{
            recipient: import("@eventflow/api-contracts").components["schemas"]["ArtifactRecipientDto"];
            assignment: import("@eventflow/api-contracts").components["schemas"]["ArtifactRecipientRoleAssignmentSummaryDto"];
        }>;
        deactivateArtifactRecipientRole: (eventId: string, recipientId: string, roleId: string) => Promise<{
            recipient: import("@eventflow/api-contracts").components["schemas"]["ArtifactRecipientDto"];
            assignment: import("@eventflow/api-contracts").components["schemas"]["ArtifactRecipientRoleAssignmentSummaryDto"];
        }>;
        getArtifactTemplateSummary: (eventId: string, query?: ArtifactTemplateSummaryQuery) => Promise<{
            roles: import("@eventflow/api-contracts").components["schemas"]["ArtifactTemplateRoleSummaryDto"][];
        }>;
        getArtifactBulkPreview: (eventId: string, body: ArtifactBulkPreviewBody) => Promise<{
            artifactType: import("@eventflow/api-contracts").ArtifactBulkPreviewResponseDtoArtifactType;
            scope: import("@eventflow/api-contracts").ArtifactBulkPreviewResponseDtoScope;
            recipientCount: number;
            artifactCount: number;
            willGenerateCount: number;
            willRegenerateCount: number;
            willSkipCount: number;
            missingTemplateCount: number;
            blockedCount: number;
            staleCount: number;
            readyCount: number;
            failedCount: number;
            notGeneratedCount: number;
            processingCount: number;
            roles: import("@eventflow/api-contracts").components["schemas"]["ArtifactBulkPreviewRoleDto"][];
            missingTemplates: import("@eventflow/api-contracts").components["schemas"]["ArtifactBulkPreviewMissingTemplateDto"][];
            warnings: import("@eventflow/api-contracts").components["schemas"]["ArtifactBulkPreviewWarningDto"][];
            excludedRecipients: import("@eventflow/api-contracts").components["schemas"]["ArtifactBulkPreviewExcludedRecipientDto"][];
        }>;
        getRecipientRoles: (eventId: string) => Promise<{
            id: string;
            code: string;
            displayName: string;
            kind: import("@eventflow/api-contracts").RecipientRoleDtoKind;
            builtInKey: string | null;
            sortOrder: number;
            isActive: boolean;
            isArtifactEligible: boolean;
            sourceMapping: string | null;
            createdAt: string;
            updatedAt: string;
        }[]>;
        createRecipientRole: (eventId: string, body: CreateRecipientRoleBody) => Promise<{
            id: string;
            code: string;
            displayName: string;
            kind: import("@eventflow/api-contracts").RecipientRoleDtoKind;
            builtInKey: string | null;
            sortOrder: number;
            isActive: boolean;
            isArtifactEligible: boolean;
            sourceMapping: string | null;
            createdAt: string;
            updatedAt: string;
        }>;
        updateRecipientRole: (eventId: string, roleId: string, body: UpdateRecipientRoleBody) => Promise<{
            id: string;
            code: string;
            displayName: string;
            kind: import("@eventflow/api-contracts").RecipientRoleDtoKind;
            builtInKey: string | null;
            sortOrder: number;
            isActive: boolean;
            isArtifactEligible: boolean;
            sourceMapping: string | null;
            createdAt: string;
            updatedAt: string;
        }>;
        deactivateRecipientRole: (eventId: string, roleId: string) => Promise<{
            id: string;
            code: string;
            displayName: string;
            kind: import("@eventflow/api-contracts").RecipientRoleDtoKind;
            builtInKey: string | null;
            sortOrder: number;
            isActive: boolean;
            isArtifactEligible: boolean;
            sourceMapping: string | null;
            createdAt: string;
            updatedAt: string;
        }>;
        activateRecipientRole: (eventId: string, roleId: string) => Promise<{
            id: string;
            code: string;
            displayName: string;
            kind: import("@eventflow/api-contracts").RecipientRoleDtoKind;
            builtInKey: string | null;
            sortOrder: number;
            isActive: boolean;
            isArtifactEligible: boolean;
            sourceMapping: string | null;
            createdAt: string;
            updatedAt: string;
        }>;
        getRecipientRoleDeletePreview: (eventId: string, roleId: string) => Promise<{
            roleId: string;
            code: string;
            displayName: string;
            isBuiltIn: boolean;
            counts: import("@eventflow/api-contracts").components["schemas"]["RecipientRoleDeletePreviewCountsDto"];
            recommendedAction: import("@eventflow/api-contracts").RecipientRoleDeletePreviewDtoRecommendedAction;
            blockingReasons: string[];
        }>;
        /** Aggregated, PII-free registration analytics (EVENTS_READ). The
         *  generated contract carries no response schema — callers narrow. */
        getAnalytics: (eventId: string, query?: EventAnalyticsQuery) => Promise<unknown>;
    };
    registrations: {
        getRegistrations: (eventId: string, query?: RegistrationsListQuery) => Promise<never>;
        getRegistration: (eventId: string, id: string) => Promise<never>;
        approveRegistration: (eventId: string, id: string) => Promise<never>;
        rejectRegistration: (eventId: string, id: string, body: RejectRegistrationBody) => Promise<never>;
        cancelRegistration: (eventId: string, id: string, body: RejectRegistrationBody) => Promise<never>;
        revokeApproval: (eventId: string, id: string, body: RejectRegistrationBody) => Promise<never>;
        bulkApprove: (eventId: string, ids: string[]) => Promise<{
            approved: number;
        }>;
        bulkReject: (eventId: string, ids: string[], reason?: string) => Promise<{
            rejected: number;
        }>;
    };
    certificates: {
        getTemplates: (eventId: string) => Promise<{
            templates: {
                id: string;
                eventId: string;
                name: string;
                recipientRoleId: string | null;
                recipientRole: import("@eventflow/api-contracts").PathsApiV1EventsEventIdCertificatesTemplatesGetResponses200ContentApplicationJsonTemplatesRecipientRole;
                roleCode: string;
                roleDisplayName: string;
                sizePreset: string;
                widthPx: number;
                heightPx: number;
                templateUrl: string;
                thumbnailUrl?: string | null;
                namePosition?: {
                    [key: string]: unknown;
                };
                nameFont?: string | null;
                nameFontSize?: number | null;
                nameColor?: string | null;
                datePosition?: {
                    [key: string]: unknown;
                } | null;
                eventNamePosition?: {
                    [key: string]: unknown;
                } | null;
                firstNamePosition?: {
                    [key: string]: unknown;
                } | null;
                lastNamePosition?: {
                    [key: string]: unknown;
                } | null;
                qrPosition?: {
                    [key: string]: unknown;
                } | null;
                isDefault: boolean;
                isActive: boolean;
                createdAt: string;
                updatedAt: string;
            }[];
        }>;
        createTemplate: (eventId: string, body: FormData) => Promise<unknown>;
        updateTemplate: (eventId: string, templateId: string, body: FormData) => Promise<unknown>;
        deleteTemplate: (eventId: string, templateId: string) => Promise<void>;
        getCertificates: (eventId: string, query?: EventCertificatesQuery) => Promise<never>;
        generateCertificates: (eventId: string, body: GenerateCertificatesBody) => Promise<{
            status: import("@eventflow/api-contracts").PathsApiV1EventsEventIdCertificatesGeneratePostResponses200ContentApplicationJsonStatus;
            generated: number;
            failed: number;
            skipped: number;
            forceRegenerate: boolean;
            errors?: {
                registrationId?: string;
                error?: string;
            }[];
        } | {
            status: import("@eventflow/api-contracts").PathsApiV1EventsEventIdCertificatesGeneratePostResponses202ContentApplicationJsonStatus;
            jobId: string;
            message: string;
            forceRegenerate: boolean;
        }>;
        downloadCertificate: (eventId: string, certificateId: string) => Promise<unknown>;
        verifyCertificate: (body: {
            code?: string;
            certificateId?: string;
        }) => Promise<unknown>;
    };
    translations: {
        translateBatch: (body: TranslateBatchBody) => Promise<{
            results: import("@eventflow/api-contracts").components["schemas"]["TranslationResultDto"][];
            summary: import("@eventflow/api-contracts").components["schemas"]["TranslationSummaryDto"];
        }>;
    };
    billing: {
        /** Каталог тарифов для кабинета (M-1, billing:view). Деньги — строки. */
        getPlans: () => Promise<{
            plans: import("@eventflow/api-contracts").components["schemas"]["PlanDto"][];
            addons: import("@eventflow/api-contracts").components["schemas"]["AddonSkuDto"][];
        }>;
        /** Статус тарифа: живой пакет + снапшоты (M-3). */
        getStatus: () => Promise<{
            tierKey: import("@eventflow/api-contracts").BillingStatusDtoTierKey;
            source: import("@eventflow/api-contracts").BillingStatusDtoSource;
            activePurchase?: import("@eventflow/api-contracts").components["schemas"]["ActivePlanPurchaseDto"] | null;
        }>;
        /** Эффективные энтайтлменты + счётчики окон (E-14, display-only). */
        getEntitlements: () => Promise<{
            tierKey: import("@eventflow/api-contracts").EntitlementsDtoTierKey;
            source: import("@eventflow/api-contracts").EntitlementsDtoSource;
            enforcementEnabled: boolean;
            suspended: boolean;
            commissionBps: number;
            staffSeats?: number | null;
            maxParticipantsPerEvent?: number | null;
            maxEvents?: number | null;
            taskBoardEnabled: boolean;
            statsTier: import("@eventflow/api-contracts").EntitlementsDtoStatsTier;
            qrMode: import("@eventflow/api-contracts").EntitlementsDtoQrMode;
            generationWindow: import("@eventflow/api-contracts").EntitlementsDtoGenerationWindow;
            eventCredits?: import("@eventflow/api-contracts").components["schemas"]["EventCreditsDto"] | null;
            generations: import("@eventflow/api-contracts").components["schemas"]["UsageMeterDto"];
            aiSeconds: import("@eventflow/api-contracts").components["schemas"]["UsageMeterDto"];
            overridesApplied: import("@eventflow/api-contracts").EntitlementsDtoOverridesApplied[];
        }>;
        /** Заявка managed-фазы: тариф/монеты/реклама (M-13, billing:manage). */
        createRequest: (body: CreateBillingRequestBody) => Promise<{
            id: string;
            organizationId: string;
            kind: import("@eventflow/api-contracts").BillingOrderDtoKind;
            planKey?: import("@eventflow/api-contracts").BillingOrderDtoPlanKey;
            skuCode?: string | null;
            status: import("@eventflow/api-contracts").BillingOrderDtoStatus;
            amountMinor: string;
            currency: import("@eventflow/api-contracts").BillingOrderDtoCurrency;
            createdAt: string;
        }>;
        /** История биллинг-заказов организации (C-5/C-8). */
        listRequests: () => Promise<{
            id: string;
            organizationId: string;
            kind: import("@eventflow/api-contracts").BillingOrderDtoKind;
            planKey?: import("@eventflow/api-contracts").BillingOrderDtoPlanKey;
            skuCode?: string | null;
            status: import("@eventflow/api-contracts").BillingOrderDtoStatus;
            amountMinor: string;
            currency: import("@eventflow/api-contracts").BillingOrderDtoCurrency;
            createdAt: string;
        }[]>;
        /** Кошелёк монет: балансы + история (C-6; AI — в секундах, делить на 60). */
        getWallet: () => Promise<never>;
    };
    dashboard: {
        /** GET /organizations/dashboard/stats — NB: the `tickets` block counts
         *  KANBAN TASKS, not event tickets; `period`/activity `timeAgo` strings
         *  arrive pre-formatted in Russian — re-format client-side. */
        getStats: () => Promise<{
            events: import("@eventflow/api-contracts").components["schemas"]["EventsStatsDto"];
            tickets: import("@eventflow/api-contracts").components["schemas"]["TicketsStatsDto"];
            participants: import("@eventflow/api-contracts").components["schemas"]["ParticipantsStatsDto"];
            conversion: import("@eventflow/api-contracts").components["schemas"]["ConversionStatsDto"];
        }>;
        /** Team activity over the last 24h. Rebuild copy from `type` +
         *  `entityName` + `createdAt`; `description`/`timeAgo` are Russian. */
        getActivity: (query?: DashboardActivityQuery) => Promise<{
            items: import("@eventflow/api-contracts").components["schemas"]["ActivityItemDto"][];
            totalCount: number;
            periodStart: string;
            periodEnd: string;
        }>;
    };
    team: {
        /** Organization members — ALWAYS sanitized through the field whitelist
         *  (`sanitizeMember`); the raw row must never reach a screen. */
        getMembers: () => Promise<SafeWorkspaceMember[]>;
    };
    invites: {
        list: (query?: {
            status?: string;
        }) => Promise<{
            id: string;
            organizationId: string;
            email: string;
            status: import("@eventflow/api-contracts").InviteSummaryDtoStatus;
            role: import("@eventflow/api-contracts").components["schemas"]["InviteRoleDto"];
            expiresAt: string;
            userExists: boolean;
            firstName?: Record<string, never>;
            lastName?: Record<string, never>;
            createdAt: string;
            declinedAt?: Record<string, never> | null;
            declineReason?: Record<string, never> | null;
        }[]>;
        create: (body: CreateInviteBody) => Promise<{
            id: string;
            organizationId: string;
            email: string;
            status: import("@eventflow/api-contracts").InviteSummaryDtoStatus;
            role: import("@eventflow/api-contracts").components["schemas"]["InviteRoleDto"];
            expiresAt: string;
            userExists: boolean;
            firstName?: Record<string, never>;
            lastName?: Record<string, never>;
            createdAt: string;
            declinedAt?: Record<string, never> | null;
            declineReason?: Record<string, never> | null;
        }>;
        resend: (inviteId: string) => Promise<{
            id: string;
            organizationId: string;
            email: string;
            status: import("@eventflow/api-contracts").InviteSummaryDtoStatus;
            role: import("@eventflow/api-contracts").components["schemas"]["InviteRoleDto"];
            expiresAt: string;
            userExists: boolean;
            firstName?: Record<string, never>;
            lastName?: Record<string, never>;
            createdAt: string;
            declinedAt?: Record<string, never> | null;
            declineReason?: Record<string, never> | null;
        }>;
        revoke: (inviteId: string) => Promise<never>;
    };
    roles: {
        list: () => Promise<WorkspaceRoleSummary[]>;
    };
    notifications: {
        list: (query?: NotificationsQuery) => Promise<{
            data: import("@eventflow/api-contracts").components["schemas"]["NotificationDto"][];
            total: number;
            unread: number;
        }>;
        unreadCount: () => Promise<{
            count: number;
        }>;
        /** Без списка ids отмечает прочитанной всю ленту организации. */
        markRead: (body?: MarkNotificationsReadBody) => Promise<{
            count: number;
        }>;
    };
};
export {};
//# sourceMappingURL=index.d.ts.map