import type { ApiTransport, OperationQuery, OperationRequestBody } from "@eventflow/api-contracts";
export type EventFlowScope = "personal" | `organization:${string}`;
type UpdateProfileBody = OperationRequestBody<"/api/v1/account/me", "patch">;
type UpdatePrivacyBody = OperationRequestBody<"/api/v1/account/me/privacy", "patch">;
type DeclineMyInviteBody = OperationRequestBody<"/api/v1/organizations/invites/mine/{inviteId}/decline", "post">;
type CalendarQuery = OperationQuery<"/api/v1/account/me/calendar", "get">;
type CalendarEventsQuery = OperationQuery<"/api/v1/account/me/calendar/events", "get">;
type CertificatesQuery = OperationQuery<"/api/v1/account/me/certificates", "get">;
type CreateCertificateBody = OperationRequestBody<"/api/v1/account/me/certificates", "post">;
type UpdateCertificateBody = OperationRequestBody<"/api/v1/account/me/certificates/{id}", "patch">;
type SavedArticlesQuery = OperationQuery<"/api/v1/account/me/articles", "get">;
type SaveArticleBody = OperationRequestBody<"/api/v1/account/me/articles", "post">;
type DeleteArticleByUrlQuery = OperationQuery<"/api/v1/account/me/articles", "delete">;
type CheckArticleQuery = OperationQuery<"/api/v1/account/me/articles/check", "get">;
type FollowingOrganizationsQuery = OperationQuery<"/api/v1/account/me/following-organizations", "get">;
type SavedEventsQuery = OperationQuery<"/api/v1/account/me/saved-events", "get">;
type SavedBlogPostsQuery = OperationQuery<"/api/v1/account/me/saved-blog-posts", "get">;
type UserEventsQuery = OperationQuery<"/api/v1/account/me/events", "get">;
type RegisterDeviceBody = OperationRequestBody<"/api/v1/me/devices/{installationId}", "put">;
type AccountNotificationsQuery = OperationQuery<"/api/v1/me/notifications", "get">;
type AccountMarkReadBody = OperationRequestBody<"/api/v1/me/notifications/read", "patch">;
type UpdateNotificationPreferencesBody = OperationRequestBody<"/api/v1/me/notification-preferences", "patch">;
export declare function createAccountSdk(transport: ApiTransport): {
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
    me: {
        organizations: () => Promise<never>;
        enterWorkspace: (organizationId: string) => Promise<{
            accessToken: string;
            refreshToken: string;
            isNewUser?: boolean;
            isOnboardingCompleted?: boolean;
            emailVerificationRequired?: boolean;
        }>;
        /** Приглашения в команду, адресованные email текущего аккаунта. */
        invites: () => Promise<{
            id: string;
            organizationId: string;
            organizationName: string;
            organizationLogoUrl?: Record<string, never> | null;
            role: import("@eventflow/api-contracts").components["schemas"]["InviteRoleDto"];
            expiresAt: string;
            createdAt: string;
        }[]>;
        /** Принять своё приглашение из кабинета — токен из письма не нужен. */
        acceptInvite: (inviteId: string) => Promise<{
            code: string;
            organizationId: string;
            organizationName: string;
            organizationMemberId: string;
            role: import("@eventflow/api-contracts").components["schemas"]["InviteRoleDto"];
            requiresLogin: boolean;
        }>;
        /** Отказаться от приглашения; комментарий необязателен. */
        declineInvite: (inviteId: string, body: DeclineMyInviteBody) => Promise<void>;
    };
    devices: {
        /** PUT-upsert по installationId: регистрация/ротация Expo-токена, смена
         *  локали, повторный login. Идемпотентен (204). */
        registerDevice: (installationId: string, body: RegisterDeviceBody) => Promise<void>;
        /** Отвязка при logout — зовётся ДО чистки сессии. Идемпотентно (204). */
        removeDevice: (installationId: string) => Promise<void>;
    };
    notifications: {
        /** Инбокс участника, свежие сверху; `unread: true` — только непрочитанные. */
        list: (query?: AccountNotificationsQuery) => Promise<{
            data: import("@eventflow/api-contracts").components["schemas"]["AccountNotificationDto"][];
            total: number;
            unread: number;
        }>;
        /** Источник истины для badge приложения — дешёвый счётчик, не вся лента. */
        unreadCount: () => Promise<{
            count: number;
        }>;
        /** Пометить прочитанным: {ids} либо пустое тело = весь инбокс. Ответ —
         *  свежий unread-count. */
        markRead: (body?: AccountMarkReadBody) => Promise<{
            count: number;
        }>;
    };
    notificationPreferences: {
        /** Полная матрица с эффективными значениями; transactional-строка locked. */
        getMatrix: () => Promise<{
            preferences: import("@eventflow/api-contracts").components["schemas"]["NotificationPreferenceItemDto"][];
        }>;
        /** Частичное обновление {key, channel, enabled}[]; ответ — полная матрица. */
        update: (body: UpdateNotificationPreferencesBody) => Promise<{
            preferences: import("@eventflow/api-contracts").components["schemas"]["NotificationPreferenceItemDto"][];
        }>;
    };
    account: {
        getMe: () => Promise<{
            id: string;
            email: string;
            firstName: string | null;
            lastName: string | null;
            avatarUrl: string | null;
            phone: string | null;
            location: string | null;
            bio: string | null;
            isEmailVerified: boolean;
            isPublicProfile: boolean;
            isOnboardingCompleted: boolean;
            profileInfoCompleted: boolean;
            needsProfileInfo: boolean;
            gender: string | null;
            dateOfBirth: string | null;
            region: string | null;
            languages: string[];
            workOrStudyPlace: string | null;
            skills: string[];
            shortBio: string | null;
            linkedinUrl: string | null;
            instagramUrl: string | null;
            facebookUrl: string | null;
            websiteUrl: string | null;
            createdAt: string;
            updatedAt: string;
        }>;
        updateMe: (body: UpdateProfileBody) => Promise<{
            id: string;
            email: string;
            firstName: string | null;
            lastName: string | null;
            avatarUrl: string | null;
            phone: string | null;
            location: string | null;
            bio: string | null;
            isEmailVerified: boolean;
            isPublicProfile: boolean;
            isOnboardingCompleted: boolean;
            profileInfoCompleted: boolean;
            needsProfileInfo: boolean;
            gender: string | null;
            dateOfBirth: string | null;
            region: string | null;
            languages: string[];
            workOrStudyPlace: string | null;
            skills: string[];
            shortBio: string | null;
            linkedinUrl: string | null;
            instagramUrl: string | null;
            facebookUrl: string | null;
            websiteUrl: string | null;
            createdAt: string;
            updatedAt: string;
        }>;
        uploadAvatar: (file: File) => Promise<{
            id: string;
            email: string;
            firstName: string | null;
            lastName: string | null;
            avatarUrl: string | null;
            phone: string | null;
            location: string | null;
            bio: string | null;
            isEmailVerified: boolean;
            isPublicProfile: boolean;
            isOnboardingCompleted: boolean;
            profileInfoCompleted: boolean;
            needsProfileInfo: boolean;
            gender: string | null;
            dateOfBirth: string | null;
            region: string | null;
            languages: string[];
            workOrStudyPlace: string | null;
            skills: string[];
            shortBio: string | null;
            linkedinUrl: string | null;
            instagramUrl: string | null;
            facebookUrl: string | null;
            websiteUrl: string | null;
            createdAt: string;
            updatedAt: string;
        }>;
        deleteAvatar: () => Promise<{
            id: string;
            email: string;
            firstName: string | null;
            lastName: string | null;
            avatarUrl: string | null;
            phone: string | null;
            location: string | null;
            bio: string | null;
            isEmailVerified: boolean;
            isPublicProfile: boolean;
            isOnboardingCompleted: boolean;
            profileInfoCompleted: boolean;
            needsProfileInfo: boolean;
            gender: string | null;
            dateOfBirth: string | null;
            region: string | null;
            languages: string[];
            workOrStudyPlace: string | null;
            skills: string[];
            shortBio: string | null;
            linkedinUrl: string | null;
            instagramUrl: string | null;
            facebookUrl: string | null;
            websiteUrl: string | null;
            createdAt: string;
            updatedAt: string;
        }>;
        updatePrivacy: (body: UpdatePrivacyBody) => Promise<{
            id: string;
            email: string;
            firstName: string | null;
            lastName: string | null;
            avatarUrl: string | null;
            phone: string | null;
            location: string | null;
            bio: string | null;
            isEmailVerified: boolean;
            isPublicProfile: boolean;
            isOnboardingCompleted: boolean;
            profileInfoCompleted: boolean;
            needsProfileInfo: boolean;
            gender: string | null;
            dateOfBirth: string | null;
            region: string | null;
            languages: string[];
            workOrStudyPlace: string | null;
            skills: string[];
            shortBio: string | null;
            linkedinUrl: string | null;
            instagramUrl: string | null;
            facebookUrl: string | null;
            websiteUrl: string | null;
            createdAt: string;
            updatedAt: string;
        }>;
        exportData: () => Promise<never>;
        completeOnboarding: () => Promise<{
            id: string;
            email: string;
            firstName: string | null;
            lastName: string | null;
            avatarUrl: string | null;
            phone: string | null;
            location: string | null;
            bio: string | null;
            isEmailVerified: boolean;
            isPublicProfile: boolean;
            isOnboardingCompleted: boolean;
            profileInfoCompleted: boolean;
            needsProfileInfo: boolean;
            gender: string | null;
            dateOfBirth: string | null;
            region: string | null;
            languages: string[];
            workOrStudyPlace: string | null;
            skills: string[];
            shortBio: string | null;
            linkedinUrl: string | null;
            instagramUrl: string | null;
            facebookUrl: string | null;
            websiteUrl: string | null;
            createdAt: string;
            updatedAt: string;
        }>;
        completeProfileInfo: () => Promise<{
            id: string;
            email: string;
            firstName: string | null;
            lastName: string | null;
            avatarUrl: string | null;
            phone: string | null;
            location: string | null;
            bio: string | null;
            isEmailVerified: boolean;
            isPublicProfile: boolean;
            isOnboardingCompleted: boolean;
            profileInfoCompleted: boolean;
            needsProfileInfo: boolean;
            gender: string | null;
            dateOfBirth: string | null;
            region: string | null;
            languages: string[];
            workOrStudyPlace: string | null;
            skills: string[];
            shortBio: string | null;
            linkedinUrl: string | null;
            instagramUrl: string | null;
            facebookUrl: string | null;
            websiteUrl: string | null;
            createdAt: string;
            updatedAt: string;
        }>;
        deleteMe: () => Promise<void>;
    };
    calendar: {
        getCalendar: (query: CalendarQuery) => Promise<{
            year: number;
            month: number;
            eventsCount: number;
            travelsCount: number;
            days: import("@eventflow/api-contracts").components["schemas"]["CalendarDayDto"][];
        }>;
        getCalendarEvents: (query: CalendarEventsQuery) => Promise<{
            date: string;
            count: number;
            events: import("@eventflow/api-contracts").components["schemas"]["CalendarEventItemDto"][];
        }>;
    };
    certificates: {
        getCertificates: (query?: CertificatesQuery) => Promise<{
            stats: import("@eventflow/api-contracts").components["schemas"]["CertificatesStatsDto"];
            certificates: import("@eventflow/api-contracts").components["schemas"]["UserCertificateDto"][];
            eventCertificates: import("@eventflow/api-contracts").components["schemas"]["EventCertificateItemDto"][];
        }>;
        getStats: () => Promise<{
            totalCertificates: number;
            verifiedCertificates: number;
            totalTrainingHours: number;
        }>;
        getCertificateById: (id: string) => Promise<{
            id: string;
            title: string;
            provider: string;
            description: Record<string, never> | null;
            issueDate: string;
            expiryDate: Record<string, never> | null;
            trainingHours: number;
            credentialId: Record<string, never> | null;
            credentialUrl: Record<string, never> | null;
            certificateUrl: Record<string, never> | null;
            skills: string[];
            isVerified: boolean;
            color: Record<string, never> | null;
            createdAt: string;
        }>;
        createCertificate: (body: CreateCertificateBody) => Promise<{
            id: string;
            title: string;
            provider: string;
            description: Record<string, never> | null;
            issueDate: string;
            expiryDate: Record<string, never> | null;
            trainingHours: number;
            credentialId: Record<string, never> | null;
            credentialUrl: Record<string, never> | null;
            certificateUrl: Record<string, never> | null;
            skills: string[];
            isVerified: boolean;
            color: Record<string, never> | null;
            createdAt: string;
        }>;
        updateCertificate: (id: string, body: UpdateCertificateBody) => Promise<{
            id: string;
            title: string;
            provider: string;
            description: Record<string, never> | null;
            issueDate: string;
            expiryDate: Record<string, never> | null;
            trainingHours: number;
            credentialId: Record<string, never> | null;
            credentialUrl: Record<string, never> | null;
            certificateUrl: Record<string, never> | null;
            skills: string[];
            isVerified: boolean;
            color: Record<string, never> | null;
            createdAt: string;
        }>;
        deleteCertificate: (id: string) => Promise<void>;
        downloadCertificate: (id: string) => Promise<unknown>;
    };
    articles: {
        getArticles: (query?: SavedArticlesQuery) => Promise<{
            total: number;
            page: number;
            limit: number;
            articles: import("@eventflow/api-contracts").components["schemas"]["SavedArticleResponseDto"][];
        }>;
        saveArticle: (body: SaveArticleBody) => Promise<never>;
        checkArticle: (query: CheckArticleQuery) => Promise<never>;
        deleteArticleById: (id: string) => Promise<void>;
        deleteArticleByUrl: (query: DeleteArticleByUrlQuery) => Promise<void>;
    };
    followingOrganizations: {
        getFollowingOrganizations: (query?: FollowingOrganizationsQuery) => Promise<{
            id: string;
            name: string;
            companyName: string;
            logoUrl?: string;
            description?: string;
            website?: string;
            verificationStatus: import("@eventflow/api-contracts").FollowingOrganizationEntityVerificationStatus;
            followedAt: string;
        }[]>;
        follow: (organizationId: string) => Promise<void>;
        unfollow: (organizationId: string) => Promise<void>;
        isFollowing: (organizationId: string) => Promise<{
            isFollowing?: boolean;
        }>;
    };
    savedEvents: {
        getSavedEvents: (query?: SavedEventsQuery) => Promise<{
            data: import("@eventflow/api-contracts").components["schemas"]["SavedEventItemDto"][];
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        }>;
        saveEvent: (eventId: string) => Promise<never>;
        unsaveEvent: (eventId: string) => Promise<{
            message: string;
        }>;
        checkSavedEvent: (eventId: string) => Promise<never>;
    };
    savedBlogPosts: {
        getSavedPosts: (query?: SavedBlogPostsQuery) => Promise<never>;
        savePost: (postId: string) => Promise<never>;
        unsavePost: (postId: string) => Promise<never>;
        checkSavedPost: (postId: string) => Promise<never>;
    };
    userEvents: {
        getUserEvents: (query?: UserEventsQuery) => Promise<{
            data: import("@eventflow/api-contracts").components["schemas"]["UserEventItemDto"][];
            total: number;
            page: number;
            limit: number;
            totalPages: number;
            stats: import("@eventflow/api-contracts").components["schemas"]["UserEventsStatsDto"];
        }>;
        getUserEventsStats: () => Promise<{
            totalEvents: number;
            approvedEvents: number;
            pendingEvents: number;
            attendedEvents: number;
            cancelledEvents: number;
            certificatesCount: number;
        }>;
    };
};
export {};
//# sourceMappingURL=index.d.ts.map