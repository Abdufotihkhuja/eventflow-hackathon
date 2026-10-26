/**
 * Tenant-isolation safety net — Phase 0, item 0.4.
 *
 * Tenant scoping in EventFlow is application-level (no Postgres RLS yet — that is
 * the planned 2.1 defense-in-depth backstop). These helpers make the
 * `organizationId` filter MANDATORY and explicit for tenant-scoped Prisma
 * queries, so a forgotten filter fails loudly instead of leaking across tenants.
 *
 * Usage:
 *   - requireTenantWhere(orgId, where)      — models that carry an `organizationId` column
 *   - requireEventTenantWhere(orgId, where) — models scoped transitively via `event.organizationId`
 *
 * A companion ESLint rule (no-restricted-syntax, `warn`) plus the
 * `scripts/check-tenant-guard.mjs` ratchet discourage raw
 * `prisma.<tenantModel>.<listOrMutation>` outside the repository layer, so new
 * code is nudged toward these helpers at author-time without a risky global
 * query interceptor. The legitimately cross-tenant `public` and `super-admin`
 * modules are exempt.
 */

/** Models that carry their own `organizationId` column (direct tenant scoping). */
export const DIRECT_TENANT_MODELS = [
  'event',
  'rentalPlace',
  'organizationMember',
  'organizationRole',
  'organizationInvite',
  'eventTag',
  'board',
  'blogPost',
  'contactRequest',
  'userFollowing',
  'registrationFileUpload',
  // Монетизация (D-12): все биллинговые tenant-модели.
  'order',
  'planPurchase',
  'eventCreditConsumption',
  'planCreditAdjustment',
  'entitlementOverride',
  'usageEvent',
  'usageCounter',
  'coinLedgerEntry',
  'payout',
  'adOrder',
  'organizationAccessOverride',
] as const;

/** Models tenant-scoped transitively through their `event` relation. */
export const EVENT_TENANT_MODELS = [
  'registration',
  'certificate',
  'ticketArtifact',
  'attendance',
  'questionAnswer',
  'eventRecipient',
  'speaker',
  'agendaItem',
] as const;

/**
 * Транзитивно-скоупленные через `order` (без собственного organizationId):
 * доступ ТОЛЬКО через репозитории, которые фильтруют по order.organizationId.
 * В helpers выше не входят; ESLint/ratchet их всё равно флагируют.
 * Отдельное документированное исключение: `revenueEntry` и `platformConfig` —
 * платформенные (не tenant) данные, читаются только супер-админом (D-16/D-17).
 */
export const ORDER_TENANT_MODELS = ['paymentTransaction'] as const;

export type DirectTenantModel = (typeof DIRECT_TENANT_MODELS)[number];
export type EventTenantModel = (typeof EVENT_TENANT_MODELS)[number];

/** Thrown when a tenant-scoped query is built without an organizationId. */
export class MissingTenantScopeError extends Error {
  constructor(helper: string) {
    super(
      `${helper}: organizationId is required for tenant-scoped queries but was ` +
        `missing or empty. This guard prevents cross-tenant data exposure.`,
    );
    this.name = 'MissingTenantScopeError';
  }
}

function assertOrganizationId(
  organizationId: string | null | undefined,
  helper: string,
): asserts organizationId is string {
  if (typeof organizationId !== 'string' || organizationId.trim() === '') {
    throw new MissingTenantScopeError(helper);
  }
}

/**
 * Merge a mandatory `organizationId` into a where clause for a directly
 * tenant-scoped model. Throws {@link MissingTenantScopeError} if organizationId
 * is missing/empty. Existing where keys are preserved.
 */
export function requireTenantWhere<W extends object>(
  organizationId: string | null | undefined,
  where?: W,
): W & { organizationId: string } {
  assertOrganizationId(organizationId, 'requireTenantWhere');
  return { ...(where ?? {}), organizationId } as W & { organizationId: string };
}

/**
 * Merge a mandatory `event.organizationId` filter into a where clause for a
 * model scoped transitively through its `event` relation. Any existing `event`
 * sub-filter and all other top-level keys are preserved. Throws
 * {@link MissingTenantScopeError} if organizationId is missing/empty.
 */
export function requireEventTenantWhere<W extends object>(
  organizationId: string | null | undefined,
  where?: W,
): W & { event: { organizationId: string } } {
  assertOrganizationId(organizationId, 'requireEventTenantWhere');
  const base = (where ?? {}) as Record<string, unknown>;
  const existingEvent =
    typeof base.event === 'object' && base.event !== null
      ? (base.event as Record<string, unknown>)
      : {};
  return {
    ...base,
    event: { ...existingEvent, organizationId },
  } as W & { event: { organizationId: string } };
}
