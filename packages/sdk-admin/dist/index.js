export function createAdminSdk(transport) {
    return {
        auth: {
            loginSuperAdmin: (body) => transport({
                method: 'POST',
                url: '/api/v1/auth/superadmin/login',
                data: body,
                skipAuth: true,
            }),
        },
        session: {
            getMe: () => transport({
                method: 'GET',
                url: '/api/v1/session/me',
            }),
        },
        elevations: {
            request: (body) => transport({
                method: 'POST',
                url: '/api/v1/super-admin/elevations',
                data: body,
            }),
            approveWrite: (id) => transport({
                method: 'POST',
                url: `/api/v1/super-admin/elevations/${id}/approve`,
            }),
        },
        profile: {
            createAdmin: (body) => transport({
                method: 'POST',
                url: '/api/v1/super-admin/admins',
                data: body,
            }),
        },
        stats: {
            getSystem: () => transport({
                method: 'GET',
                url: '/api/v1/super-admin/stats',
            }),
        },
        users: {
            getList: (query) => transport({
                method: 'GET',
                url: '/api/v1/super-admin/users',
                params: query,
            }),
            getById: (userId) => transport({
                method: 'GET',
                url: `/api/v1/super-admin/users/${userId}`,
            }),
            update: (userId, body) => transport({
                method: 'PATCH',
                url: `/api/v1/super-admin/users/${userId}`,
                data: body,
            }),
            archive: (userId, body) => transport({
                method: 'POST',
                url: `/api/v1/super-admin/users/${userId}/archive`,
                data: body,
            }),
            restore: (userId) => transport({
                method: 'POST',
                url: `/api/v1/super-admin/users/${userId}/restore`,
            }),
            hardDelete: (userId) => transport({
                method: 'DELETE',
                url: `/api/v1/super-admin/users/${userId}/hard-delete`,
            }),
        },
        organizations: {
            provision: (body) => transport({
                method: 'POST',
                url: '/api/v1/super-admin/organizations/provision',
                data: body,
            }),
            getList: (query) => transport({
                method: 'GET',
                url: '/api/v1/super-admin/organizations',
                params: query,
            }),
            getPending: (query) => transport({
                method: 'GET',
                url: '/api/v1/super-admin/organizations/pending',
                params: query,
            }),
            getById: (orgId) => transport({
                method: 'GET',
                url: `/api/v1/super-admin/organizations/${orgId}`,
            }),
            update: (orgId, body) => transport({
                method: 'PATCH',
                url: `/api/v1/super-admin/organizations/${orgId}`,
                data: body,
            }),
            approve: (orgId) => transport({
                method: 'POST',
                url: `/api/v1/super-admin/organizations/${orgId}/approve`,
            }),
            reject: (orgId, body) => transport({
                method: 'POST',
                url: `/api/v1/super-admin/organizations/${orgId}/reject`,
                data: body,
            }),
            archive: (orgId, body) => transport({
                method: 'POST',
                url: `/api/v1/super-admin/organizations/${orgId}/archive`,
                data: body,
            }),
            restore: (orgId) => transport({
                method: 'POST',
                url: `/api/v1/super-admin/organizations/${orgId}/restore`,
            }),
            getDeletePreview: (orgId) => transport({
                method: 'GET',
                url: `/api/v1/super-admin/organizations/${orgId}/delete-preview`,
            }),
            hardDelete: (orgId, body) => transport({
                method: 'DELETE',
                url: `/api/v1/super-admin/organizations/${orgId}/hard-delete`,
                data: body,
            }),
        },
        events: {
            getList: (query) => transport({
                method: 'GET',
                url: '/api/v1/super-admin/events',
                params: query,
            }),
            getPending: (query) => transport({
                method: 'GET',
                url: '/api/v1/super-admin/events/pending',
                params: query,
            }),
            getById: (eventId) => transport({
                method: 'GET',
                url: `/api/v1/super-admin/events/${eventId}`,
            }),
            update: (eventId, body) => transport({
                method: 'PATCH',
                url: `/api/v1/super-admin/events/${eventId}`,
                data: body,
            }),
            setStatus: (eventId, body) => transport({
                method: 'PATCH',
                url: `/api/v1/super-admin/events/${eventId}/status`,
                data: body,
            }),
            approve: (eventId) => transport({
                method: 'POST',
                url: `/api/v1/super-admin/events/${eventId}/approve`,
            }),
            reject: (eventId, body) => transport({
                method: 'POST',
                url: `/api/v1/super-admin/events/${eventId}/reject`,
                data: body,
            }),
            toggleFeatured: (eventId) => transport({
                method: 'PATCH',
                url: `/api/v1/super-admin/events/${eventId}/featured`,
            }),
            delete: (eventId, body) => transport({
                method: 'DELETE',
                url: `/api/v1/super-admin/events/${eventId}`,
                data: body,
            }),
        },
        verificationCodes: {
            getList: (query) => transport({
                method: 'GET',
                url: '/api/v1/super-admin/verification-codes',
                params: query,
            }),
        },
        blogPosts: {
            getList: (query) => transport({
                method: 'GET',
                url: '/api/v1/super-admin/blog-posts',
                params: query,
            }),
            getPending: (query) => transport({
                method: 'GET',
                url: '/api/v1/super-admin/blog-posts/pending',
                params: query,
            }),
            getById: (postId) => transport({
                method: 'GET',
                url: `/api/v1/super-admin/blog-posts/${postId}`,
            }),
            approve: (postId) => transport({
                method: 'POST',
                url: `/api/v1/super-admin/blog-posts/${postId}/approve`,
            }),
            reject: (postId, body) => transport({
                method: 'POST',
                url: `/api/v1/super-admin/blog-posts/${postId}/reject`,
                data: body,
            }),
            delete: (postId) => transport({
                method: 'DELETE',
                url: `/api/v1/super-admin/blog-posts/${postId}`,
            }),
        },
        categories: {
            getList: (query) => transport({
                method: 'GET',
                url: '/api/v1/super-admin/categories',
                params: query,
            }),
            checkSlug: (query) => transport({
                method: 'GET',
                url: '/api/v1/super-admin/categories/check-slug',
                params: query,
            }),
            getById: (id) => transport({
                method: 'GET',
                url: `/api/v1/super-admin/categories/${id}`,
            }),
            uploadIcon: (file) => {
                const data = new FormData();
                data.append('icon', file);
                return transport({
                    method: 'POST',
                    url: '/api/v1/super-admin/categories/icon-upload',
                    data,
                });
            },
            create: (body) => transport({
                method: 'POST',
                url: '/api/v1/super-admin/categories',
                data: body,
            }),
            update: (id, body) => transport({
                method: 'PATCH',
                url: `/api/v1/super-admin/categories/${id}`,
                data: body,
            }),
            delete: (id) => transport({
                method: 'DELETE',
                url: `/api/v1/super-admin/categories/${id}`,
            }),
        },
        blogCategories: {
            getList: (query) => transport({
                method: 'GET',
                url: '/api/v1/super-admin/blog-categories',
                params: query,
            }),
            checkSlug: (query) => transport({
                method: 'GET',
                url: '/api/v1/super-admin/blog-categories/check-slug',
                params: query,
            }),
            getById: (id) => transport({
                method: 'GET',
                url: `/api/v1/super-admin/blog-categories/${id}`,
            }),
            create: (body) => transport({
                method: 'POST',
                url: '/api/v1/super-admin/blog-categories',
                data: body,
            }),
            update: (id, body) => transport({
                method: 'PATCH',
                url: `/api/v1/super-admin/blog-categories/${id}`,
                data: body,
            }),
            delete: (id) => transport({
                method: 'DELETE',
                url: `/api/v1/super-admin/blog-categories/${id}`,
            }),
        },
        collections: {
            getList: (query) => transport({
                method: 'GET',
                url: '/api/v1/super-admin/collections',
                params: query,
            }),
            checkSlug: (query) => transport({
                method: 'GET',
                url: '/api/v1/super-admin/collections/check-slug',
                params: query,
            }),
            getAvailableEvents: (query) => transport({
                method: 'GET',
                url: '/api/v1/super-admin/collections/available-events',
                params: query,
            }),
            getById: (id) => transport({
                method: 'GET',
                url: `/api/v1/super-admin/collections/${id}`,
            }),
            getEvents: (id) => transport({
                method: 'GET',
                url: `/api/v1/super-admin/collections/${id}/events`,
            }),
            uploadCover: (file) => {
                const data = new FormData();
                data.append('cover', file);
                return transport({
                    method: 'POST',
                    url: '/api/v1/super-admin/collections/cover-upload',
                    data,
                });
            },
            create: (body) => transport({
                method: 'POST',
                url: '/api/v1/super-admin/collections',
                data: body,
            }),
            update: (id, body) => transport({
                method: 'PATCH',
                url: `/api/v1/super-admin/collections/${id}`,
                data: body,
            }),
            delete: (id) => transport({
                method: 'DELETE',
                url: `/api/v1/super-admin/collections/${id}`,
            }),
            addEvents: (id, body) => transport({
                method: 'POST',
                url: `/api/v1/super-admin/collections/${id}/events`,
                data: body,
            }),
            removeEvents: (id, body) => transport({
                method: 'DELETE',
                url: `/api/v1/super-admin/collections/${id}/events`,
                data: body,
            }),
            reorderEvents: (id, body) => transport({
                method: 'PATCH',
                url: `/api/v1/super-admin/collections/${id}/events/reorder`,
                data: body,
            }),
        },
        translations: {
            translateBatch: (body) => transport({
                method: 'POST',
                url: '/api/v1/translations/batch',
                data: body,
            }),
        },
        billing: {
            /** Биллинг-панель организации (S-1/S-2). */
            getOrgBilling: (orgId) => transport({
                method: 'GET',
                url: `/api/v1/super-admin/billing/organizations/${orgId}`,
            }),
            /** Активация/смена тарифа (managed; creditMode обязателен при смене — §2.4). */
            activatePlan: (orgId, body) => transport({
                method: 'POST',
                url: `/api/v1/super-admin/billing/organizations/${orgId}/plan/activate`,
                data: body,
            }),
            /** Очередь REQUESTED-заявок managed-фазы. */
            listRequests: () => transport({
                method: 'GET',
                url: '/api/v1/super-admin/billing/requests',
            }),
            /** S-3: продлить период пакета на N дней. */
            extendPlan: (orgId, body) => transport({
                method: 'POST',
                url: `/api/v1/super-admin/billing/organizations/${orgId}/plan/extend`,
                data: body,
            }),
            /** S-3: принудительно истечь пакет (немедленный START; причина обязательна). */
            expirePlan: (orgId, body) => transport({
                method: 'POST',
                url: `/api/v1/super-admin/billing/organizations/${orgId}/plan/expire`,
                data: body,
            }),
            /** S-3: корректировка кредитов (append-only; причина обязательна). */
            adjustCredits: (orgId, body) => transport({
                method: 'POST',
                url: `/api/v1/super-admin/billing/organizations/${orgId}/plan/credits/adjust`,
                data: body,
            }),
            /** S-4: записать ручной платёж (externalRef обязателен, D-5). */
            recordPayment: (orgId, body) => transport({
                method: 'POST',
                url: `/api/v1/super-admin/billing/organizations/${orgId}/payments`,
                data: body,
            }),
            /** S-4: реверсировать платёж (исправления только реверсом). */
            reversePayment: (transactionId, body) => transport({
                method: 'POST',
                url: `/api/v1/super-admin/billing/payments/${transactionId}/reverse`,
                data: body,
            }),
            /** M-5 MANUAL-путь: подтвердить офлайн-оплату билета. */
            confirmTicketOrder: (orderId, body) => transport({
                method: 'POST',
                url: `/api/v1/super-admin/billing/ticket-orders/${orderId}/confirm`,
                data: body,
            }),
            /** M-7: сводка «к выплате» по организациям. */
            payoutsOwed: () => transport({
                method: 'GET',
                url: '/api/v1/super-admin/billing/payouts/owed',
            }),
            /** M-7: зафиксировать выплату (referens платёжки обязателен). */
            recordPayout: (orgId, body) => transport({
                method: 'POST',
                url: `/api/v1/super-admin/billing/organizations/${orgId}/payouts`,
                data: body,
            }),
            /** S-5/S-6: установить per-org оверрайд (комиссия в [0,1200] bps). */
            setOverride: (orgId, body) => transport({
                method: 'POST',
                url: `/api/v1/super-admin/billing/organizations/${orgId}/overrides`,
                data: body,
            }),
            /** S-5/S-6: снять оверрайд (причина обязательна). */
            revokeOverride: (orgId, key, body) => transport({
                method: 'POST',
                url: `/api/v1/super-admin/billing/organizations/${orgId}/overrides/${key}/revoke`,
                data: body,
            }),
            /** S-7: comp-грант монет (причина обязательна). */
            compGrant: (orgId, body) => transport({
                method: 'POST',
                url: `/api/v1/super-admin/billing/organizations/${orgId}/comp`,
                data: body,
            }),
            /** S-8: приостановить организацию (пакет D-1; причина обязательна). */
            suspendOrganization: (orgId, body) => transport({
                method: 'POST',
                url: `/api/v1/super-admin/billing/organizations/${orgId}/suspend`,
                data: body,
            }),
            /** S-8: снять приостановку. */
            reactivateOrganization: (orgId) => transport({
                method: 'POST',
                url: `/api/v1/super-admin/billing/organizations/${orgId}/reactivate`,
            }),
            /** S-11: фулфилмент featured-размещения (auto-снятие свипом). */
            fulfillFeatured: (orgId, body) => transport({
                method: 'POST',
                url: `/api/v1/super-admin/billing/organizations/${orgId}/ad-orders/featured`,
                data: body,
            }),
            /** S-11: все рекламные размещения. */
            listAdOrders: () => transport({
                method: 'GET',
                url: '/api/v1/super-admin/billing/ad-orders',
            }),
            /** S-13: лента аудита (фильтры action/targetId, пагинация). */
            listAudit: (params) => transport({
                method: 'GET',
                url: '/api/v1/super-admin/billing/audit',
                params,
            }),
            /** S-10: сводка выручки за период (тийины строками). */
            revenueSummary: (params) => transport({
                method: 'GET',
                url: '/api/v1/super-admin/billing/revenue/summary',
                params,
            }),
            /** S-9: обзор монетизации платформы. */
            overview: () => transport({
                method: 'GET',
                url: '/api/v1/super-admin/billing/overview',
            }),
            /** S-16: правка цены/активации тарифа (аудит PRICE_SET). */
            updatePlanPricing: (key, body) => transport({
                method: 'POST',
                url: `/api/v1/super-admin/billing/plans/${key}/pricing`,
                data: body,
            }),
            /** S-16: правка цены/активации add-on SKU (аудит SKU_SET). */
            updateSkuPricing: (code, body) => transport({
                method: 'POST',
                url: `/api/v1/super-admin/billing/addon-skus/${code}/pricing`,
                data: body,
            }),
            /** S-19: текущее состояние тумблера. */
            getEnforcement: () => transport({
                method: 'GET',
                url: '/api/v1/super-admin/billing/enforcement',
            }),
            /** S-19: мастер-переключатель тарифной системы. */
            setEnforcement: (body) => transport({
                method: 'POST',
                url: '/api/v1/super-admin/billing/enforcement',
                data: body,
            }),
            /** VIA: состояние тумблера + число пилотных организаций. */
            getViaState: () => transport({
                method: 'GET',
                url: '/api/v1/super-admin/billing/via',
            }),
            /** VIA: глобальный тумблер провайдера (прод-активация). */
            setVia: (body) => transport({
                method: 'POST',
                url: '/api/v1/super-admin/billing/via',
                data: body,
            }),
        },
    };
}
//# sourceMappingURL=index.js.map