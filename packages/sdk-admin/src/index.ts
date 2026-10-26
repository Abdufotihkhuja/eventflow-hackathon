import type {
  ApiTransport,
  OperationPathParams,
  OperationQuery,
  OperationRequestBody,
  OperationSuccessResponse,
} from '@eventflow/api-contracts';

type AdminOrgBillingResponse = OperationSuccessResponse<
  '/api/v1/super-admin/billing/organizations/{orgId}',
  'get'
>;
type AdminActivatePlanBody = OperationRequestBody<
  '/api/v1/super-admin/billing/organizations/{orgId}/plan/activate',
  'post'
>;
type AdminActivatePlanResponse = OperationSuccessResponse<
  '/api/v1/super-admin/billing/organizations/{orgId}/plan/activate',
  'post'
>;
type AdminBillingRequestsResponse = OperationSuccessResponse<
  '/api/v1/super-admin/billing/requests',
  'get'
>;
type AdminSetEnforcementBody = OperationRequestBody<
  '/api/v1/super-admin/billing/enforcement',
  'post'
>;
type AdminSetEnforcementResponse = OperationSuccessResponse<
  '/api/v1/super-admin/billing/enforcement',
  'post'
>;
type AdminGetEnforcementResponse = OperationSuccessResponse<
  '/api/v1/super-admin/billing/enforcement',
  'get'
>;
type AdminGetViaResponse = OperationSuccessResponse<
  '/api/v1/super-admin/billing/via',
  'get'
>;
type AdminSetViaBody = OperationRequestBody<
  '/api/v1/super-admin/billing/via',
  'post'
>;
type AdminSetViaResponse = OperationSuccessResponse<
  '/api/v1/super-admin/billing/via',
  'post'
>;
type AdminUpdatePlanPricingBody = OperationRequestBody<
  '/api/v1/super-admin/billing/plans/{key}/pricing',
  'post'
>;
type AdminUpdateSkuPricingBody = OperationRequestBody<
  '/api/v1/super-admin/billing/addon-skus/{code}/pricing',
  'post'
>;
type AdminAuditListResponse = OperationSuccessResponse<
  '/api/v1/super-admin/billing/audit',
  'get'
>;
type AdminRevenueSummaryResponse = OperationSuccessResponse<
  '/api/v1/super-admin/billing/revenue/summary',
  'get'
>;
type AdminOverviewResponse = OperationSuccessResponse<
  '/api/v1/super-admin/billing/overview',
  'get'
>;
type AdminFulfillFeaturedBody = OperationRequestBody<
  '/api/v1/super-admin/billing/organizations/{orgId}/ad-orders/featured',
  'post'
>;
type AdminExtendPlanBody = OperationRequestBody<
  '/api/v1/super-admin/billing/organizations/{orgId}/plan/extend',
  'post'
>;
type AdminExpirePlanBody = OperationRequestBody<
  '/api/v1/super-admin/billing/organizations/{orgId}/plan/expire',
  'post'
>;
type AdminAdjustCreditsBody = OperationRequestBody<
  '/api/v1/super-admin/billing/organizations/{orgId}/plan/credits/adjust',
  'post'
>;
type AdminPlanPurchaseResponse = OperationSuccessResponse<
  '/api/v1/super-admin/billing/organizations/{orgId}/plan/extend',
  'post'
>;
type AdminRecordPaymentBody = OperationRequestBody<
  '/api/v1/super-admin/billing/organizations/{orgId}/payments',
  'post'
>;
type AdminRecordPaymentResponse = OperationSuccessResponse<
  '/api/v1/super-admin/billing/organizations/{orgId}/payments',
  'post'
>;
type AdminReversePaymentBody = OperationRequestBody<
  '/api/v1/super-admin/billing/payments/{transactionId}/reverse',
  'post'
>;
type AdminConfirmTicketBody = OperationRequestBody<
  '/api/v1/super-admin/billing/ticket-orders/{orderId}/confirm',
  'post'
>;
type AdminConfirmTicketResponse = OperationSuccessResponse<
  '/api/v1/super-admin/billing/ticket-orders/{orderId}/confirm',
  'post'
>;
type AdminPayoutsOwedResponse = OperationSuccessResponse<
  '/api/v1/super-admin/billing/payouts/owed',
  'get'
>;
type AdminRecordPayoutBody = OperationRequestBody<
  '/api/v1/super-admin/billing/organizations/{orgId}/payouts',
  'post'
>;
type AdminRecordPayoutResponse = OperationSuccessResponse<
  '/api/v1/super-admin/billing/organizations/{orgId}/payouts',
  'post'
>;
type AdminSetOverrideBody = OperationRequestBody<
  '/api/v1/super-admin/billing/organizations/{orgId}/overrides',
  'post'
>;
type AdminSetOverrideResponse = OperationSuccessResponse<
  '/api/v1/super-admin/billing/organizations/{orgId}/overrides',
  'post'
>;
type AdminRevokeOverrideBody = OperationRequestBody<
  '/api/v1/super-admin/billing/organizations/{orgId}/overrides/{key}/revoke',
  'post'
