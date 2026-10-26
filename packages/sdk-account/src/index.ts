import type {
  ApiTransport,
  OperationQuery,
  OperationRequestBody,
  OperationSuccessResponse,
} from "@eventflow/api-contracts";

type SessionMeResponse = OperationSuccessResponse<"/api/v1/session/me", "get">;
type SessionV2Response = OperationSuccessResponse<"/api/v2/session/me", "get">;
type ScopeContextV2Response = OperationSuccessResponse<
  "/api/v2/session/context",
  "get"
>;
export type EventFlowScope = "personal" | `organization:${string}`;
type AccountProfileResponse = OperationSuccessResponse<
  "/api/v1/account/me",
  "get"
>;
type UpdateProfileBody = OperationRequestBody<"/api/v1/account/me", "patch">;
type UpdatePrivacyBody = OperationRequestBody<
  "/api/v1/account/me/privacy",
  "patch"
>;
type AccountExportResponse = OperationSuccessResponse<
  "/api/v1/account/me/export",
  "get"
>;
type MyInvitesResponse = OperationSuccessResponse<
  "/api/v1/organizations/invites/mine",
  "get"
>;
type AcceptMyInviteResponse = OperationSuccessResponse<
  "/api/v1/organizations/invites/mine/{inviteId}/accept",
  "post"
>;
type DeclineMyInviteBody = OperationRequestBody<
  "/api/v1/organizations/invites/mine/{inviteId}/decline",
  "post"
>;
type CalendarQuery = OperationQuery<"/api/v1/account/me/calendar", "get">;
type CalendarResponse = OperationSuccessResponse<
  "/api/v1/account/me/calendar",
  "get"
>;
type CalendarEventsQuery = OperationQuery<
  "/api/v1/account/me/calendar/events",
  "get"
>;
type CalendarEventsResponse = OperationSuccessResponse<
  "/api/v1/account/me/calendar/events",
  "get"
>;
type CertificatesQuery = OperationQuery<
  "/api/v1/account/me/certificates",
  "get"
>;
type CertificatesResponse = OperationSuccessResponse<
  "/api/v1/account/me/certificates",
  "get"
>;
type CertificatesStatsResponse = OperationSuccessResponse<
  "/api/v1/account/me/certificates/stats",
  "get"
>;
type CertificateByIdResponse = OperationSuccessResponse<
  "/api/v1/account/me/certificates/{id}",
  "get"
>;
type CreateCertificateBody = OperationRequestBody<
  "/api/v1/account/me/certificates",
  "post"
>;
type UpdateCertificateBody = OperationRequestBody<
  "/api/v1/account/me/certificates/{id}",
  "patch"
>;
type SavedArticlesQuery = OperationQuery<"/api/v1/account/me/articles", "get">;
type SavedArticlesResponse = OperationSuccessResponse<
  "/api/v1/account/me/articles",
  "get"
>;
type SaveArticleBody = OperationRequestBody<
  "/api/v1/account/me/articles",
  "post"
>;
type DeleteArticleByUrlQuery = OperationQuery<
  "/api/v1/account/me/articles",
  "delete"
>;
type CheckArticleQuery = OperationQuery<
  "/api/v1/account/me/articles/check",
  "get"
>;
type FollowingOrganizationsQuery = OperationQuery<
  "/api/v1/account/me/following-organizations",
  "get"
>;
type FollowingOrganizationsResponse = OperationSuccessResponse<
  "/api/v1/account/me/following-organizations",
  "get"
>;
type SavedEventsQuery = OperationQuery<
  "/api/v1/account/me/saved-events",
  "get"
>;
type SavedEventsResponse = OperationSuccessResponse<
  "/api/v1/account/me/saved-events",
  "get"
>;
type SavedEventCheckResponse = OperationSuccessResponse<
  "/api/v1/account/me/saved-events/{eventId}/check",
  "get"
>;
type SavedBlogPostsQuery = OperationQuery<
  "/api/v1/account/me/saved-blog-posts",
  "get"
>;
type SavedBlogPostsResponse = OperationSuccessResponse<
  "/api/v1/account/me/saved-blog-posts",
  "get"
>;
type SavedBlogPostCheckResponse = OperationSuccessResponse<
  "/api/v1/account/me/saved-blog-posts/{postId}/check",
  "get"
>;
type UserEventsQuery = OperationQuery<"/api/v1/account/me/events", "get">;
type UserEventsResponse = OperationSuccessResponse<
  "/api/v1/account/me/events",
  "get"
