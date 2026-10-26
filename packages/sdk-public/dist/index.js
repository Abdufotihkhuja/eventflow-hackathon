export function createPublicSdk(transport) {
    return {
        auth: {
            login: (body) => transport({
                method: "POST",
                url: "/api/v1/auth/login",
                data: body,
                skipAuth: true,
            }),
            registerUser: (body) => transport({
                method: "POST",
                url: "/api/v1/auth/user/register",
                data: body,
                skipAuth: true,
            }),
            loginUser: (body) => transport({
                method: "POST",
                url: "/api/v1/auth/user/login",
                data: body,
                skipAuth: true,
            }),
            registerOrganization: (body) => transport({
                method: "POST",
                url: "/api/v1/auth/organization/register",
                data: body,
                skipAuth: true,
            }),
            loginOrganization: (body) => transport({
                method: "POST",
                url: "/api/v1/auth/organization/login",
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
            changePassword: (body) => transport({
                method: "PATCH",
                url: "/api/v1/auth/change-password",
                data: body,
            }),
            getSessions: () => transport({
                method: "GET",
                url: "/api/v1/auth/sessions",
            }),
            terminateAllSessions: () => transport({
                method: "DELETE",
                url: "/api/v1/auth/sessions",
            }),
            terminateSession: (sessionId) => transport({
                method: "DELETE",
                url: `/api/v1/auth/sessions/${sessionId}`,
            }),
        },
        verification: {
            sendCode: (body) => transport({
                method: "POST",
                url: "/api/v1/verification/send-code",
                data: body,
                skipAuth: true,
            }),
            verifyEmail: (body) => transport({
                method: "POST",
                url: "/api/v1/verification/verify-email",
                data: body,
                skipAuth: true,
            }),
            resendCode: (body) => transport({
                method: "POST",
                url: "/api/v1/verification/resend-code",
                data: body,
                skipAuth: true,
            }),
            resetPassword: (body) => transport({
                method: "POST",
                url: "/api/v1/verification/reset-password",
                data: body,
                skipAuth: true,
            }),
        },
        events: {
            getPublicEvents: (query) => transport({
                method: "GET",
                url: "/api/v1/public/events",
                params: query,
                skipAuth: true,
            }),
            getPublicEventById: (id) => transport({
                method: "GET",
                url: `/api/v1/public/events/${id}`,
                skipAuth: true,
            }),
            getPublicEventBySlug: (slug) => transport({
                method: "GET",
                url: `/api/v1/public/events/by-slug/${encodeURIComponent(slug)}`,
                skipAuth: true,
            }),
            getByOrganization: (organizationId, query) => transport({
                method: "GET",
                url: `/api/v1/events/organizations/${organizationId}/events`,
                params: query,
                skipAuth: true,
            }),
            canRegister: (id) => transport({
                method: "GET",
                url: `/api/v1/public/events/${id}/can-register`,
                skipAuth: true,
            }),
            getComments: (eventId, query) => transport({
                method: "GET",
                url: `/api/v1/events/${eventId}/comments`,
                params: query,
                skipAuth: true,
            }),
            postComment: (eventId, body) => transport({
                method: "POST",
                url: `/api/v1/events/${eventId}/comments`,
                data: body,
            }),
            likeComment: (eventId, commentId, body) => transport({
                method: "POST",
                url: `/api/v1/events/${eventId}/comments/${commentId}/like`,
                data: body,
            }),
            downloadMaterial: (eventId, agendaItemId, fileUrl) => transport({
                method: "GET",
                url: `/api/v1/public/events/${eventId}/agenda/${agendaItemId}/materials/download`,
                params: { fileUrl },
                responseType: "blob",
                skipAuth: true,
            }),
        },
        categories: {
            list: (query) => transport({
                method: "GET",
                url: "/api/v1/categories",
                params: query,
                skipAuth: true,
            }),
        },
        collections: {
            list: (query) => transport({
                method: "GET",
                url: "/api/v1/collections",
                params: query,
                skipAuth: true,
            }),
            getById: (id) => transport({
                method: "GET",
                url: `/api/v1/collections/${id}`,
                skipAuth: true,
            }),
            getBySlug: (slug) => transport({
                method: "GET",
                url: `/api/v1/collections/by-slug/${encodeURIComponent(slug)}`,
                skipAuth: true,
            }),
        },
        registrations: {
            register: (eventId, body, options) => transport({
                method: "POST",
                url: `/api/v1/events/${eventId}/register`,
                data: body,
                params: options?.inviteCode
                    ? { inviteCode: options.inviteCode }
                    : undefined,
            }),
            getMyRegistrations: (query) => transport({
                method: "GET",
                url: "/api/v1/my-registrations",
                params: query,
            }),
            updateRegistration: (id, body) => transport({
                method: "PATCH",
                url: `/api/v1/registrations/${id}`,
                data: body,
            }),
            cancelRegistration: (id) => transport({
                method: "PATCH",
                url: `/api/v1/registrations/${id}/cancel`,
            }),
            getQrCode: (id) => transport({
                method: "GET",
                url: `/api/v1/registrations/${id}/qr`,
            }),
            getRegistrationCertificate: (registrationId) => transport({
                method: "GET",
                url: `/api/v1/registrations/${registrationId}/certificate`,
            }),
            downloadTicket: (registrationId) => transport({
                method: "GET",
                url: `/api/v1/registrations/${registrationId}/ticket`,
                responseType: "blob",
            }),
        },
        organizerRegistrations: {
            list: (eventId, query) => transport({
                method: "GET",
                url: `/api/v1/events/${eventId}/registrations`,
                params: query,
            }),
            approve: (eventId, id) => transport({
                method: "PATCH",
                url: `/api/v1/events/${eventId}/registrations/${id}/approve`,
            }),
            reject: (eventId, id, body) => transport({
                method: "PATCH",
                url: `/api/v1/events/${eventId}/registrations/${id}/reject`,
                data: body,
            }),
            bulkApprove: (eventId, body) => transport({
                method: "POST",
                url: `/api/v1/events/${eventId}/registrations/bulk-approve`,
                data: body,
            }),
            bulkReject: (eventId, body) => transport({
                method: "POST",
                url: `/api/v1/events/${eventId}/registrations/bulk-reject`,
                data: body,
            }),
        },
        attendance: {
            checkIn: (body) => transport({
                method: "POST",
                url: "/api/v1/attendance/check-in",
                data: body,
            }),
        },
        certificates: {
            verifyPublic: (body) => transport({
                method: "POST",
                url: "/api/v1/certificates/verify",
                data: body,
                skipAuth: true,
            }),
        },
        organizations: {
            getMe: () => transport({
                method: "GET",
                url: "/api/v1/workspace/me",
            }),
            updateMe: (body) => transport({
                method: "PATCH",
                url: "/api/v1/workspace/me",
                data: body,
            }),
            deleteMe: () => transport({
                method: "DELETE",
                url: "/api/v1/workspace/me",
            }),
            uploadLogo: (file) => {
                const data = new FormData();
                data.append("logo", file);
                return transport({
                    method: "POST",
                    url: "/api/v1/workspace/me/logo",
                    data,
                });
            },
            deleteLogo: () => transport({
                method: "DELETE",
                url: "/api/v1/workspace/me/logo",
            }),
            completeOnboarding: () => transport({
                method: "POST",
                url: "/api/v1/workspace/me/complete-onboarding",
            }),
            getPublicProfile: (id) => transport({
                method: "GET",
                url: `/api/v1/organizations/${id}/public`,
            }),
        },
        profile: {
            getProfileOptions: () => transport({
                method: "GET",
                url: "/api/v1/public/profile-options",
                skipAuth: true,
            }),
        },
        billing: {
            getPublicPlans: () => transport({
                method: "GET",
                url: "/api/v1/public/plans",
                skipAuth: true,
            }),
            /** M-4: заказ билета на свою PENDING-регистрацию платного события. */
            checkoutTicket: (registrationId) => transport({
                method: "POST",
                url: `/api/v1/registrations/${registrationId}/ticket-order`,
            }),
        },
    };
}
//# sourceMappingURL=index.js.map