>;
type AdminCompGrantBody = OperationRequestBody<
  '/api/v1/super-admin/billing/organizations/{orgId}/comp',
  'post'
>;
type AdminSuspendBody = OperationRequestBody<
  '/api/v1/super-admin/billing/organizations/{orgId}/suspend',
  'post'
>;

type SuperAdminLoginBody = OperationRequestBody<
  '/api/v1/auth/superadmin/login',
  'post'
>;
type SuperAdminLoginResponse = OperationSuccessResponse<
  '/api/v1/auth/superadmin/login',
  'post'
>;
type SessionMeResponse = OperationSuccessResponse<'/api/v1/session/me', 'get'>;
type RequestElevationBody = OperationRequestBody<
  '/api/v1/super-admin/elevations',
  'post'
>;
type ElevationResponse = OperationSuccessResponse<
  '/api/v1/super-admin/elevations',
  'post'
>;
type ElevationPath = OperationPathParams<
  '/api/v1/super-admin/elevations/{id}/approve',
  'post'
>;
type ProvisionOrganizationBody = OperationRequestBody<
  '/api/v1/super-admin/organizations/provision',
  'post'
>;
type ProvisionOrganizationResponse = OperationSuccessResponse<
  '/api/v1/super-admin/organizations/provision',
  'post'
>;
type CreateSuperAdminBody = OperationRequestBody<
  '/api/v1/super-admin/admins',
  'post'
>;
type CreateSuperAdminResponse = OperationSuccessResponse<
  '/api/v1/super-admin/admins',
  'post'
>;
type StatsResponse = OperationSuccessResponse<
  '/api/v1/super-admin/stats',
  'get'
>;
type AdminUsersQuery = OperationQuery<'/api/v1/super-admin/users', 'get'>;
type AdminUsersResponse = OperationSuccessResponse<
  '/api/v1/super-admin/users',
  'get'
>;
type AdminUserResponse = OperationSuccessResponse<
  '/api/v1/super-admin/users/{userId}',
  'get'
>;
type UpdateAdminUserBody = OperationRequestBody<
  '/api/v1/super-admin/users/{userId}',
  'patch'
>;
type AdminUserPath = OperationPathParams<
  '/api/v1/super-admin/users/{userId}',
  'get'
>;
type AdminOrganizationsQuery = OperationQuery<
  '/api/v1/super-admin/organizations',
  'get'
>;
type AdminOrganizationsResponse = OperationSuccessResponse<
  '/api/v1/super-admin/organizations',
  'get'
>;
type AdminOrganizationResponse = OperationSuccessResponse<
  '/api/v1/super-admin/organizations/{orgId}',
  'get'
>;
type UpdateAdminOrganizationBody = OperationRequestBody<
  '/api/v1/super-admin/organizations/{orgId}',
  'patch'
>;
type RejectAdminOrganizationBody = OperationRequestBody<
  '/api/v1/super-admin/organizations/{orgId}/reject',
  'post'
>;
type AdminOrganizationPath = OperationPathParams<
  '/api/v1/super-admin/organizations/{orgId}',
  'get'
>;
type AdminEventsQuery = OperationQuery<'/api/v1/super-admin/events', 'get'>;
type AdminEventsResponse = OperationSuccessResponse<
  '/api/v1/super-admin/events',
  'get'
>;
type AdminEventResponse = OperationSuccessResponse<
  '/api/v1/super-admin/events/{eventId}',
  'get'
>;
type UpdateAdminEventBody = OperationRequestBody<
  '/api/v1/super-admin/events/{eventId}',
  'patch'
>;
type SetAdminEventStatusBody = OperationRequestBody<
  '/api/v1/super-admin/events/{eventId}/status',
  'patch'
>;
type RejectAdminEventBody = OperationRequestBody<
  '/api/v1/super-admin/events/{eventId}/reject',
  'post'
>;
type AdminEventPath = OperationPathParams<
  '/api/v1/super-admin/events/{eventId}',
  'get'
>;
type VerificationCodesQuery = OperationQuery<
  '/api/v1/super-admin/verification-codes',
  'get'
>;
type VerificationCodesResponse = OperationSuccessResponse<
  '/api/v1/super-admin/verification-codes',
  'get'
>;
type AdminBlogPostsQuery = OperationQuery<
  '/api/v1/super-admin/blog-posts',
  'get'
>;
type AdminBlogPostsResponse = OperationSuccessResponse<
  '/api/v1/super-admin/blog-posts',
  'get'
>;
type AdminBlogPostResponse = OperationSuccessResponse<
  '/api/v1/super-admin/blog-posts/{postId}',
  'get'
>;
type RejectBlogPostBody = OperationRequestBody<
  '/api/v1/super-admin/blog-posts/{postId}/reject',
  'post'
>;
type AdminBlogPostPath = OperationPathParams<
  '/api/v1/super-admin/blog-posts/{postId}',
  'get'
>;
type AdminCategoriesQuery = OperationQuery<
  '/api/v1/super-admin/categories',
  'get'