>;
type UserEventsStatsResponse = OperationSuccessResponse<
  "/api/v1/account/me/events/stats",
  "get"
>;
type IsFollowingOrganizationResponse = OperationSuccessResponse<
  "/api/v1/organizations/{id}/is-following",
  "get"
>;
type MeOrganizationsResponse = OperationSuccessResponse<
  "/api/v1/me/organizations",
  "get"
>;
type EnterWorkspaceResponse = OperationSuccessResponse<
  "/api/v1/me/organizations/{organizationId}/session",
  "post"
>;
// Push-устройства (BL-08/BL-25) и матрица преференсов уведомлений (BL-23).
type RegisterDeviceBody = OperationRequestBody<
  "/api/v1/me/devices/{installationId}",
  "put"
>;
// Инбокс участника (CONTRACT_DIFF §3): AccountNotification, скоуп личного
// Account — работает и под org-scoped токеном.
type AccountNotificationsQuery = OperationQuery<
  "/api/v1/me/notifications",
  "get"
>;
type AccountNotificationsResponse = OperationSuccessResponse<
  "/api/v1/me/notifications",
  "get"
>;
type AccountUnreadCountResponse = OperationSuccessResponse<
  "/api/v1/me/notifications/unread-count",
  "get"
>;
type AccountMarkReadBody = OperationRequestBody<
  "/api/v1/me/notifications/read",
  "patch"
>;
type AccountMarkReadResponse = OperationSuccessResponse<
  "/api/v1/me/notifications/read",
  "patch"
>;
type NotificationPreferencesResponse = OperationSuccessResponse<
  "/api/v1/me/notification-preferences",
  "get"
>;
type UpdateNotificationPreferencesBody = OperationRequestBody<
  "/api/v1/me/notification-preferences",
  "patch"
>;

