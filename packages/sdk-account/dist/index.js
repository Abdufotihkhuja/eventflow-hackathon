export function createAccountSdk(transport) {
    return {
        session: {
            getMe: () => transport({
                method: "GET",
                url: "/api/v1/session/me",
            }),
            getScopes: () => transport({
                method: "GET",
                url: "/api/v2/session/me",
            }),
            getContext: (scope) => transport({
                method: "GET",
                url: "/api/v2/session/context",
                headers: { "X-EventFlow-Scope": scope },
            }),
        },
        // Account-centric "me": the organizations the signed-in account belongs to,
        // and switching into a specific org workspace (returns an org-scoped token).
        me: {
            organizations: () => transport({
                method: "GET",
                url: "/api/v1/me/organizations",
            }),
            enterWorkspace: (organizationId) => transport({
                method: "POST",
                url: `/api/v1/me/organizations/${organizationId}/session`,
            }),
            /** Приглашения в команду, адресованные email текущего аккаунта. */
            invites: () => transport({
                method: "GET",
                url: "/api/v1/organizations/invites/mine",
            }),
            /** Принять своё приглашение из кабинета — токен из письма не нужен. */
            acceptInvite: (inviteId) => transport({
                method: "POST",
                url: `/api/v1/organizations/invites/mine/${inviteId}/accept`,
            }),
            /** Отказаться от приглашения; комментарий необязателен. */
            declineInvite: (inviteId, body) => transport({
                method: "POST",
                url: `/api/v1/organizations/invites/mine/${inviteId}/decline`,
                data: body,
            }),
        },
        devices: {
            /** PUT-upsert по installationId: регистрация/ротация Expo-токена, смена
             *  локали, повторный login. Идемпотентен (204). */
            registerDevice: (installationId, body) => transport({
                method: "PUT",
                url: `/api/v1/me/devices/${installationId}`,
                data: body,
            }),
            /** Отвязка при logout — зовётся ДО чистки сессии. Идемпотентно (204). */
            removeDevice: (installationId) => transport({
                method: "DELETE",
                url: `/api/v1/me/devices/${installationId}`,
            }),
        },
        notifications: {
            /** Инбокс участника, свежие сверху; `unread: true` — только непрочитанные. */
            list: (query) => transport({
                method: "GET",
                url: "/api/v1/me/notifications",
                params: query,
            }),
            /** Источник истины для badge приложения — дешёвый счётчик, не вся лента. */
            unreadCount: () => transport({
                method: "GET",
                url: "/api/v1/me/notifications/unread-count",
            }),
            /** Пометить прочитанным: {ids} либо пустое тело = весь инбокс. Ответ —
             *  свежий unread-count. */
            markRead: (body) => transport({
                method: "PATCH",
                url: "/api/v1/me/notifications/read",
                data: body ?? {},
            }),
        },
        notificationPreferences: {
            /** Полная матрица с эффективными значениями; transactional-строка locked. */
            getMatrix: () => transport({
                method: "GET",
                url: "/api/v1/me/notification-preferences",
            }),
            /** Частичное обновление {key, channel, enabled}[]; ответ — полная матрица. */
            update: (body) => transport({
                method: "PATCH",
                url: "/api/v1/me/notification-preferences",
                data: body,
            }),
        },
        account: {
            getMe: () => transport({
                method: "GET",
                url: "/api/v1/account/me",
            }),
            updateMe: (body) => transport({
                method: "PATCH",
                url: "/api/v1/account/me",
                data: body,
            }),
            uploadAvatar: (file) => {
                const data = new FormData();
                data.append("avatar", file);
                return transport({
                    method: "POST",
                    url: "/api/v1/account/me/avatar",
                    data,
                });
            },
            deleteAvatar: () => transport({
                method: "DELETE",
                url: "/api/v1/account/me/avatar",
            }),
            updatePrivacy: (body) => transport({
                method: "PATCH",
                url: "/api/v1/account/me/privacy",
                data: body,
            }),
            exportData: () => transport({
                method: "GET",
                url: "/api/v1/account/me/export",
            }),
            completeOnboarding: () => transport({
                method: "POST",
                url: "/api/v1/account/me/complete-onboarding",
            }),
            completeProfileInfo: () => transport({
                method: "POST",
                url: "/api/v1/account/me/complete-profile-info",
            }),
            deleteMe: () => transport({
                method: "DELETE",
                url: "/api/v1/account/me",
            }),
        },
        calendar: {
            getCalendar: (query) => transport({
                method: "GET",
                url: "/api/v1/account/me/calendar",
                params: query,
            }),
            getCalendarEvents: (query) => transport({
                method: "GET",
                url: "/api/v1/account/me/calendar/events",
                params: query,
            }),
        },
        certificates: {
            getCertificates: (query) => transport({
                method: "GET",
                url: "/api/v1/account/me/certificates",
                params: query,
            }),
            getStats: () => transport({
                method: "GET",
                url: "/api/v1/account/me/certificates/stats",
            }),
            getCertificateById: (id) => transport({
                method: "GET",
                url: `/api/v1/account/me/certificates/${id}`,
            }),
            createCertificate: (body) => transport({
                method: "POST",
                url: "/api/v1/account/me/certificates",
                data: body,
            }),
            updateCertificate: (id, body) => transport({
                method: "PATCH",
                url: `/api/v1/account/me/certificates/${id}`,
                data: body,
            }),
            deleteCertificate: (id) => transport({
                method: "DELETE",
                url: `/api/v1/account/me/certificates/${id}`,
            }),
            downloadCertificate: (id) => transport({
                method: "GET",
                url: `/api/v1/certificates/${id}/download`,
                responseType: "blob",
            }),
        },
        articles: {
            getArticles: (query) => transport({
                method: "GET",
                url: "/api/v1/account/me/articles",
                params: query,
            }),
            saveArticle: (body) => transport({
                method: "POST",
                url: "/api/v1/account/me/articles",
                data: body,
            }),
            checkArticle: (query) => transport({
                method: "GET",
                url: "/api/v1/account/me/articles/check",
                params: query,
            }),
            deleteArticleById: (id) => transport({
                method: "DELETE",
                url: `/api/v1/account/me/articles/${id}`,
            }),
            deleteArticleByUrl: (query) => transport({
                method: "DELETE",
                url: "/api/v1/account/me/articles",
                params: query,
            }),
        },
        followingOrganizations: {
            getFollowingOrganizations: (query) => transport({
                method: "GET",
                url: "/api/v1/account/me/following-organizations",
                params: query,
            }),
            follow: (organizationId) => transport({
                method: "POST",
                url: `/api/v1/organizations/${organizationId}/follow`,
            }),
            unfollow: (organizationId) => transport({
                method: "DELETE",
                url: `/api/v1/organizations/${organizationId}/unfollow`,
            }),
            isFollowing: (organizationId) => transport({
                method: "GET",
                url: `/api/v1/organizations/${organizationId}/is-following`,
            }),
        },
        savedEvents: {
            getSavedEvents: (query) => transport({
                method: "GET",
                url: "/api/v1/account/me/saved-events",
                params: query,
            }),
            saveEvent: (eventId) => transport({
                method: "POST",
                url: `/api/v1/account/me/saved-events/${eventId}`,
            }),
            unsaveEvent: (eventId) => transport({
                method: "DELETE",
                url: `/api/v1/account/me/saved-events/${eventId}`,
            }),
            checkSavedEvent: (eventId) => transport({
                method: "GET",
                url: `/api/v1/account/me/saved-events/${eventId}/check`,
            }),
        },
        savedBlogPosts: {
            getSavedPosts: (query) => transport({
                method: "GET",
                url: "/api/v1/account/me/saved-blog-posts",
                params: query,
            }),
            savePost: (postId) => transport({
                method: "POST",
                url: `/api/v1/account/me/saved-blog-posts/${postId}`,
            }),
            unsavePost: (postId) => transport({
                method: "DELETE",
                url: `/api/v1/account/me/saved-blog-posts/${postId}`,
            }),
            checkSavedPost: (postId) => transport({
                method: "GET",
                url: `/api/v1/account/me/saved-blog-posts/${postId}/check`,
            }),
        },
        userEvents: {
            getUserEvents: (query) => transport({
                method: "GET",
                url: "/api/v1/account/me/events",
                params: query,
            }),
            getUserEventsStats: () => transport({
                method: "GET",
                url: "/api/v1/account/me/events/stats",
            }),
        },
    };
}
//# sourceMappingURL=index.js.map