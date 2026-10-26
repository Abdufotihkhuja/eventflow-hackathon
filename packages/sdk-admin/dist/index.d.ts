import type { ApiTransport, OperationPathParams, OperationQuery, OperationRequestBody } from '@eventflow/api-contracts';
type AdminActivatePlanBody = OperationRequestBody<'/api/v1/super-admin/billing/organizations/{orgId}/plan/activate', 'post'>;
type AdminSetEnforcementBody = OperationRequestBody<'/api/v1/super-admin/billing/enforcement', 'post'>;
type AdminSetViaBody = OperationRequestBody<'/api/v1/super-admin/billing/via', 'post'>;
type AdminUpdatePlanPricingBody = OperationRequestBody<'/api/v1/super-admin/billing/plans/{key}/pricing', 'post'>;
type AdminUpdateSkuPricingBody = OperationRequestBody<'/api/v1/super-admin/billing/addon-skus/{code}/pricing', 'post'>;
type AdminFulfillFeaturedBody = OperationRequestBody<'/api/v1/super-admin/billing/organizations/{orgId}/ad-orders/featured', 'post'>;
type AdminExtendPlanBody = OperationRequestBody<'/api/v1/super-admin/billing/organizations/{orgId}/plan/extend', 'post'>;
type AdminExpirePlanBody = OperationRequestBody<'/api/v1/super-admin/billing/organizations/{orgId}/plan/expire', 'post'>;
type AdminAdjustCreditsBody = OperationRequestBody<'/api/v1/super-admin/billing/organizations/{orgId}/plan/credits/adjust', 'post'>;
type AdminRecordPaymentBody = OperationRequestBody<'/api/v1/super-admin/billing/organizations/{orgId}/payments', 'post'>;
type AdminReversePaymentBody = OperationRequestBody<'/api/v1/super-admin/billing/payments/{transactionId}/reverse', 'post'>;
type AdminConfirmTicketBody = OperationRequestBody<'/api/v1/super-admin/billing/ticket-orders/{orderId}/confirm', 'post'>;
type AdminRecordPayoutBody = OperationRequestBody<'/api/v1/super-admin/billing/organizations/{orgId}/payouts', 'post'>;
type AdminSetOverrideBody = OperationRequestBody<'/api/v1/super-admin/billing/organizations/{orgId}/overrides', 'post'>;
type AdminRevokeOverrideBody = OperationRequestBody<'/api/v1/super-admin/billing/organizations/{orgId}/overrides/{key}/revoke', 'post'>;
type AdminCompGrantBody = OperationRequestBody<'/api/v1/super-admin/billing/organizations/{orgId}/comp', 'post'>;
type AdminSuspendBody = OperationRequestBody<'/api/v1/super-admin/billing/organizations/{orgId}/suspend', 'post'>;
type SuperAdminLoginBody = OperationRequestBody<'/api/v1/auth/superadmin/login', 'post'>;
type RequestElevationBody = OperationRequestBody<'/api/v1/super-admin/elevations', 'post'>;
type ElevationPath = OperationPathParams<'/api/v1/super-admin/elevations/{id}/approve', 'post'>;
type ProvisionOrganizationBody = OperationRequestBody<'/api/v1/super-admin/organizations/provision', 'post'>;
type CreateSuperAdminBody = OperationRequestBody<'/api/v1/super-admin/admins', 'post'>;
type AdminUsersQuery = OperationQuery<'/api/v1/super-admin/users', 'get'>;
type UpdateAdminUserBody = OperationRequestBody<'/api/v1/super-admin/users/{userId}', 'patch'>;
type AdminUserPath = OperationPathParams<'/api/v1/super-admin/users/{userId}', 'get'>;
type AdminOrganizationsQuery = OperationQuery<'/api/v1/super-admin/organizations', 'get'>;
type UpdateAdminOrganizationBody = OperationRequestBody<'/api/v1/super-admin/organizations/{orgId}', 'patch'>;
type RejectAdminOrganizationBody = OperationRequestBody<'/api/v1/super-admin/organizations/{orgId}/reject', 'post'>;
type AdminOrganizationPath = OperationPathParams<'/api/v1/super-admin/organizations/{orgId}', 'get'>;
type AdminEventsQuery = OperationQuery<'/api/v1/super-admin/events', 'get'>;
type UpdateAdminEventBody = OperationRequestBody<'/api/v1/super-admin/events/{eventId}', 'patch'>;
type SetAdminEventStatusBody = OperationRequestBody<'/api/v1/super-admin/events/{eventId}/status', 'patch'>;
type RejectAdminEventBody = OperationRequestBody<'/api/v1/super-admin/events/{eventId}/reject', 'post'>;
type AdminEventPath = OperationPathParams<'/api/v1/super-admin/events/{eventId}', 'get'>;
type VerificationCodesQuery = OperationQuery<'/api/v1/super-admin/verification-codes', 'get'>;
type AdminBlogPostsQuery = OperationQuery<'/api/v1/super-admin/blog-posts', 'get'>;
type RejectBlogPostBody = OperationRequestBody<'/api/v1/super-admin/blog-posts/{postId}/reject', 'post'>;
type AdminBlogPostPath = OperationPathParams<'/api/v1/super-admin/blog-posts/{postId}', 'get'>;
type AdminCategoriesQuery = OperationQuery<'/api/v1/super-admin/categories', 'get'>;
type CheckCategorySlugQuery = OperationQuery<'/api/v1/super-admin/categories/check-slug', 'get'>;
type CreateCategoryBody = OperationRequestBody<'/api/v1/super-admin/categories', 'post'>;
type UpdateCategoryBody = OperationRequestBody<'/api/v1/super-admin/categories/{id}', 'patch'>;
type CategoryPath = OperationPathParams<'/api/v1/super-admin/categories/{id}', 'get'>;
type BlogCategoryTranslations = Record<string, Partial<Record<'ru' | 'uz' | 'en', string>>>;
type BlogCategoryTranslationMeta = Record<string, Partial<Record<'ru' | 'uz' | 'en', {
    status: string;
    sourceLocale?: string;
}>>>;
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
    _count?: {
        posts: number;
    };
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
type CollectionsQuery = OperationQuery<'/api/v1/super-admin/collections', 'get'>;
type CheckCollectionSlugQuery = OperationQuery<'/api/v1/super-admin/collections/check-slug', 'get'>;
type AvailableCollectionEventsQuery = OperationQuery<'/api/v1/super-admin/collections/available-events', 'get'>;
type CreateCollectionBody = OperationRequestBody<'/api/v1/super-admin/collections', 'post'>;
type UpdateCollectionBody = OperationRequestBody<'/api/v1/super-admin/collections/{id}', 'patch'>;
type AddCollectionEventsBody = OperationRequestBody<'/api/v1/super-admin/collections/{id}/events', 'post'>;
type RemoveCollectionEventsBody = OperationRequestBody<'/api/v1/super-admin/collections/{id}/events', 'delete'>;
type ReorderCollectionEventsBody = OperationRequestBody<'/api/v1/super-admin/collections/{id}/events/reorder', 'patch'>;
type CollectionPath = OperationPathParams<'/api/v1/super-admin/collections/{id}', 'get'>;
type TranslateBatchBody = OperationRequestBody<'/api/v1/translations/batch', 'post'>;
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
export declare function createAdminSdk(transport: ApiTransport): {
    auth: {
        loginSuperAdmin: (body: SuperAdminLoginBody) => Promise<{
            accessToken: string;
            refreshToken: string;
            isNewUser?: boolean;
            isOnboardingCompleted?: boolean;
            emailVerificationRequired?: boolean;
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
    };
    elevations: {
        request: (body: RequestElevationBody) => Promise<{
            id: string;
            mode: import("@eventflow/api-contracts").PlatformElevationResponseDtoMode;
            token: string | null;
            expiresAt: string;
            approvalRequired: boolean;
        }>;
        approveWrite: (id: ElevationPath["id"]) => Promise<{
            id: string;
            mode: import("@eventflow/api-contracts").PlatformElevationResponseDtoMode;
            token: string | null;
            expiresAt: string;
            approvalRequired: boolean;
        }>;
    };
    profile: {
        createAdmin: (body: CreateSuperAdminBody) => Promise<never>;
    };
    stats: {
        getSystem: () => Promise<never>;
    };
    users: {
        getList: (query?: AdminUsersQuery) => Promise<never>;
        getById: (userId: AdminUserPath["userId"]) => Promise<never>;
        update: (userId: AdminUserPath["userId"], body: UpdateAdminUserBody) => Promise<never>;
        archive: (userId: AdminUserPath["userId"], body?: ArchiveAccountBody) => Promise<ArchiveUserResult>;
        restore: (userId: AdminUserPath["userId"]) => Promise<ArchiveUserResult>;
        hardDelete: (userId: AdminUserPath["userId"]) => Promise<HardDeleteUserResult>;
    };
    organizations: {
        provision: (body: ProvisionOrganizationBody) => Promise<{
            organizationId: string;
            accountId: string;
            membershipId: string;
            setupRequired: boolean;
        }>;
        getList: (query?: AdminOrganizationsQuery) => Promise<never>;
        getPending: (query?: AdminOrganizationsQuery) => Promise<never>;
        getById: (orgId: AdminOrganizationPath["orgId"]) => Promise<never>;
        update: (orgId: AdminOrganizationPath["orgId"], body: UpdateAdminOrganizationBody) => Promise<never>;
        approve: (orgId: AdminOrganizationPath["orgId"]) => Promise<never>;
        reject: (orgId: AdminOrganizationPath["orgId"], body?: RejectAdminOrganizationBody) => Promise<never>;
        archive: (orgId: AdminOrganizationPath["orgId"], body?: ArchiveAccountBody) => Promise<ArchiveOrganizationResult>;
        restore: (orgId: AdminOrganizationPath["orgId"]) => Promise<ArchiveOrganizationResult>;
        getDeletePreview: (orgId: AdminOrganizationPath["orgId"]) => Promise<OrganizationDeletePreview>;
        hardDelete: (orgId: AdminOrganizationPath["orgId"], body: HardDeleteOrganizationBody) => Promise<HardDeleteOrganizationResult>;
    };
    events: {
        getList: (query?: AdminEventsQuery) => Promise<never>;
        getPending: (query?: AdminEventsQuery) => Promise<never>;
        getById: (eventId: AdminEventPath["eventId"]) => Promise<never>;
        update: (eventId: AdminEventPath["eventId"], body: UpdateAdminEventBody) => Promise<never>;
        setStatus: (eventId: AdminEventPath["eventId"], body: SetAdminEventStatusBody) => Promise<never>;
        approve: (eventId: AdminEventPath["eventId"]) => Promise<void>;
        reject: (eventId: AdminEventPath["eventId"], body?: RejectAdminEventBody) => Promise<void>;
        toggleFeatured: (eventId: AdminEventPath["eventId"]) => Promise<never>;
        delete: (eventId: AdminEventPath["eventId"], body?: {
            reason?: string;
        }) => Promise<void>;
    };
    verificationCodes: {
        getList: (query?: VerificationCodesQuery) => Promise<{
            data?: {
                id?: string;
                code?: string;
                email?: string;
                type?: string;
                actorType?: string;
                actorId?: string | null;
                newEmail?: string | null;
                isUsed?: boolean;
                usedAt?: string | null;
                expiresAt?: string;
                attempts?: number;
                createdAt?: string;
            }[];
            total?: number;
            page?: number;
            limit?: number;
            totalPages?: number;
        }>;
    };
    blogPosts: {
        getList: (query?: AdminBlogPostsQuery) => Promise<never>;
        getPending: (query?: AdminBlogPostsQuery) => Promise<never>;
        getById: (postId: AdminBlogPostPath["postId"]) => Promise<never>;
        approve: (postId: AdminBlogPostPath["postId"]) => Promise<never>;
        reject: (postId: AdminBlogPostPath["postId"], body?: RejectBlogPostBody) => Promise<never>;
        delete: (postId: AdminBlogPostPath["postId"]) => Promise<void>;
    };
    categories: {
        getList: (query?: AdminCategoriesQuery) => Promise<never>;
        checkSlug: (query: CheckCategorySlugQuery) => Promise<never>;
        getById: (id: CategoryPath["id"]) => Promise<never>;
        uploadIcon: (file: File) => Promise<never>;
        create: (body: CreateCategoryBody) => Promise<never>;
        update: (id: CategoryPath["id"], body: UpdateCategoryBody) => Promise<never>;
        delete: (id: CategoryPath["id"]) => Promise<void>;
    };
    blogCategories: {
        getList: (query?: AdminBlogCategoriesQuery) => Promise<AdminBlogCategoriesResponse>;
        checkSlug: (query: CheckBlogCategorySlugQuery) => Promise<CheckBlogCategorySlugResponse>;
        getById: (id: string) => Promise<AdminBlogCategory>;
        create: (body: CreateBlogCategoryBody) => Promise<AdminBlogCategory>;
        update: (id: string, body: UpdateBlogCategoryBody) => Promise<AdminBlogCategory>;
        delete: (id: string) => Promise<void>;
    };
    collections: {
        getList: (query?: CollectionsQuery) => Promise<never>;
        checkSlug: (query: CheckCollectionSlugQuery) => Promise<never>;
        getAvailableEvents: (query?: AvailableCollectionEventsQuery) => Promise<never>;
        getById: (id: CollectionPath["id"]) => Promise<never>;
        getEvents: (id: CollectionPath["id"]) => Promise<never>;
        uploadCover: (file: File) => Promise<never>;
        create: (body: CreateCollectionBody) => Promise<never>;
        update: (id: CollectionPath["id"], body: UpdateCollectionBody) => Promise<never>;
        delete: (id: CollectionPath["id"]) => Promise<void>;
        addEvents: (id: CollectionPath["id"], body: AddCollectionEventsBody) => Promise<void>;
        removeEvents: (id: CollectionPath["id"], body: RemoveCollectionEventsBody) => Promise<void>;
        reorderEvents: (id: CollectionPath["id"], body: ReorderCollectionEventsBody) => Promise<void>;
    };
    translations: {
        translateBatch: (body: TranslateBatchBody) => Promise<{
            results: import("@eventflow/api-contracts").components["schemas"]["TranslationResultDto"][];
            summary: import("@eventflow/api-contracts").components["schemas"]["TranslationSummaryDto"];
        }>;
    };
    billing: {
        /** Биллинг-панель организации (S-1/S-2). */
        getOrgBilling: (orgId: string) => Promise<{
            status: import("@eventflow/api-contracts").components["schemas"]["BillingStatusDto"];
            entitlements: import("@eventflow/api-contracts").components["schemas"]["EntitlementsDto"];
            overrides: import("@eventflow/api-contracts").components["schemas"]["AdminOverrideDto"][];
            orders: import("@eventflow/api-contracts").components["schemas"]["BillingOrderDto"][];
        }>;
        /** Активация/смена тарифа (managed; creditMode обязателен при смене — §2.4). */
        activatePlan: (orgId: string, body: AdminActivatePlanBody) => Promise<never>;
        /** Очередь REQUESTED-заявок managed-фазы. */
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
        /** S-3: продлить период пакета на N дней. */
        extendPlan: (orgId: string, body: AdminExtendPlanBody) => Promise<never>;
        /** S-3: принудительно истечь пакет (немедленный START; причина обязательна). */
        expirePlan: (orgId: string, body: AdminExpirePlanBody) => Promise<never>;
        /** S-3: корректировка кредитов (append-only; причина обязательна). */
        adjustCredits: (orgId: string, body: AdminAdjustCreditsBody) => Promise<never>;
        /** S-4: записать ручной платёж (externalRef обязателен, D-5). */
        recordPayment: (orgId: string, body: AdminRecordPaymentBody) => Promise<{
            id: string;
            orderId: string;
            provider: import("@eventflow/api-contracts").PaymentTransactionDtoProvider;
            providerTxnId: string;
            status: import("@eventflow/api-contracts").PaymentTransactionDtoStatus;
            amountMinor: string;
            currency: import("@eventflow/api-contracts").PaymentTransactionDtoCurrency;
            createdAt: string;
        }>;
        /** S-4: реверсировать платёж (исправления только реверсом). */
        reversePayment: (transactionId: string, body: AdminReversePaymentBody) => Promise<{
            id: string;
            orderId: string;
            provider: import("@eventflow/api-contracts").PaymentTransactionDtoProvider;
            providerTxnId: string;
            status: import("@eventflow/api-contracts").PaymentTransactionDtoStatus;
            amountMinor: string;
            currency: import("@eventflow/api-contracts").PaymentTransactionDtoCurrency;
            createdAt: string;
        }>;
        /** M-5 MANUAL-путь: подтвердить офлайн-оплату билета. */
        confirmTicketOrder: (orderId: string, body: AdminConfirmTicketBody) => Promise<never>;
        /** M-7: сводка «к выплате» по организациям. */
        payoutsOwed: () => Promise<{
            organizationId: string;
            grossMinor: string;
            commissionMinor: string;
            paidOutMinor: string;
            owedMinor: string;
        }[]>;
        /** M-7: зафиксировать выплату (referens платёжки обязателен). */
        recordPayout: (orgId: string, body: AdminRecordPayoutBody) => Promise<never>;
        /** S-5/S-6: установить per-org оверрайд (комиссия в [0,1200] bps). */
        setOverride: (orgId: string, body: AdminSetOverrideBody) => Promise<never>;
        /** S-5/S-6: снять оверрайд (причина обязательна). */
        revokeOverride: (orgId: string, key: string, body: AdminRevokeOverrideBody) => Promise<unknown>;
        /** S-7: comp-грант монет (причина обязательна). */
        compGrant: (orgId: string, body: AdminCompGrantBody) => Promise<unknown>;
        /** S-8: приостановить организацию (пакет D-1; причина обязательна). */
        suspendOrganization: (orgId: string, body: AdminSuspendBody) => Promise<unknown>;
        /** S-8: снять приостановку. */
        reactivateOrganization: (orgId: string) => Promise<unknown>;
        /** S-11: фулфилмент featured-размещения (auto-снятие свипом). */
        fulfillFeatured: (orgId: string, body: AdminFulfillFeaturedBody) => Promise<unknown>;
        /** S-11: все рекламные размещения. */
        listAdOrders: () => Promise<unknown>;
        /** S-13: лента аудита (фильтры action/targetId, пагинация). */
        listAudit: (params?: {
            action?: string;
            targetId?: string;
            page?: number;
            limit?: number;
        }) => Promise<never>;
        /** S-10: сводка выручки за период (тийины строками). */
        revenueSummary: (params?: {
            from?: string;
            to?: string;
        }) => Promise<never>;
        /** S-9: обзор монетизации платформы. */
        overview: () => Promise<never>;
        /** S-16: правка цены/активации тарифа (аудит PRICE_SET). */
        updatePlanPricing: (key: string, body: AdminUpdatePlanPricingBody) => Promise<unknown>;
        /** S-16: правка цены/активации add-on SKU (аудит SKU_SET). */
        updateSkuPricing: (code: string, body: AdminUpdateSkuPricingBody) => Promise<unknown>;
        /** S-19: текущее состояние тумблера. */
        getEnforcement: () => Promise<never>;
        /** S-19: мастер-переключатель тарифной системы. */
        setEnforcement: (body: AdminSetEnforcementBody) => Promise<never>;
        /** VIA: состояние тумблера + число пилотных организаций. */
        getViaState: () => Promise<never>;
        /** VIA: глобальный тумблер провайдера (прод-активация). */
        setVia: (body: AdminSetViaBody) => Promise<never>;
    };
};
export {};
//# sourceMappingURL=index.d.ts.map