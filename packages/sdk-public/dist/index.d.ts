import type { ApiTransport, OperationQuery, OperationRequestBody, OperationSuccessResponse } from "@eventflow/api-contracts";
type UserRegisterBody = OperationRequestBody<"/api/v1/auth/user/register", "post">;
type UserRegisterResponse = OperationSuccessResponse<"/api/v1/auth/user/register", "post">;
type UserLoginBody = OperationRequestBody<"/api/v1/auth/user/login", "post">;
type UserLoginResponse = OperationSuccessResponse<"/api/v1/auth/user/login", "post">;
type OrganizationRegisterBody = OperationRequestBody<"/api/v1/auth/organization/register", "post">;
type OrganizationRegisterResponse = OperationSuccessResponse<"/api/v1/auth/organization/register", "post">;
type OrganizationLoginBody = OperationRequestBody<"/api/v1/auth/organization/login", "post">;
type OrganizationLoginResponse = OperationSuccessResponse<"/api/v1/auth/organization/login", "post">;
type RefreshBody = OperationRequestBody<"/api/v1/auth/refresh", "post">;
type RefreshResponse = OperationSuccessResponse<"/api/v1/auth/refresh", "post">;
type LogoutBody = OperationRequestBody<"/api/v1/auth/logout", "post">;
type ChangePasswordBody = OperationRequestBody<"/api/v1/auth/change-password", "patch">;
type SessionsResponse = OperationSuccessResponse<"/api/v1/auth/sessions", "get">;
type PublicEventsResponse = OperationSuccessResponse<"/api/v1/public/events", "get">;
type PublicEventsQuery = OperationQuery<"/api/v1/public/events", "get">;
type PublicPlansResponse = OperationSuccessResponse<"/api/v1/public/plans", "get">;
type TicketCheckoutResponse = OperationSuccessResponse<"/api/v1/registrations/{registrationId}/ticket-order", "post">;
type PublicEventResponse = OperationSuccessResponse<"/api/v1/public/events/{id}", "get">;
type PublicEventBySlugResponse = OperationSuccessResponse<"/api/v1/public/events/by-slug/{slug}", "get">;
type CanRegisterResponse = OperationSuccessResponse<"/api/v1/public/events/{id}/can-register", "get">;
type RegisterBody = OperationRequestBody<"/api/v1/events/{eventId}/register", "post">;
type RegisterResponse = OperationSuccessResponse<"/api/v1/events/{eventId}/register", "post">;
type MyRegistrationsResponse = OperationSuccessResponse<"/api/v1/my-registrations", "get">;
type MyRegistrationsQuery = OperationQuery<"/api/v1/my-registrations", "get">;
type UpdateRegistrationBody = OperationRequestBody<"/api/v1/registrations/{id}", "patch">;
type UpdateRegistrationResponse = OperationSuccessResponse<"/api/v1/registrations/{id}", "patch">;
type CancelRegistrationResponse = OperationSuccessResponse<"/api/v1/registrations/{id}/cancel", "patch">;
type RegistrationQrResponse = OperationSuccessResponse<"/api/v1/registrations/{id}/qr", "get">;
type RegistrationCertificateResponse = OperationSuccessResponse<"/api/v1/registrations/{registrationId}/certificate", "get">;
type EventRegistrationsResponse = OperationSuccessResponse<"/api/v1/events/{eventId}/registrations", "get">;
type EventRegistrationsQuery = OperationQuery<"/api/v1/events/{eventId}/registrations", "get">;
type ApproveRegistrationResponse = OperationSuccessResponse<"/api/v1/events/{eventId}/registrations/{id}/approve", "patch">;
type RejectRegistrationBody = OperationRequestBody<"/api/v1/events/{eventId}/registrations/{id}/reject", "patch">;
type RejectRegistrationResponse = OperationSuccessResponse<"/api/v1/events/{eventId}/registrations/{id}/reject", "patch">;
type BulkApproveBody = OperationRequestBody<"/api/v1/events/{eventId}/registrations/bulk-approve", "post">;
type BulkApproveResponse = OperationSuccessResponse<"/api/v1/events/{eventId}/registrations/bulk-approve", "post">;
type BulkRejectBody = OperationRequestBody<"/api/v1/events/{eventId}/registrations/bulk-reject", "post">;
type BulkRejectResponse = OperationSuccessResponse<"/api/v1/events/{eventId}/registrations/bulk-reject", "post">;
type CheckInBody = OperationRequestBody<"/api/v1/attendance/check-in", "post">;
type CheckInResponse = OperationSuccessResponse<"/api/v1/attendance/check-in", "post">;
type PublicVerifyBody = OperationRequestBody<"/api/v1/certificates/verify", "post">;
type PublicVerifyResponse = OperationSuccessResponse<"/api/v1/certificates/verify", "post">;
type WorkspaceProfileResponse = OperationSuccessResponse<"/api/v1/workspace/me", "get">;
type UpdateOrganizationBody = OperationRequestBody<"/api/v1/workspace/me", "patch">;
type PublicOrganizationResponse = OperationSuccessResponse<"/api/v1/organizations/{id}/public", "get">;
type ProfileOptionsResponse = OperationSuccessResponse<"/api/v1/public/profile-options", "get">;
type LoginBody = OperationRequestBody<"/api/v1/auth/login", "post">;
type LoginResponse = OperationSuccessResponse<"/api/v1/auth/login", "post">;
type SendVerificationCodeBody = OperationRequestBody<"/api/v1/verification/send-code", "post">;
type SendVerificationCodeResponse = OperationSuccessResponse<"/api/v1/verification/send-code", "post">;
type VerifyEmailBody = OperationRequestBody<"/api/v1/verification/verify-email", "post">;
type VerifyEmailResponse = OperationSuccessResponse<"/api/v1/verification/verify-email", "post">;
type ResendVerificationCodeBody = OperationRequestBody<"/api/v1/verification/resend-code", "post">;
type ResendVerificationCodeResponse = OperationSuccessResponse<"/api/v1/verification/resend-code", "post">;
type ResetPasswordBody = OperationRequestBody<"/api/v1/verification/reset-password", "post">;
type ResetPasswordResponse = OperationSuccessResponse<"/api/v1/verification/reset-password", "post">;
type CategoriesQuery = OperationQuery<"/api/v1/categories", "get">;
type CategoriesResponse = OperationSuccessResponse<"/api/v1/categories", "get">;
type CollectionsQuery = OperationQuery<"/api/v1/collections", "get">;
type CollectionsResponse = OperationSuccessResponse<"/api/v1/collections", "get">;
type CollectionByIdResponse = OperationSuccessResponse<"/api/v1/collections/{id}", "get">;
type CollectionBySlugResponse = OperationSuccessResponse<"/api/v1/collections/by-slug/{slug}", "get">;
type EventCommentsQuery = OperationQuery<"/api/v1/events/{eventId}/comments", "get">;
type EventCommentsResponse = OperationSuccessResponse<"/api/v1/events/{eventId}/comments", "get">;
type CreateCommentBody = OperationRequestBody<"/api/v1/events/{eventId}/comments", "post">;
type CreateCommentResponse = OperationSuccessResponse<"/api/v1/events/{eventId}/comments", "post">;
type LikeCommentBody = OperationRequestBody<"/api/v1/events/{eventId}/comments/{id}/like", "post">;
type LikeCommentResponse = OperationSuccessResponse<"/api/v1/events/{eventId}/comments/{id}/like", "post">;
type OrgEventsQuery = OperationQuery<"/api/v1/events/organizations/{id}/events", "get">;
type OrgEventsResponse = OperationSuccessResponse<"/api/v1/events/organizations/{id}/events", "get">;
export interface PublicSdk {
    auth: {
        login(body: LoginBody): Promise<LoginResponse>;
        registerUser(body: UserRegisterBody): Promise<UserRegisterResponse>;
        loginUser(body: UserLoginBody): Promise<UserLoginResponse>;
        registerOrganization(body: OrganizationRegisterBody): Promise<OrganizationRegisterResponse>;
        loginOrganization(body: OrganizationLoginBody): Promise<OrganizationLoginResponse>;
        refresh(body: RefreshBody): Promise<RefreshResponse>;
        logout(body?: LogoutBody): Promise<void>;
        changePassword(body: ChangePasswordBody): Promise<{
            message: string;
        }>;
        getSessions(): Promise<SessionsResponse>;
        terminateAllSessions(): Promise<{
            message: string;
        }>;
        terminateSession(sessionId: string): Promise<{
            message: string;
        }>;
    };
    verification: {
        sendCode(body: SendVerificationCodeBody): Promise<SendVerificationCodeResponse>;
        verifyEmail(body: VerifyEmailBody): Promise<VerifyEmailResponse>;
        resendCode(body: ResendVerificationCodeBody): Promise<ResendVerificationCodeResponse>;
        resetPassword(body: ResetPasswordBody): Promise<ResetPasswordResponse>;
    };
    events: {
        getPublicEvents(query?: PublicEventsQuery): Promise<PublicEventsResponse>;
        getPublicEventById(id: string): Promise<PublicEventResponse>;
        getPublicEventBySlug(slug: string): Promise<PublicEventBySlugResponse>;
        getByOrganization(organizationId: string, query?: OrgEventsQuery): Promise<OrgEventsResponse>;
        canRegister(id: string): Promise<CanRegisterResponse>;
        getComments(eventId: string, query?: EventCommentsQuery): Promise<EventCommentsResponse>;
        postComment(eventId: string, body: CreateCommentBody): Promise<CreateCommentResponse>;
        likeComment(eventId: string, commentId: string, body: LikeCommentBody): Promise<LikeCommentResponse>;
        downloadMaterial(eventId: string, agendaItemId: string, fileUrl: string): Promise<unknown>;
    };
    categories: {
        list(query?: CategoriesQuery): Promise<CategoriesResponse>;
    };
    collections: {
        list(query?: CollectionsQuery): Promise<CollectionsResponse>;
        getById(id: string): Promise<CollectionByIdResponse>;
        getBySlug(slug: string): Promise<CollectionBySlugResponse>;
    };
    registrations: {
        register(eventId: string, body: RegisterBody, options?: {
            inviteCode?: string;
        }): Promise<RegisterResponse>;
        getMyRegistrations(query?: MyRegistrationsQuery): Promise<MyRegistrationsResponse>;
        updateRegistration(id: string, body: UpdateRegistrationBody): Promise<UpdateRegistrationResponse>;
        cancelRegistration(id: string): Promise<CancelRegistrationResponse>;
        getQrCode(id: string): Promise<RegistrationQrResponse>;
        getRegistrationCertificate(registrationId: string): Promise<RegistrationCertificateResponse>;
        downloadTicket(registrationId: string): Promise<unknown>;
    };
    organizerRegistrations: {
        list(eventId: string, query?: EventRegistrationsQuery): Promise<EventRegistrationsResponse>;
        approve(eventId: string, id: string): Promise<ApproveRegistrationResponse>;
        reject(eventId: string, id: string, body?: RejectRegistrationBody): Promise<RejectRegistrationResponse>;
        bulkApprove(eventId: string, body: BulkApproveBody): Promise<BulkApproveResponse>;
        bulkReject(eventId: string, body: BulkRejectBody): Promise<BulkRejectResponse>;
    };
    attendance: {
        checkIn(body: CheckInBody): Promise<CheckInResponse>;
    };
    certificates: {
        verifyPublic(body: PublicVerifyBody): Promise<PublicVerifyResponse>;
    };
    organizations: {
        getMe(): Promise<WorkspaceProfileResponse>;
        updateMe(body: UpdateOrganizationBody): Promise<WorkspaceProfileResponse>;
        deleteMe(): Promise<void>;
        uploadLogo(file: File): Promise<WorkspaceProfileResponse>;
        deleteLogo(): Promise<WorkspaceProfileResponse>;
        completeOnboarding(): Promise<WorkspaceProfileResponse>;
        getPublicProfile(id: string): Promise<PublicOrganizationResponse>;
    };
    profile: {
        getProfileOptions(): Promise<ProfileOptionsResponse>;
    };
    billing: {
        /** Публичный каталог тарифов (M-1). Деньги — строки минорных единиц. */
        getPublicPlans(): Promise<PublicPlansResponse>;
        /** M-4: заказ билета на свою PENDING-регистрацию платного события. */
        checkoutTicket(registrationId: string): Promise<TicketCheckoutResponse>;
    };
}
export declare function createPublicSdk(transport: ApiTransport): PublicSdk;
export {};
//# sourceMappingURL=index.d.ts.map