>;
type AdminCategoriesResponse = OperationSuccessResponse<
  '/api/v1/super-admin/categories',
  'get'
>;
type CheckCategorySlugQuery = OperationQuery<
  '/api/v1/super-admin/categories/check-slug',
  'get'
>;
type CheckCategorySlugResponse = OperationSuccessResponse<
  '/api/v1/super-admin/categories/check-slug',
  'get'
>;
type AdminCategoryResponse = OperationSuccessResponse<
  '/api/v1/super-admin/categories/{id}',
  'get'
>;
type CreateCategoryBody = OperationRequestBody<
  '/api/v1/super-admin/categories',
  'post'
>;
type UpdateCategoryBody = OperationRequestBody<
  '/api/v1/super-admin/categories/{id}',
  'patch'
>;
type UploadCategoryIconResponse = OperationSuccessResponse<
  '/api/v1/super-admin/categories/icon-upload',
  'post'
>;
type CategoryPath = OperationPathParams<
  '/api/v1/super-admin/categories/{id}',
  'get'
>;

// Blog categories are not yet present in the generated OpenAPI document, so the
// SDK declares their request/response shapes explicitly. They mirror the event
// category contract (minus the icon field).
type BlogCategoryTranslations = Record<
  string,
  Partial<Record<'ru' | 'uz' | 'en', string>>
>;
type BlogCategoryTranslationMeta = Record<
  string,
  Partial<Record<'ru' | 'uz' | 'en', { status: string; sourceLocale?: string }>>
>;
interface AdminBlogCategory {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  translations?: BlogCategoryTranslations | null;
  translationMeta?: BlogCategoryTranslationMeta | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { posts: number };
}
interface AdminBlogCategoriesQuery {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}
interface AdminBlogCategoriesResponse {
  data: AdminBlogCategory[];
  total: number;
  page?: number;
  limit?: number;
}
interface CheckBlogCategorySlugQuery {
  slug: string;
  excludeId?: string;
}
interface CheckBlogCategorySlugResponse {
  available: boolean;
}
interface CreateBlogCategoryBody {
  name: string;
  slug?: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
  translations?: BlogCategoryTranslations;
  translationMeta?: BlogCategoryTranslationMeta;
}
type UpdateBlogCategoryBody = Partial<CreateBlogCategoryBody>;

type CollectionsQuery = OperationQuery<
  '/api/v1/super-admin/collections',
  'get'
>;
type CollectionsResponse = OperationSuccessResponse<
  '/api/v1/super-admin/collections',
  'get'
>;
type CheckCollectionSlugQuery = OperationQuery<
  '/api/v1/super-admin/collections/check-slug',
  'get'
>;
type CheckCollectionSlugResponse = OperationSuccessResponse<
  '/api/v1/super-admin/collections/check-slug',
  'get'
>;
type AvailableCollectionEventsQuery = OperationQuery<
  '/api/v1/super-admin/collections/available-events',
  'get'
>;
type AvailableCollectionEventsResponse = OperationSuccessResponse<
  '/api/v1/super-admin/collections/available-events',
  'get'
>;
type CollectionResponse = OperationSuccessResponse<
  '/api/v1/super-admin/collections/{id}',
  'get'
>;
type CollectionEventsResponse = OperationSuccessResponse<
  '/api/v1/super-admin/collections/{id}/events',
  'get'
>;
type UploadCollectionCoverResponse = OperationSuccessResponse<
  '/api/v1/super-admin/collections/cover-upload',
  'post'
>;
type CreateCollectionBody = OperationRequestBody<
  '/api/v1/super-admin/collections',
  'post'
>;
type UpdateCollectionBody = OperationRequestBody<
  '/api/v1/super-admin/collections/{id}',
  'patch'
>;
type AddCollectionEventsBody = OperationRequestBody<
  '/api/v1/super-admin/collections/{id}/events',
  'post'
>;
type RemoveCollectionEventsBody = OperationRequestBody<
  '/api/v1/super-admin/collections/{id}/events',
  'delete'
>;
type ReorderCollectionEventsBody = OperationRequestBody<
  '/api/v1/super-admin/collections/{id}/events/reorder',
  'patch'
>;
type CollectionPath = OperationPathParams<
  '/api/v1/super-admin/collections/{id}',
  'get'
>;
type TranslateBatchBody = OperationRequestBody<
  '/api/v1/translations/batch',
  'post'
>;
type TranslateBatchResponse = OperationSuccessResponse<
  '/api/v1/translations/batch',
  'post'
>;