export function createAccountSdk(transport: ApiTransport) {
  return {
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
    // Account-centric "me": the organizations the signed-in account belongs to,
    // and switching into a specific org workspace (returns an org-scoped token).
    me: {
      organizations: () =>
        transport<MeOrganizationsResponse>({
          method: "GET",
          url: "/api/v1/me/organizations",
        }),
      enterWorkspace: (organizationId: string) =>
        transport<EnterWorkspaceResponse>({
          method: "POST",
          url: `/api/v1/me/organizations/${organizationId}/session`,
        }),
      /** Приглашения в команду, адресованные email текущего аккаунта. */
      invites: () =>
        transport<MyInvitesResponse>({
          method: "GET",
          url: "/api/v1/organizations/invites/mine",
        }),
      /** Принять своё приглашение из кабинета — токен из письма не нужен. */
      acceptInvite: (inviteId: string) =>
        transport<AcceptMyInviteResponse>({
          method: "POST",
          url: `/api/v1/organizations/invites/mine/${inviteId}/accept`,
        }),
      /** Отказаться от приглашения; комментарий необязателен. */
      declineInvite: (inviteId: string, body: DeclineMyInviteBody) =>
        transport<void, DeclineMyInviteBody>({
          method: "POST",
          url: `/api/v1/organizations/invites/mine/${inviteId}/decline`,
          data: body,
        }),
    },
    devices: {
      /** PUT-upsert по installationId: регистрация/ротация Expo-токена, смена
       *  локали, повторный login. Идемпотентен (204). */
      registerDevice: (installationId: string, body: RegisterDeviceBody) =>
        transport<void, RegisterDeviceBody>({
          method: "PUT",
          url: `/api/v1/me/devices/${installationId}`,
          data: body,
        }),
      /** Отвязка при logout — зовётся ДО чистки сессии. Идемпотентно (204). */
      removeDevice: (installationId: string) =>
        transport<void>({
          method: "DELETE",
          url: `/api/v1/me/devices/${installationId}`,
        }),
    },
    notifications: {
      /** Инбокс участника, свежие сверху; `unread: true` — только непрочитанные. */
      list: (query?: AccountNotificationsQuery) =>
        transport<AccountNotificationsResponse>({
          method: "GET",
          url: "/api/v1/me/notifications",
          params: query as Record<string, unknown> | undefined,
        }),
      /** Источник истины для badge приложения — дешёвый счётчик, не вся лента. */
      unreadCount: () =>
        transport<AccountUnreadCountResponse>({
          method: "GET",
          url: "/api/v1/me/notifications/unread-count",
        }),
      /** Пометить прочитанным: {ids} либо пустое тело = весь инбокс. Ответ —
       *  свежий unread-count. */
      markRead: (body?: AccountMarkReadBody) =>
        transport<AccountMarkReadResponse, AccountMarkReadBody>({
          method: "PATCH",
          url: "/api/v1/me/notifications/read",
          data: body ?? {},
        }),
    },
    notificationPreferences: {
      /** Полная матрица с эффективными значениями; transactional-строка locked. */
      getMatrix: () =>
        transport<NotificationPreferencesResponse>({
          method: "GET",
          url: "/api/v1/me/notification-preferences",
        }),
      /** Частичное обновление {key, channel, enabled}[]; ответ — полная матрица. */
      update: (body: UpdateNotificationPreferencesBody) =>
        transport<
          NotificationPreferencesResponse,
          UpdateNotificationPreferencesBody
        >({
          method: "PATCH",
          url: "/api/v1/me/notification-preferences",
          data: body,
        }),
    },
    account: {
      getMe: () =>
        transport<AccountProfileResponse>({
          method: "GET",
          url: "/api/v1/account/me",
        }),
      updateMe: (body: UpdateProfileBody) =>
        transport<AccountProfileResponse, UpdateProfileBody>({
          method: "PATCH",
          url: "/api/v1/account/me",
          data: body,
        }),
      uploadAvatar: (file: File) => {
        const data = new FormData();
        data.append("avatar", file);
        return transport<AccountProfileResponse, FormData>({
          method: "POST",
          url: "/api/v1/account/me/avatar",
          data,
        });
      },
      deleteAvatar: () =>
        transport<AccountProfileResponse>({
          method: "DELETE",
          url: "/api/v1/account/me/avatar",
        }),
      updatePrivacy: (body: UpdatePrivacyBody) =>
        transport<AccountProfileResponse, UpdatePrivacyBody>({
          method: "PATCH",
          url: "/api/v1/account/me/privacy",
          data: body,
        }),
      exportData: () =>
        transport<AccountExportResponse>({
          method: "GET",
          url: "/api/v1/account/me/export",
        }),
      completeOnboarding: () =>
        transport<AccountProfileResponse>({
          method: "POST",
          url: "/api/v1/account/me/complete-onboarding",
        }),
      completeProfileInfo: () =>
        transport<AccountProfileResponse>({
          method: "POST",
          url: "/api/v1/account/me/complete-profile-info",
        }),
      deleteMe: () =>
        transport<void>({
          method: "DELETE",
          url: "/api/v1/account/me",
        }),
    },
    calendar: {
      getCalendar: (query: CalendarQuery) =>
        transport<CalendarResponse>({
          method: "GET",
          url: "/api/v1/account/me/calendar",
          params: query as Record<string, unknown> | undefined,
        }),
      getCalendarEvents: (query: CalendarEventsQuery) =>
        transport<CalendarEventsResponse>({
          method: "GET",
          url: "/api/v1/account/me/calendar/events",
          params: query as Record<string, unknown> | undefined,
        }),
    },
    certificates: {
      getCertificates: (query?: CertificatesQuery) =>
        transport<CertificatesResponse>({
          method: "GET",
          url: "/api/v1/account/me/certificates",
          params: query as Record<string, unknown> | undefined,
        }),
      getStats: () =>
        transport<CertificatesStatsResponse>({
          method: "GET",
          url: "/api/v1/account/me/certificates/stats",
        }),
      getCertificateById: (id: string) =>
        transport<CertificateByIdResponse>({
          method: "GET",
          url: `/api/v1/account/me/certificates/${id}`,
        }),
      createCertificate: (body: CreateCertificateBody) =>
        transport<CertificateByIdResponse, CreateCertificateBody>({
          method: "POST",
          url: "/api/v1/account/me/certificates",
          data: body,
        }),
      updateCertificate: (id: string, body: UpdateCertificateBody) =>
        transport<CertificateByIdResponse, UpdateCertificateBody>({
          method: "PATCH",
          url: `/api/v1/account/me/certificates/${id}`,
          data: body,
        }),
      deleteCertificate: (id: string) =>
        transport<void>({
          method: "DELETE",
          url: `/api/v1/account/me/certificates/${id}`,
        }),
      downloadCertificate: (id: string) =>
        transport<unknown>({
          method: "GET",
          url: `/api/v1/certificates/${id}/download`,
          responseType: "blob",
        }),
    },
    articles: {
      getArticles: (query?: SavedArticlesQuery) =>
        transport<SavedArticlesResponse>({
          method: "GET",
          url: "/api/v1/account/me/articles",
          params: query as Record<string, unknown> | undefined,
        }),
      saveArticle: (body: SaveArticleBody) =>
        transport<
          OperationSuccessResponse<"/api/v1/account/me/articles", "post">,
          SaveArticleBody
        >({
          method: "POST",
          url: "/api/v1/account/me/articles",
          data: body,
        }),
      checkArticle: (query: CheckArticleQuery) =>
        transport<
          OperationSuccessResponse<"/api/v1/account/me/articles/check", "get">
        >({
          method: "GET",
          url: "/api/v1/account/me/articles/check",
          params: query as Record<string, unknown> | undefined,
        }),
      deleteArticleById: (id: string) =>
        transport<void>({
          method: "DELETE",
          url: `/api/v1/account/me/articles/${id}`,
        }),
      deleteArticleByUrl: (query: DeleteArticleByUrlQuery) =>
        transport<void>({
          method: "DELETE",
          url: "/api/v1/account/me/articles",
          params: query as Record<string, unknown> | undefined,
        }),
    },
    followingOrganizations: {
      getFollowingOrganizations: (query?: FollowingOrganizationsQuery) =>
        transport<FollowingOrganizationsResponse>({
          method: "GET",
          url: "/api/v1/account/me/following-organizations",
          params: query as Record<string, unknown> | undefined,
        }),
      follow: (organizationId: string) =>
        transport<void>({
          method: "POST",
          url: `/api/v1/organizations/${organizationId}/follow`,
        }),
      unfollow: (organizationId: string) =>
        transport<void>({
          method: "DELETE",
          url: `/api/v1/organizations/${organizationId}/unfollow`,
        }),
      isFollowing: (organizationId: string) =>
        transport<IsFollowingOrganizationResponse>({
          method: "GET",
          url: `/api/v1/organizations/${organizationId}/is-following`,
        }),
    },
    savedEvents: {
      getSavedEvents: (query?: SavedEventsQuery) =>
        transport<SavedEventsResponse>({
          method: "GET",
          url: "/api/v1/account/me/saved-events",
          params: query as Record<string, unknown> | undefined,
        }),
      saveEvent: (eventId: string) =>
        transport<
          OperationSuccessResponse<
            "/api/v1/account/me/saved-events/{eventId}",
            "post"
          >
        >({
          method: "POST",
          url: `/api/v1/account/me/saved-events/${eventId}`,
        }),
      unsaveEvent: (eventId: string) =>
        transport<{ message: string }>({
          method: "DELETE",
          url: `/api/v1/account/me/saved-events/${eventId}`,
        }),
      checkSavedEvent: (eventId: string) =>
        transport<SavedEventCheckResponse>({
          method: "GET",
          url: `/api/v1/account/me/saved-events/${eventId}/check`,
        }),
    },
    savedBlogPosts: {
      getSavedPosts: (query?: SavedBlogPostsQuery) =>
        transport<SavedBlogPostsResponse>({
          method: "GET",
          url: "/api/v1/account/me/saved-blog-posts",
          params: query as Record<string, unknown> | undefined,
        }),
      savePost: (postId: string) =>
        transport<
          OperationSuccessResponse<
            "/api/v1/account/me/saved-blog-posts/{postId}",
            "post"
          >
        >({
          method: "POST",
          url: `/api/v1/account/me/saved-blog-posts/${postId}`,
        }),
      unsavePost: (postId: string) =>
        transport<
          OperationSuccessResponse<
            "/api/v1/account/me/saved-blog-posts/{postId}",
            "delete"
          >
        >({
          method: "DELETE",
          url: `/api/v1/account/me/saved-blog-posts/${postId}`,
        }),
      checkSavedPost: (postId: string) =>
        transport<SavedBlogPostCheckResponse>({
          method: "GET",
          url: `/api/v1/account/me/saved-blog-posts/${postId}/check`,
        }),
    },
    userEvents: {
      getUserEvents: (query?: UserEventsQuery) =>
        transport<UserEventsResponse>({
          method: "GET",
          url: "/api/v1/account/me/events",
          params: query as Record<string, unknown> | undefined,
        }),
      getUserEventsStats: () =>
        transport<UserEventsStatsResponse>({
          method: "GET",
          url: "/api/v1/account/me/events/stats",
        }),
    },
  };
}
