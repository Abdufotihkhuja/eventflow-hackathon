import {
  DIRECT_TENANT_MODELS,
  EVENT_TENANT_MODELS,
  MissingTenantScopeError,
  requireEventTenantWhere,
  requireTenantWhere,
} from './tenant-scope';

const ORG_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const ORG_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const MISSING = [undefined, null, '', '   '] as const;

describe('tenant-scope safety net (0.4)', () => {
  describe('requireTenantWhere — direct models (Event, Board, RegistrationFileUpload)', () => {
    it('throws MissingTenantScopeError when organizationId is missing or empty', () => {
      for (const bad of MISSING) {
        expect(() => requireTenantWhere(bad, { id: 'x' })).toThrow(
          MissingTenantScopeError,
        );
      }
    });

    it('injects organizationId when no where is provided (Event list)', () => {
      expect(requireTenantWhere(ORG_A)).toEqual({ organizationId: ORG_A });
    });

    it('merges organizationId without clobbering existing filters (Board)', () => {
      expect(requireTenantWhere(ORG_A, { isArchived: false })).toEqual({
        isArchived: false,
        organizationId: ORG_A,
      });
    });

    it('isolates two orgs for the same query (RegistrationFileUpload)', () => {
      const a = requireTenantWhere(ORG_A, { questionId: 'q1' });
      const b = requireTenantWhere(ORG_B, { questionId: 'q1' });
      expect(a.organizationId).toBe(ORG_A);
      expect(b.organizationId).toBe(ORG_B);
      expect(a.organizationId).not.toBe(b.organizationId);
    });
  });

  describe('requireEventTenantWhere — transitive models (Registration, Certificate, Ticket)', () => {
    it('throws MissingTenantScopeError when organizationId is missing or empty', () => {
      for (const bad of MISSING) {
        expect(() => requireEventTenantWhere(bad, { id: 'x' })).toThrow(
          MissingTenantScopeError,
        );
      }
    });

    it('injects event.organizationId when no where is provided (Registration list)', () => {
      expect(requireEventTenantWhere(ORG_A)).toEqual({
        event: { organizationId: ORG_A },
      });
    });

    it('preserves top-level filters while scoping (Registration by status)', () => {
      expect(requireEventTenantWhere(ORG_A, { status: 'APPROVED' })).toEqual({
        status: 'APPROVED',
        event: { organizationId: ORG_A },
      });
    });

    it('preserves an existing event sub-filter (Certificate, event.status set)', () => {
      expect(
        requireEventTenantWhere(ORG_A, { event: { status: 'COMPLETED' } }),
      ).toEqual({ event: { status: 'COMPLETED', organizationId: ORG_A } });
    });

    it('isolates two orgs for the same query (TicketArtifact)', () => {
      const a = requireEventTenantWhere(ORG_A, { design: 'BRANDED' });
      const b = requireEventTenantWhere(ORG_B, { design: 'BRANDED' });
      expect(a.event.organizationId).toBe(ORG_A);
      expect(b.event.organizationId).toBe(ORG_B);
    });
  });

  describe('model registry', () => {
    it('direct and transitive registries are non-empty and disjoint', () => {
      expect(DIRECT_TENANT_MODELS.length).toBeGreaterThan(0);
      expect(EVENT_TENANT_MODELS.length).toBeGreaterThan(0);
      const overlap = (DIRECT_TENANT_MODELS as readonly string[]).filter((m) =>
        (EVENT_TENANT_MODELS as readonly string[]).includes(m),
      );
      expect(overlap).toEqual([]);
    });

    it('includes the key models called out by the audit', () => {
      expect(DIRECT_TENANT_MODELS).toEqual(
        expect.arrayContaining(['event', 'board', 'registrationFileUpload']),
      );
      expect(EVENT_TENANT_MODELS).toEqual(
        expect.arrayContaining(['registration', 'certificate', 'ticketArtifact']),
      );
    });
  });
});