// Hard-delete endpoints are not yet present in the generated OpenAPI document,
// so the SDK declares their request/response shapes explicitly (same approach as
// the blog categories above). They must stay in sync with the API DTOs in
// apps/api/src/modules/super-admin.
export interface HardDeleteUserResult {
  success: true;
  userId: string;
  email: string;
}
export interface HardDeleteOrganizationResult {
  success: true;
  organizationId: string;
  name: string;
}
export interface HardDeleteOrganizationBody {
  /** Должна точно совпадать с `DELETE <название организации>`. */
  confirmation: string;
}
export interface ArchiveAccountBody {
  /** Необязательная причина архивации (в audit log). */
  reason?: string;
}
export interface ArchiveUserResult {
  success: true;
  userId: string;
}
export interface ArchiveOrganizationResult {
  success: true;
  organizationId: string;
}
export interface OrganizationDeletePreview {
  organizationId: string;
  name: string;
  email: string;
  members: number;
  linkedAccounts: number;
  invites: number;
  roles: number;
  events: number;
  registrations: number;
  certificates: number;
  tickets: number;
  badgeTemplates: number;
  fileUploads: number;
  boards: number;
  blogPosts: number;
  rentalPlaces: number;
  followers: number;
  billingRecords: number;
}

export function createAdminSdk(transport: ApiTransport) {
  return {
    auth: {
      loginSuperAdmin: (body: SuperAdminLoginBody) =>
        transport<SuperAdminLoginResponse, SuperAdminLoginBody>({
          method: 'POST',
          url: '/api/v1/auth/superadmin/login',
          data: body,
          skipAuth: true,
        }),
    },
    session: {
      getMe: () =>
        transport<SessionMeResponse>({
          method: 'GET',
          url: '/api/v1/session/me',
        }),
    },
    elevations: {
      request: (body: RequestElevationBody) =>
        transport<ElevationResponse, RequestElevationBody>({
          method: 'POST',
          url: '/api/v1/super-admin/elevations',
          data: body,
        }),
      approveWrite: (id: ElevationPath['id']) =>
        transport<ElevationResponse>({
          method: 'POST',
          url: `/api/v1/super-admin/elevations/${id}/approve`,
        }),
    },
    profile: {
      createAdmin: (body: CreateSuperAdminBody) =>
        transport<CreateSuperAdminResponse, CreateSuperAdminBody>({
          method: 'POST',
          url: '/api/v1/super-admin/admins',
          data: body,
        }),
    },
    stats: {
      getSystem: () =>
        transport<StatsResponse>({
          method: 'GET',
          url: '/api/v1/super-admin/stats',
        }),
    },
    users: {
      getList: (query?: AdminUsersQuery) =>
        transport<AdminUsersResponse>({
          method: 'GET',
          url: '/api/v1/super-admin/users',
          params: query as Record<string, unknown> | undefined,
        }),
      getById: (userId: AdminUserPath['userId']) =>
        transport<AdminUserResponse>({
          method: 'GET',
          url: `/api/v1/super-admin/users/${userId}`,
        }),
      update: (userId: AdminUserPath['userId'], body: UpdateAdminUserBody) =>
        transport<AdminUserResponse, UpdateAdminUserBody>({
          method: 'PATCH',
          url: `/api/v1/super-admin/users/${userId}`,
          data: body,
        }),
      archive: (userId: AdminUserPath['userId'], body?: ArchiveAccountBody) =>
        transport<ArchiveUserResult, ArchiveAccountBody | undefined>({
          method: 'POST',
          url: `/api/v1/super-admin/users/${userId}/archive`,
          data: body,
        }),
      restore: (userId: AdminUserPath['userId']) =>
        transport<ArchiveUserResult>({
          method: 'POST',
          url: `/api/v1/super-admin/users/${userId}/restore`,
        }),
      hardDelete: (userId: AdminUserPath['userId']) =>
        transport<HardDeleteUserResult>({
          method: 'DELETE',
          url: `/api/v1/super-admin/users/${userId}/hard-delete`,
        }),
    },
    organizations: {
      provision: (body: ProvisionOrganizationBody) =>
        transport<ProvisionOrganizationResponse, ProvisionOrganizationBody>({
          method: 'POST',
          url: '/api/v1/super-admin/organizations/provision',
          data: body,
        }),
      getList: (query?: AdminOrganizationsQuery) =>
        transport<AdminOrganizationsResponse>({
          method: 'GET',
          url: '/api/v1/super-admin/organizations',
          params: query as Record<string, unknown> | undefined,
        }),
      getPending: (query?: AdminOrganizationsQuery) =>
        transport<AdminOrganizationsResponse>({
          method: 'GET',
          url: '/api/v1/super-admin/organizations/pending',
          params: query as Record<string, unknown> | undefined,
        }),
      getById: (orgId: AdminOrganizationPath['orgId']) =>
        transport<AdminOrganizationResponse>({
          method: 'GET',
          url: `/api/v1/super-admin/organizations/${orgId}`,
        }),
      update: (
        orgId: AdminOrganizationPath['orgId'],
        body: UpdateAdminOrganizationBody,
      ) =>
        transport<AdminOrganizationResponse, UpdateAdminOrganizationBody>({
          method: 'PATCH',
          url: `/api/v1/super-admin/organizations/${orgId}`,
          data: body,
        }),
      approve: (orgId: AdminOrganizationPath['orgId']) =>
        transport<AdminOrganizationResponse>({
          method: 'POST',
          url: `/api/v1/super-admin/organizations/${orgId}/approve`,
        }),
      reject: (
        orgId: AdminOrganizationPath['orgId'],
        body?: RejectAdminOrganizationBody,
      ) =>
        transport<
          AdminOrganizationResponse,
          RejectAdminOrganizationBody | undefined
        >({
          method: 'POST',
          url: `/api/v1/super-admin/organizations/${orgId}/reject`,
          data: body,
        }),
      archive: (
        orgId: AdminOrganizationPath['orgId'],
        body?: ArchiveAccountBody,
      ) =>
        transport<ArchiveOrganizationResult, ArchiveAccountBody | undefined>({
          method: 'POST',
          url: `/api/v1/super-admin/organizations/${orgId}/archive`,
          data: body,
        }),
      restore: (orgId: AdminOrganizationPath['orgId']) =>
        transport<ArchiveOrganizationResult>({
          method: 'POST',
          url: `/api/v1/super-admin/organizations/${orgId}/restore`,
        }),
      getDeletePreview: (orgId: AdminOrganizationPath['orgId']) =>
        transport<OrganizationDeletePreview>({
          method: 'GET',
          url: `/api/v1/super-admin/organizations/${orgId}/delete-preview`,
        }),
      hardDelete: (
        orgId: AdminOrganizationPath['orgId'],
        body: HardDeleteOrganizationBody,
      ) =>
        transport<HardDeleteOrganizationResult, HardDeleteOrganizationBody>({
          method: 'DELETE',
          url: `/api/v1/super-admin/organizations/${orgId}/hard-delete`,
          data: body,
        }),
    },
    events: {
      getList: (query?: AdminEventsQuery) =>
        transport<AdminEventsResponse>({
          method: 'GET',
          url: '/api/v1/super-admin/events',
          params: query as Record<string, unknown> | undefined,
        }),
      getPending: (query?: AdminEventsQuery) =>
        transport<AdminEventsResponse>({
          method: 'GET',
          url: '/api/v1/super-admin/events/pending',
          params: query as Record<string, unknown> | undefined,
        }),
      getById: (eventId: AdminEventPath['eventId']) =>
        transport<AdminEventResponse>({
          method: 'GET',
          url: `/api/v1/super-admin/events/${eventId}`,
        }),
      update: (
        eventId: AdminEventPath['eventId'],
        body: UpdateAdminEventBody,
      ) =>
        transport<AdminEventResponse, UpdateAdminEventBody>({
          method: 'PATCH',
          url: `/api/v1/super-admin/events/${eventId}`,
          data: body,
        }),
      setStatus: (
        eventId: AdminEventPath['eventId'],
        body: SetAdminEventStatusBody,
      ) =>
        transport<AdminEventResponse, SetAdminEventStatusBody>({
          method: 'PATCH',
          url: `/api/v1/super-admin/events/${eventId}/status`,
          data: body,
        }),
      approve: (eventId: AdminEventPath['eventId']) =>
        transport<void>({
          method: 'POST',
          url: `/api/v1/super-admin/events/${eventId}/approve`,
        }),
      reject: (
        eventId: AdminEventPath['eventId'],
        body?: RejectAdminEventBody,
      ) =>
        transport<void, RejectAdminEventBody | undefined>({
          method: 'POST',
          url: `/api/v1/super-admin/events/${eventId}/reject`,
          data: body,
        }),
      toggleFeatured: (eventId: AdminEventPath['eventId']) =>
        transport<AdminEventResponse>({
          method: 'PATCH',
          url: `/api/v1/super-admin/events/${eventId}/featured`,
        }),
      delete: (
        eventId: AdminEventPath['eventId'],
        body?: { reason?: string },
      ) =>
        transport<void, { reason?: string } | undefined>({
          method: 'DELETE',
          url: `/api/v1/super-admin/events/${eventId}`,
          data: body,
        }),
    },
    verificationCodes: {
      getList: (query?: VerificationCodesQuery) =>
        transport<VerificationCodesResponse>({
          method: 'GET',
          url: '/api/v1/super-admin/verification-codes',
          params: query as Record<string, unknown> | undefined,
        }),
    },
    blogPosts: {
      getList: (query?: AdminBlogPostsQuery) =>
        transport<AdminBlogPostsResponse>({
          method: 'GET',
          url: '/api/v1/super-admin/blog-posts',
          params: query as Record<string, unknown> | undefined,
        }),
      getPending: (query?: AdminBlogPostsQuery) =>
        transport<AdminBlogPostsResponse>({
          method: 'GET',
          url: '/api/v1/super-admin/blog-posts/pending',
          params: query as Record<string, unknown> | undefined,
        }),
      getById: (postId: AdminBlogPostPath['postId']) =>
        transport<AdminBlogPostResponse>({
          method: 'GET',
          url: `/api/v1/super-admin/blog-posts/${postId}`,
        }),
      approve: (postId: AdminBlogPostPath['postId']) =>
        transport<AdminBlogPostResponse>({
          method: 'POST',
          url: `/api/v1/super-admin/blog-posts/${postId}/approve`,
        }),
      reject: (
        postId: AdminBlogPostPath['postId'],
        body?: RejectBlogPostBody,
      ) =>
        transport<AdminBlogPostResponse, RejectBlogPostBody | undefined>({
          method: 'POST',
          url: `/api/v1/super-admin/blog-posts/${postId}/reject`,
          data: body,
        }),
      delete: (postId: AdminBlogPostPath['postId']) =>
        transport<void>({
          method: 'DELETE',
          url: `/api/v1/super-admin/blog-posts/${postId}`,
        }),
    },
    categories: {
      getList: (query?: AdminCategoriesQuery) =>
        transport<AdminCategoriesResponse>({
          method: 'GET',
          url: '/api/v1/super-admin/categories',
          params: query as Record<string, unknown> | undefined,
        }),
      checkSlug: (query: CheckCategorySlugQuery) =>
        transport<CheckCategorySlugResponse>({
          method: 'GET',
          url: '/api/v1/super-admin/categories/check-slug',
          params: query as Record<string, unknown>,
        }),
      getById: (id: CategoryPath['id']) =>
        transport<AdminCategoryResponse>({
          method: 'GET',
          url: `/api/v1/super-admin/categories/${id}`,
        }),
      uploadIcon: (file: File) => {
        const data = new FormData();
        data.append('icon', file);

        return transport<UploadCategoryIconResponse, FormData>({
          method: 'POST',
          url: '/api/v1/super-admin/categories/icon-upload',
          data,
        });
      },
      create: (body: CreateCategoryBody) =>
        transport<AdminCategoryResponse, CreateCategoryBody>({
          method: 'POST',
          url: '/api/v1/super-admin/categories',
          data: body,
        }),
      update: (id: CategoryPath['id'], body: UpdateCategoryBody) =>
        transport<AdminCategoryResponse, UpdateCategoryBody>({
          method: 'PATCH',
          url: `/api/v1/super-admin/categories/${id}`,
          data: body,
        }),
      delete: (id: CategoryPath['id']) =>
        transport<void>({
          method: 'DELETE',
          url: `/api/v1/super-admin/categories/${id}`,
        }),
    },
    blogCategories: {
      getList: (query?: AdminBlogCategoriesQuery) =>
        transport<AdminBlogCategoriesResponse>({
          method: 'GET',
          url: '/api/v1/super-admin/blog-categories',
          params: query as Record<string, unknown> | undefined,
        }),
      checkSlug: (query: CheckBlogCategorySlugQuery) =>
        transport<CheckBlogCategorySlugResponse>({
          method: 'GET',
          url: '/api/v1/super-admin/blog-categories/check-slug',
          params: query as unknown as Record<string, unknown>,
        }),
      getById: (id: string) =>
        transport<AdminBlogCategory>({
          method: 'GET',
          url: `/api/v1/super-admin/blog-categories/${id}`,
        }),
      create: (body: CreateBlogCategoryBody) =>
        transport<AdminBlogCategory, CreateBlogCategoryBody>({
          method: 'POST',
          url: '/api/v1/super-admin/blog-categories',
          data: body,
        }),
      update: (id: string, body: UpdateBlogCategoryBody) =>
        transport<AdminBlogCategory, UpdateBlogCategoryBody>({
          method: 'PATCH',
          url: `/api/v1/super-admin/blog-categories/${id}`,
          data: body,
        }),
      delete: (id: string) =>
        transport<void>({
          method: 'DELETE',
          url: `/api/v1/super-admin/blog-categories/${id}`,
        }),
    },
    collections: {
      getList: (query?: CollectionsQuery) =>
        transport<CollectionsResponse>({
          method: 'GET',
          url: '/api/v1/super-admin/collections',
          params: query as Record<string, unknown> | undefined,
        }),
      checkSlug: (query: CheckCollectionSlugQuery) =>
        transport<CheckCollectionSlugResponse>({
          method: 'GET',
          url: '/api/v1/super-admin/collections/check-slug',
          params: query as Record<string, unknown>,
        }),
      getAvailableEvents: (query?: AvailableCollectionEventsQuery) =>
        transport<AvailableCollectionEventsResponse>({
          method: 'GET',
          url: '/api/v1/super-admin/collections/available-events',
          params: query as Record<string, unknown> | undefined,
        }),
      getById: (id: CollectionPath['id']) =>
        transport<CollectionResponse>({
          method: 'GET',
          url: `/api/v1/super-admin/collections/${id}`,
        }),
      getEvents: (id: CollectionPath['id']) =>
        transport<CollectionEventsResponse>({
          method: 'GET',
          url: `/api/v1/super-admin/collections/${id}/events`,
        }),
      uploadCover: (file: File) => {
        const data = new FormData();
        data.append('cover', file);

        return transport<UploadCollectionCoverResponse, FormData>({
          method: 'POST',
          url: '/api/v1/super-admin/collections/cover-upload',
          data,
        });
      },
      create: (body: CreateCollectionBody) =>
        transport<CollectionResponse, CreateCollectionBody>({
          method: 'POST',
          url: '/api/v1/super-admin/collections',
          data: body,
        }),
      update: (id: CollectionPath['id'], body: UpdateCollectionBody) =>
        transport<CollectionResponse, UpdateCollectionBody>({
          method: 'PATCH',
          url: `/api/v1/super-admin/collections/${id}`,
          data: body,
        }),
      delete: (id: CollectionPath['id']) =>
        transport<void>({
          method: 'DELETE',
          url: `/api/v1/super-admin/collections/${id}`,
        }),
      addEvents: (id: CollectionPath['id'], body: AddCollectionEventsBody) =>
        transport<void, AddCollectionEventsBody>({
          method: 'POST',
          url: `/api/v1/super-admin/collections/${id}/events`,
          data: body,
        }),
      removeEvents: (
        id: CollectionPath['id'],
        body: RemoveCollectionEventsBody,
      ) =>
        transport<void, RemoveCollectionEventsBody>({
          method: 'DELETE',
          url: `/api/v1/super-admin/collections/${id}/events`,
          data: body,
        }),
      reorderEvents: (
        id: CollectionPath['id'],
        body: ReorderCollectionEventsBody,
      ) =>
        transport<void, ReorderCollectionEventsBody>({
          method: 'PATCH',
          url: `/api/v1/super-admin/collections/${id}/events/reorder`,
          data: body,
        }),
    },
    translations: {
      translateBatch: (body: TranslateBatchBody) =>
        transport<TranslateBatchResponse, TranslateBatchBody>({
          method: 'POST',
          url: '/api/v1/translations/batch',
          data: body,
        }),
    },
    billing: {
      /** Биллинг-панель организации (S-1/S-2). */
      getOrgBilling: (orgId: string) =>
        transport<AdminOrgBillingResponse>({
          method: 'GET',
          url: `/api/v1/super-admin/billing/organizations/${orgId}`,
        }),
      /** Активация/смена тарифа (managed; creditMode обязателен при смене — §2.4). */
      activatePlan: (orgId: string, body: AdminActivatePlanBody) =>
        transport<AdminActivatePlanResponse, AdminActivatePlanBody>({
          method: 'POST',
          url: `/api/v1/super-admin/billing/organizations/${orgId}/plan/activate`,
          data: body,
        }),
      /** Очередь REQUESTED-заявок managed-фазы. */
      listRequests: () =>
        transport<AdminBillingRequestsResponse>({
          method: 'GET',
          url: '/api/v1/super-admin/billing/requests',
        }),
      /** S-3: продлить период пакета на N дней. */
      extendPlan: (orgId: string, body: AdminExtendPlanBody) =>
        transport<AdminPlanPurchaseResponse, AdminExtendPlanBody>({
          method: 'POST',
          url: `/api/v1/super-admin/billing/organizations/${orgId}/plan/extend`,
          data: body,
        }),
      /** S-3: принудительно истечь пакет (немедленный START; причина обязательна). */
      expirePlan: (orgId: string, body: AdminExpirePlanBody) =>
        transport<AdminPlanPurchaseResponse, AdminExpirePlanBody>({
          method: 'POST',
          url: `/api/v1/super-admin/billing/organizations/${orgId}/plan/expire`,
          data: body,
        }),
      /** S-3: корректировка кредитов (append-only; причина обязательна). */
      adjustCredits: (orgId: string, body: AdminAdjustCreditsBody) =>
        transport<AdminPlanPurchaseResponse, AdminAdjustCreditsBody>({
          method: 'POST',
          url: `/api/v1/super-admin/billing/organizations/${orgId}/plan/credits/adjust`,
          data: body,
        }),
      /** S-4: записать ручной платёж (externalRef обязателен, D-5). */
      recordPayment: (orgId: string, body: AdminRecordPaymentBody) =>
        transport<AdminRecordPaymentResponse, AdminRecordPaymentBody>({
          method: 'POST',
          url: `/api/v1/super-admin/billing/organizations/${orgId}/payments`,
          data: body,
        }),
      /** S-4: реверсировать платёж (исправления только реверсом). */
      reversePayment: (transactionId: string, body: AdminReversePaymentBody) =>
        transport<AdminRecordPaymentResponse, AdminReversePaymentBody>({
          method: 'POST',
          url: `/api/v1/super-admin/billing/payments/${transactionId}/reverse`,
          data: body,
        }),
      /** M-5 MANUAL-путь: подтвердить офлайн-оплату билета. */
      confirmTicketOrder: (orderId: string, body: AdminConfirmTicketBody) =>
        transport<AdminConfirmTicketResponse, AdminConfirmTicketBody>({
          method: 'POST',
          url: `/api/v1/super-admin/billing/ticket-orders/${orderId}/confirm`,
          data: body,
        }),
      /** M-7: сводка «к выплате» по организациям. */
      payoutsOwed: () =>
        transport<AdminPayoutsOwedResponse>({
          method: 'GET',
          url: '/api/v1/super-admin/billing/payouts/owed',
        }),
      /** M-7: зафиксировать выплату (referens платёжки обязателен). */
      recordPayout: (orgId: string, body: AdminRecordPayoutBody) =>
        transport<AdminRecordPayoutResponse, AdminRecordPayoutBody>({
          method: 'POST',
          url: `/api/v1/super-admin/billing/organizations/${orgId}/payouts`,
          data: body,
        }),
      /** S-5/S-6: установить per-org оверрайд (комиссия в [0,1200] bps). */
      setOverride: (orgId: string, body: AdminSetOverrideBody) =>
        transport<AdminSetOverrideResponse, AdminSetOverrideBody>({
          method: 'POST',
          url: `/api/v1/super-admin/billing/organizations/${orgId}/overrides`,
          data: body,
        }),
      /** S-5/S-6: снять оверрайд (причина обязательна). */
      revokeOverride: (
        orgId: string,
        key: string,
        body: AdminRevokeOverrideBody,
      ) =>
        transport<unknown, AdminRevokeOverrideBody>({
          method: 'POST',
          url: `/api/v1/super-admin/billing/organizations/${orgId}/overrides/${key}/revoke`,
          data: body,
        }),
      /** S-7: comp-грант монет (причина обязательна). */
      compGrant: (orgId: string, body: AdminCompGrantBody) =>
        transport<unknown, AdminCompGrantBody>({
          method: 'POST',
          url: `/api/v1/super-admin/billing/organizations/${orgId}/comp`,
          data: body,
        }),
      /** S-8: приостановить организацию (пакет D-1; причина обязательна). */
      suspendOrganization: (orgId: string, body: AdminSuspendBody) =>
        transport<unknown, AdminSuspendBody>({
          method: 'POST',
          url: `/api/v1/super-admin/billing/organizations/${orgId}/suspend`,
          data: body,
        }),
      /** S-8: снять приостановку. */
      reactivateOrganization: (orgId: string) =>
        transport<unknown>({
          method: 'POST',
          url: `/api/v1/super-admin/billing/organizations/${orgId}/reactivate`,
        }),
      /** S-11: фулфилмент featured-размещения (auto-снятие свипом). */
      fulfillFeatured: (orgId: string, body: AdminFulfillFeaturedBody) =>
        transport<unknown, AdminFulfillFeaturedBody>({
          method: 'POST',
          url: `/api/v1/super-admin/billing/organizations/${orgId}/ad-orders/featured`,
          data: body,
        }),
      /** S-11: все рекламные размещения. */
      listAdOrders: () =>
        transport<unknown>({
          method: 'GET',
          url: '/api/v1/super-admin/billing/ad-orders',
        }),
      /** S-13: лента аудита (фильтры action/targetId, пагинация). */
      listAudit: (params?: {
        action?: string;
        targetId?: string;
        page?: number;
        limit?: number;
      }) =>
        transport<AdminAuditListResponse>({
          method: 'GET',
          url: '/api/v1/super-admin/billing/audit',
          params,
        }),
      /** S-10: сводка выручки за период (тийины строками). */
      revenueSummary: (params?: { from?: string; to?: string }) =>
        transport<AdminRevenueSummaryResponse>({
          method: 'GET',
          url: '/api/v1/super-admin/billing/revenue/summary',
          params,
        }),
      /** S-9: обзор монетизации платформы. */
      overview: () =>
        transport<AdminOverviewResponse>({
          method: 'GET',
          url: '/api/v1/super-admin/billing/overview',
        }),
      /** S-16: правка цены/активации тарифа (аудит PRICE_SET). */
      updatePlanPricing: (key: string, body: AdminUpdatePlanPricingBody) =>
        transport<unknown, AdminUpdatePlanPricingBody>({
          method: 'POST',
          url: `/api/v1/super-admin/billing/plans/${key}/pricing`,
          data: body,
        }),
      /** S-16: правка цены/активации add-on SKU (аудит SKU_SET). */
      updateSkuPricing: (code: string, body: AdminUpdateSkuPricingBody) =>
        transport<unknown, AdminUpdateSkuPricingBody>({
          method: 'POST',
          url: `/api/v1/super-admin/billing/addon-skus/${code}/pricing`,
          data: body,
        }),
      /** S-19: текущее состояние тумблера. */
      getEnforcement: () =>
        transport<AdminGetEnforcementResponse>({
          method: 'GET',
          url: '/api/v1/super-admin/billing/enforcement',
        }),
      /** S-19: мастер-переключатель тарифной системы. */
      setEnforcement: (body: AdminSetEnforcementBody) =>
        transport<AdminSetEnforcementResponse, AdminSetEnforcementBody>({
          method: 'POST',
          url: '/api/v1/super-admin/billing/enforcement',
          data: body,
        }),
      /** VIA: состояние тумблера + число пилотных организаций. */
      getViaState: () =>
        transport<AdminGetViaResponse>({
          method: 'GET',
          url: '/api/v1/super-admin/billing/via',
        }),
      /** VIA: глобальный тумблер провайдера (прод-активация). */
      setVia: (body: AdminSetViaBody) =>
        transport<AdminSetViaResponse, AdminSetViaBody>({
          method: 'POST',
          url: '/api/v1/super-admin/billing/via',
          data: body,
        }),
    },
  };
}
