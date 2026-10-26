function pickString(value) {
    return typeof value === "string" ? value : null;
}
/** Explicit field whitelist — anything not listed here is dropped. */
export function sanitizeMember(raw) {
    const row = (raw ?? {});
    const role = (row.role ?? null);
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
export function createWorkspaceSdk(transport) {
    return {
        auth: {
            loginOrganization: (body) => transport({
                method: "POST",
                url: "/api/v1/auth/organization/login",
                data: body,
                skipAuth: true,
            }),
            loginMember: (body) => transport({
                method: "POST",
                url: "/api/v1/auth/member/login",
                data: body,
                skipAuth: true,
            }),
            loginSuperAdmin: (body) => transport({
                method: "POST",
                url: "/api/v1/auth/superadmin/login",
                data: body,
                skipAuth: true,
            }),
            refresh: (body) => transport({
                method: "POST",
                url: "/api/v1/auth/refresh",
                data: body,
                skipAuth: true,
            }),
            logout: (body) => transport({
                method: "POST",
                url: "/api/v1/auth/logout",
                data: body,
            }),
            getOrganizationMe: () => transport({
                method: "GET",
                url: "/api/v1/workspace/me",
            }),
            updateOrganizationProfile: (body) => transport({
                method: "PATCH",
                url: "/api/v1/workspace/me",
                data: body,
            }),
            changePassword: (body) => transport({
                method: "PATCH",
                url: "/api/v1/auth/change-password",
                data: body,
            }),
            getSessions: (refreshToken) => transport({
                method: "GET",
                url: "/api/v1/auth/sessions",
                headers: refreshToken
                    ? { "x-refresh-token": refreshToken }
                    : undefined,
            }),
            terminateSession: (id) => transport({
                method: "DELETE",
                url: `/api/v1/auth/sessions/${id}`,
            }),
            terminateOtherSessions: (refreshToken) => transport({
                method: "DELETE",
                url: "/api/v1/auth/sessions",
                headers: { "x-refresh-token": refreshToken },
            }),
            uploadOrganizationLogo: (file) => {
                const data = new FormData();
                data.append("logo", file);
                return transport({
                    method: "POST",
                    url: "/api/v1/workspace/me/logo",
                    data,
                });
            },
            deleteOrganizationLogo: () => transport({
                method: "DELETE",
                url: "/api/v1/workspace/me/logo",
            }),
            deleteAccount: () => transport({
                method: "DELETE",
                url: "/api/v1/workspace/me",
            }),
            completeOnboarding: () => transport({
                method: "POST",
                url: "/api/v1/workspace/me/complete-onboarding",
            }),
            completeCompanyInfo: () => transport({
                method: "POST",
                url: "/api/v1/workspace/me/complete-company-info",
            }),
        },
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
        members: {
            getMe: () => transport({
                method: "GET",
                url: "/api/v1/workspace/members/me",
            }),
            updateProfile: (body) => transport({
                method: "PATCH",
                url: "/api/v1/workspace/members/me",
                data: body,
            }),
            updatePrivacy: (body) => transport({
                method: "PATCH",
                url: "/api/v1/workspace/members/me/privacy",
                data: body,
            }),
            uploadAvatar: (file) => {
                const data = new FormData();
                data.append("avatar", file);
                return transport({
                    method: "POST",
                    url: "/api/v1/workspace/members/me/avatar",
                    data,
                });
            },
            deleteAvatar: () => transport({
                method: "DELETE",
                url: "/api/v1/workspace/members/me/avatar",
            }),
            completeOnboarding: () => transport({
                method: "POST",
                url: "/api/v1/workspace/members/me/complete-onboarding",
            }),
            getPermissions: () => transport({
                method: "GET",
                url: "/api/v1/workspace/members/me/permissions",
            }),
        },
        events: {
            getEvents: (query) => transport({
                method: "GET",
                url: "/api/v1/events",
                params: query,
            }),
            getEvent: (id) => transport({
                method: "GET",
                url: `/api/v1/events/${id}`,
            }),
            createEvent: (body) => transport({
                method: "POST",
                url: "/api/v1/events",
                data: body,
            }),
            updateEvent: (id, body) => transport({
                method: "PATCH",
                url: `/api/v1/events/${id}`,
                data: body,
            }),
            deleteEvent: (id) => transport({
                method: "DELETE",
                url: `/api/v1/events/${id}`,
            }),
            submitForReview: (id) => transport({
                method: "POST",
                url: `/api/v1/events/${id}/submit-review`,
            }),
            cancelEvent: (id) => transport({
                method: "POST",
                url: `/api/v1/events/${id}/cancel`,
            }),
            completeEvent: (id) => transport({
                method: "POST",
                url: `/api/v1/events/${id}/complete`,
            }),
            regenerateInviteCode: (id) => transport({
                method: "POST",
                url: `/api/v1/events/${id}/regenerate-invite-code`,
            }),
            getInviteLink: (id) => transport({
                method: "GET",
                url: `/api/v1/events/${id}/invite-link`,
            }),
            sendInvitation: (id, body) => transport({
                method: "POST",
                url: `/api/v1/events/${id}/send-invitation`,
                data: body,
            }),
            getAttendance: (eventId, query) => transport({
                method: "GET",
                url: `/api/v1/events/${eventId}/attendance`,
                params: query,
            }),
            suggestSlug: (query) => transport({
                method: "GET",
                url: "/api/v1/events/suggest-slug",
                params: query,
            }),
            checkSlug: (query) => transport({
                method: "GET",
                url: "/api/v1/events/check-slug",
                params: query,
            }),
            getEventBySlug: (slug) => transport({
                method: "GET",
                url: `/api/v1/events/by-slug/${encodeURIComponent(slug)}`,
                skipAuth: true,
            }),
            canRegister: (id) => transport({
                method: "GET",
                url: `/api/v1/public/events/${id}/can-register`,
                skipAuth: true,
            }),
            getArtifactRecipients: (eventId, query) => transport({
                method: "GET",
                url: `/api/v1/events/${eventId}/artifact-recipients`,
                params: query,
            }),
            createArtifactRecipient: (eventId, body) => transport({
                method: "POST",
                url: `/api/v1/events/${eventId}/artifact-recipients`,
                data: body,
            }),
            batchCreateArtifactRecipients: (eventId, body) => transport({
                method: "POST",
                url: `/api/v1/events/${eventId}/artifact-recipients/batch`,
                data: body,
            }),
            updateArtifactRecipient: (eventId, recipientId, body) => transport({
                method: "PATCH",
                url: `/api/v1/events/${eventId}/artifact-recipients/${recipientId}`,
                data: body,
            }),
            assignArtifactRecipientRole: (eventId, recipientId, body) => transport({
                method: "POST",
                url: `/api/v1/events/${eventId}/artifact-recipients/${recipientId}/roles`,
                data: body,
            }),
            deactivateArtifactRecipientRole: (eventId, recipientId, roleId) => transport({
                method: "DELETE",
                url: `/api/v1/events/${eventId}/artifact-recipients/${recipientId}/roles/${roleId}`,
            }),
            getArtifactTemplateSummary: (eventId, query) => transport({
                method: "GET",
                url: `/api/v1/events/${eventId}/artifacts/template-summary`,
                params: query,
            }),
            getArtifactBulkPreview: (eventId, body) => transport({
                method: "POST",
                url: `/api/v1/events/${eventId}/artifacts/bulk-preview`,
                data: body,
            }),
            getRecipientRoles: (eventId) => transport({
                method: "GET",
                url: `/api/v1/events/${eventId}/recipient-roles`,
            }),
            createRecipientRole: (eventId, body) => transport({
                method: "POST",
                url: `/api/v1/events/${eventId}/recipient-roles`,
                data: body,
            }),
            updateRecipientRole: (eventId, roleId, body) => transport({
                method: "PATCH",
                url: `/api/v1/events/${eventId}/recipient-roles/${roleId}`,
                data: body,
            }),
            deactivateRecipientRole: (eventId, roleId) => transport({
                method: "POST",
                url: `/api/v1/events/${eventId}/recipient-roles/${roleId}/deactivate`,
            }),
            activateRecipientRole: (eventId, roleId) => transport({
                method: "POST",
                url: `/api/v1/events/${eventId}/recipient-roles/${roleId}/activate`,
            }),
            getRecipientRoleDeletePreview: (eventId, roleId) => transport({
                method: "GET",
                url: `/api/v1/events/${eventId}/recipient-roles/${roleId}/delete-preview`,
            }),
            /** Aggregated, PII-free registration analytics (EVENTS_READ). The
             *  generated contract carries no response schema — callers narrow. */
            getAnalytics: (eventId, query) => transport({
                method: "GET",
                url: `/api/v1/events/${eventId}/analytics`,
                params: query,
            }),
        },
        registrations: {
            getRegistrations: (eventId, query) => transport({
                method: "GET",
                url: `/api/v1/events/${eventId}/registrations`,
                params: query,
            }),
            getRegistration: (eventId, id) => transport({
                method: "GET",
                url: `/api/v1/events/${eventId}/registrations/${id}`,
            }),
            approveRegistration: (eventId, id) => transport({
                method: "PATCH",
                url: `/api/v1/events/${eventId}/registrations/${id}/approve`,
            }),
            rejectRegistration: (eventId, id, body) => transport({
                method: "PATCH",
                url: `/api/v1/events/${eventId}/registrations/${id}/reject`,
                data: body,
            }),
            cancelRegistration: (eventId, id, body) => transport({
                method: "PATCH",
                url: `/api/v1/events/${eventId}/registrations/${id}/cancel`,
                data: body,
            }),
            revokeApproval: (eventId, id, body) => transport({
                method: "PATCH",
                url: `/api/v1/events/${eventId}/registrations/${id}/revoke`,
                data: body,
            }),
            bulkApprove: (eventId, ids) => transport({
                method: "POST",
                url: `/api/v1/events/${eventId}/registrations/bulk-approve`,
                data: { ids },
            }),
            bulkReject: (eventId, ids, reason) => transport({
                method: "POST",
                url: `/api/v1/events/${eventId}/registrations/bulk-reject`,
                data: { ids, reason },
            }),
        },
        certificates: {
            getTemplates: (eventId) => transport({
                method: "GET",
                url: `/api/v1/events/${eventId}/certificates/templates`,
            }),
            createTemplate: (eventId, body) => transport({
                method: "POST",
                url: `/api/v1/events/${eventId}/certificates/templates`,
                data: body,
            }),
            updateTemplate: (eventId, templateId, body) => transport({
                method: "PATCH",
                url: `/api/v1/events/${eventId}/certificates/templates/${templateId}`,
                data: body,
            }),
            deleteTemplate: (eventId, templateId) => transport({
                method: "DELETE",
                url: `/api/v1/events/${eventId}/certificates/templates/${templateId}`,
            }),
            getCertificates: (eventId, query) => transport({
                method: "GET",
                url: `/api/v1/events/${eventId}/certificates`,
                params: query,
            }),
            generateCertificates: (eventId, body) => transport({
                method: "POST",
                url: `/api/v1/events/${eventId}/certificates/generate`,
                data: body,
            }),
            downloadCertificate: (eventId, certificateId) => transport({
                method: "GET",
                url: `/api/v1/events/${eventId}/certificates/${certificateId}/download`,
                responseType: "blob",
            }),
            verifyCertificate: (body) => transport({
                method: "POST",
                url: "/api/v1/certificates/verify",
                data: body,
                skipAuth: true,
            }),
        },
        translations: {
            translateBatch: (body) => transport({
                method: "POST",
                url: "/api/v1/translations/batch",
                data: body,
            }),
        },
        billing: {
            /** Каталог тарифов для кабинета (M-1, billing:view). Деньги — строки. */
            getPlans: () => transport({
                method: "GET",
                url: "/api/v1/billing/plans",
            }),
            /** Статус тарифа: живой пакет + снапшоты (M-3). */
            getStatus: () => transport({
                method: "GET",
                url: "/api/v1/billing/status",
            }),
            /** Эффективные энтайтлменты + счётчики окон (E-14, display-only). */
            getEntitlements: () => transport({
                method: "GET",
                url: "/api/v1/billing/entitlements",
            }),
            /** Заявка managed-фазы: тариф/монеты/реклама (M-13, billing:manage). */
            createRequest: (body) => transport({
                method: "POST",
                url: "/api/v1/billing/requests",
                data: body,
            }),
            /** История биллинг-заказов организации (C-5/C-8). */
            listRequests: () => transport({
                method: "GET",
                url: "/api/v1/billing/requests",
            }),
            /** Кошелёк монет: балансы + история (C-6; AI — в секундах, делить на 60). */
            getWallet: () => transport({
                method: "GET",
                url: "/api/v1/billing/wallet",
            }),
        },
        // ── W6 additions (mobile organizer surface) — append-only ────────────────
        dashboard: {
            /** GET /organizations/dashboard/stats — NB: the `tickets` block counts
             *  KANBAN TASKS, not event tickets; `period`/activity `timeAgo` strings
             *  arrive pre-formatted in Russian — re-format client-side. */
            getStats: () => transport({
                method: "GET",
                url: "/api/v1/organizations/dashboard/stats",
            }),
            /** Team activity over the last 24h. Rebuild copy from `type` +
             *  `entityName` + `createdAt`; `description`/`timeAgo` are Russian. */
            getActivity: (query) => transport({
                method: "GET",
                url: "/api/v1/organizations/dashboard/activity",
                params: query,
            }),
        },
        team: {
            /** Organization members — ALWAYS sanitized through the field whitelist
             *  (`sanitizeMember`); the raw row must never reach a screen. */
            getMembers: async () => {
                const raw = await transport({
                    method: "GET",
                    url: "/api/v1/organizations/members",
                });
                return Array.isArray(raw) ? raw.map(sanitizeMember) : [];
            },
        },
        invites: {
            list: (query) => transport({
                method: "GET",
                url: "/api/v1/organizations/invites",
                params: query,
            }),
            create: (body) => transport({
                method: "POST",
                url: "/api/v1/organizations/invites",
                data: body,
            }),
            resend: (inviteId) => transport({
                method: "POST",
                url: `/api/v1/organizations/invites/${inviteId}/resend`,
            }),
            revoke: (inviteId) => transport({
                method: "DELETE",
                url: `/api/v1/organizations/invites/${inviteId}`,
            }),
        },
        roles: {
            list: () => transport({
                method: "GET",
                url: "/api/v1/organizations/roles",
            }),
        },
        notifications: {
            list: (query) => transport({
                method: "GET",
                url: "/api/v1/notifications",
                params: query,
            }),
            unreadCount: () => transport({
                method: "GET",
                url: "/api/v1/notifications/unread-count",
            }),
            /** Без списка ids отмечает прочитанной всю ленту организации. */
            markRead: (body) => transport({
                method: "PATCH",
                url: "/api/v1/notifications/read",
                data: body ?? {},
            }),
        },
    };
}
//# sourceMappingURL=index.js.map