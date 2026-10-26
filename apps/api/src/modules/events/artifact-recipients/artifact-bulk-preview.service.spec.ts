import { BadRequestException } from '@nestjs/common';
import { createHash } from 'crypto';
import {
  AssetGenerationStatus,
  BuiltInEventRecipientRoleKey,
  ParticipantRole,
  UserType,
} from '@prisma/client';
import { ArtifactBulkPreviewService } from './artifact-bulk-preview.service';
import type { ArtifactRecipientTarget } from './artifact-recipient-resolver.service';
import {
  ArtifactBulkPreviewScope,
  ArtifactBulkPreviewType,
} from './dto';

type Row = Record<string, any>;

class FakeBulkPreviewPrisma {
  events: Row[] = [{ id: 'event-1', organizationId: 'org-1' }];
  roles: Row[] = [
    this.role('role-participant', 'participant', 'Participant', 10),
    this.role('role-speaker', 'speaker', 'Speaker', 20),
    this.role('role-vip', 'vip', 'VIP', 40),
  ];
  certificateTemplates: Row[] = [];
  badgeTemplates: Row[] = [];
  certificates: Row[] = [];

  event = {
    findUnique: jest.fn(async ({ where }: any) =>
      this.events.find((event) => event.id === where.id) ?? null,
    ),
  };

  eventRecipientRole = {
    findMany: jest.fn(async ({ where, select }: any) =>
      this.roles
        .filter((role) => {
          if (where.eventId && role.eventId !== where.eventId) return false;
          if (where.id?.in && !where.id.in.includes(role.id)) return false;
          return true;
        })
        .map((role) => (select ? selectFields(role, select) : role)),
    ),
    findFirst: jest.fn(async ({ where, select }: any) => {
      const role =
        this.roles.find(
          (candidate) =>
            (!where.eventId || candidate.eventId === where.eventId) &&
            (!where.id || candidate.id === where.id) &&
            (!where.code || candidate.code === where.code),
        ) ?? null;
      return role && select ? selectFields(role, select) : role;
    }),
  };

  certificateTemplate = {
    findMany: jest.fn(async ({ where, take }: any) =>
      this.filterTemplates(this.certificateTemplates, where).slice(0, take),
    ),
  };

  badgeTemplate = {
    findMany: jest.fn(async ({ where, take }: any) =>
      this.filterTemplates(this.badgeTemplates, where).slice(0, take),
    ),
  };

  certificate = {
    findMany: jest.fn(async ({ where }: any) =>
      this.certificates.filter((certificate) => {
        if (where.eventId && certificate.eventId !== where.eventId) return false;
        if (!where.OR?.length) return true;
        return where.OR.some((clause: any) => {
          if (clause.registrationId?.in) {
            return clause.registrationId.in.includes(certificate.registrationId);
          }
          return (
            (!clause.eventRecipientId ||
              certificate.eventRecipientId === clause.eventRecipientId) &&
            (!clause.recipientRoleId ||
              certificate.recipientRoleId === clause.recipientRoleId) &&
            (!clause.isCurrent || certificate.isCurrent === clause.isCurrent)
          );
        });
      }),
    ),
  };

  private role(id: string, code: string, displayName: string, sortOrder: number) {
    return {
      id,
      eventId: 'event-1',
      code,
      displayName,
      sortOrder,
      isActive: true,
      isArtifactEligible: true,
    };
  }

  addCertificateTemplate(input: Partial<Row> & { recipientRoleId: string | null }) {
    const template = templateRow({
      id: input.id ?? `certificate-template-${this.certificateTemplates.length + 1}`,
      recipientRoleId: input.recipientRoleId,
      recipientRole: input.recipientRole ?? ParticipantRole.PARTICIPANT,
      name: input.name ?? 'Certificate Template',
      isDefault: input.isDefault ?? true,
      isActive: input.isActive ?? true,
    });
    this.certificateTemplates.push(template);
    return template;
  }

  addBadgeTemplate(input: Partial<Row> & { recipientRoleId: string | null }) {
    const template = {
      id: input.id ?? `badge-template-${this.badgeTemplates.length + 1}`,
      eventId: input.eventId ?? 'event-1',
      recipientRoleId: input.recipientRoleId,
      recipientRole: input.recipientRole ?? ParticipantRole.PARTICIPANT,
      name: input.name ?? 'Badge Template',
      isDefault: input.isDefault ?? true,
      isActive: input.isActive ?? true,
      createdAt: input.createdAt ?? new Date(),
    };
    this.badgeTemplates.push(template);
    return template;
  }

  addCertificate(input: Partial<Row>) {
    const certificate = {
      id: input.id ?? `certificate-${this.certificates.length + 1}`,
      eventId: input.eventId ?? 'event-1',
      registrationId: input.registrationId ?? null,
      eventRecipientId: input.eventRecipientId ?? null,
      recipientRoleId: input.recipientRoleId ?? null,
      normalizedArtifactKey: input.normalizedArtifactKey ?? null,
      isCurrent: input.isCurrent ?? true,
      certificateUrl: input.certificateUrl ?? null,
      generationStatus: input.generationStatus ?? null,
      templateId: input.templateId ?? null,
      templateVersionHash: input.templateVersionHash ?? null,
    };
    this.certificates.push(certificate);
    return certificate;
  }

  private filterTemplates(templates: Row[], where: any) {
    return templates
      .filter((template) => {
        if (where.eventId && template.eventId !== where.eventId) return false;
        if (where.isActive !== undefined && template.isActive !== where.isActive) {
          return false;
        }
        if (where.isDefault !== undefined && template.isDefault !== where.isDefault) {
          return false;
        }
        if (
          where.recipientRoleId !== undefined &&
          template.recipientRoleId !== where.recipientRoleId
        ) {
          return false;
        }
        if (where.recipientRole && template.recipientRole !== where.recipientRole) {
          return false;
        }
        return true;
      })
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }
}

class FakeResolver {
  calls: any[] = [];
  targets: ArtifactRecipientTarget[] = [];
  error: Error | null = null;
  eligibility: { approved: Set<string>; attended: Set<string> } = {
    approved: new Set(),
    attended: new Set(),
  };

  resolveTargets = jest.fn(async (input: any) => {
    this.calls.push(input);
    if (this.error) throw this.error;
    return this.targets;
  });

  classifyRegistrationEligibility = jest.fn(
    async (_eventId: string, _registrationIds: string[]) => this.eligibility,
  );
}

class FakeStorage {
  existing = new Set<string>();
  exists = jest.fn((path: string) => this.existing.has(path));
}

describe('ArtifactBulkPreviewService', () => {
  const user = { sub: 'org-1', type: UserType.ORGANIZATION } as never;

  function createService() {
    const prisma = new FakeBulkPreviewPrisma();
    const resolver = new FakeResolver();
    const storage = new FakeStorage();
    return {
      prisma,
      resolver,
      storage,
      service: new ArtifactBulkPreviewService(
        prisma as never,
        resolver as never,
        storage as never,
      ),
    };
  }

  it('previews selected normalized recipientIds without mutating certificates', async () => {
    const { service, resolver, prisma } = createService();
    resolver.targets = [target('recipient-1', 'role-participant', 'participant')];
    prisma.addCertificateTemplate({ recipientRoleId: 'role-participant' });

    const result = await service.preview(
      'event-1',
      {
        artifactType: ArtifactBulkPreviewType.CERTIFICATE,
        scope: ArtifactBulkPreviewScope.SELECTED,
        recipientIds: ['recipient-1'],
      },
      user,
    );

    expect(resolver.calls[0]).toMatchObject({
      recipientIds: ['recipient-1'],
      scope: 'ALL_ELIGIBLE',
    });
    expect(result).toMatchObject({
      recipientCount: 1,
      artifactCount: 1,
      willGenerateCount: 1,
      notGeneratedCount: 1,
    });
    expect(prisma.certificates).toHaveLength(0);
  });

  it('soft-excludes a manually selected recipient with an unapproved registration instead of failing', async () => {
    const { service, resolver, prisma } = createService();
    resolver.targets = [
      target('recipient-1', 'role-participant', 'participant', {
        registrationId: 'registration-1',
      }),
    ];
    // Registration is neither approved nor attended.
    resolver.eligibility = { approved: new Set(), attended: new Set() };
    prisma.addCertificateTemplate({ recipientRoleId: 'role-participant' });

    const result = await service.preview(
      'event-1',
      {
        artifactType: ArtifactBulkPreviewType.CERTIFICATE,
        scope: ArtifactBulkPreviewScope.SELECTED,
        registrationIds: ['registration-1'],
      },
      user,
    );

    // Manual selection resolves WITHOUT hard approval/attendance filters.
    expect(resolver.calls[0]).toMatchObject({
      registrationIds: ['registration-1'],
      scope: 'ALL_ELIGIBLE',
    });
    expect(resolver.calls[0].requireApprovedRegistration).toBeUndefined();
    // The ineligible recipient is excluded softly, not hard-failed.
    expect(result.recipientCount).toBe(0);
    expect(result.excludedRecipients).toEqual([
      { recipientId: 'recipient-1', reason: 'NOT_APPROVED' },
    ]);
  });

  it('includes a manually selected recipient whose registration is approved', async () => {
    const { service, resolver, prisma } = createService();
    resolver.targets = [
      target('recipient-1', 'role-participant', 'participant', {
        registrationId: 'registration-1',
      }),
    ];
    resolver.eligibility = {
      approved: new Set(['registration-1']),
      attended: new Set(),
    };
    prisma.addCertificateTemplate({ recipientRoleId: 'role-participant' });

    const result = await service.preview(
      'event-1',
      {
        artifactType: ArtifactBulkPreviewType.CERTIFICATE,
        scope: ArtifactBulkPreviewScope.SELECTED,
        registrationIds: ['registration-1'],
        onlyAttended: false,
      },
      user,
    );

    expect(result.recipientCount).toBe(1);
    expect(result.excludedRecipients).toEqual([]);
  });

  it('previews ROLE by roleId and roleCode', async () => {
    const { service, resolver, prisma } = createService();
    resolver.targets = [target('recipient-1', 'role-speaker', 'speaker')];
    prisma.addCertificateTemplate({ recipientRoleId: 'role-speaker' });

    await service.preview(
      'event-1',
      {
        artifactType: ArtifactBulkPreviewType.CERTIFICATE,
        scope: ArtifactBulkPreviewScope.ROLE,
        roleId: 'role-speaker',
      },
      user,
    );
    await service.preview(
      'event-1',
      {
        artifactType: ArtifactBulkPreviewType.CERTIFICATE,
        scope: ArtifactBulkPreviewScope.ROLE,
        roleCode: 'speaker',
      },
      user,
    );

    expect(resolver.calls[0]).toMatchObject({ roleId: 'role-speaker' });
    expect(resolver.calls[1]).toMatchObject({ roleCode: 'speaker' });
  });

  it('previews ALL_PARTICIPANTS and ALL_SPEAKERS including manual speakers', async () => {
    const { service, resolver, prisma } = createService();
    resolver.targets = [target('manual-speaker', 'role-speaker', 'speaker')];
    prisma.addCertificateTemplate({ recipientRoleId: 'role-speaker' });

    await service.preview(
      'event-1',
      {
        artifactType: ArtifactBulkPreviewType.CERTIFICATE,
        scope: ArtifactBulkPreviewScope.ALL_PARTICIPANTS,
      },
      user,
    );
    const speakers = await service.preview(
      'event-1',
      {
        artifactType: ArtifactBulkPreviewType.CERTIFICATE,
        scope: ArtifactBulkPreviewScope.ALL_SPEAKERS,
      },
      user,
    );

    expect(resolver.calls[0]).toMatchObject({ roleCode: 'participant' });
    expect(resolver.calls[1]).toMatchObject({ roleCode: 'speaker' });
    expect(speakers.recipientCount).toBe(1);
  });

  it('previews ALL_ELIGIBLE with a multi-role recipient as multiple artifacts', async () => {
    const { service, resolver, prisma } = createService();
    resolver.targets = [
      target('recipient-1', 'role-participant', 'participant'),
      target('recipient-1', 'role-speaker', 'speaker'),
    ];
    prisma.addCertificateTemplate({ recipientRoleId: 'role-participant' });
    prisma.addCertificateTemplate({ recipientRoleId: 'role-speaker' });

    const result = await service.preview(
      'event-1',
      {
        artifactType: ArtifactBulkPreviewType.CERTIFICATE,
        scope: ArtifactBulkPreviewScope.ALL_ELIGIBLE,
      },
      user,
    );

    expect(result.recipientCount).toBe(1);
    expect(result.artifactCount).toBe(2);
    expect(result.roles).toHaveLength(2);
  });

  it('groups missing templates by role and keeps other roles previewable', async () => {
    const { service, resolver, prisma } = createService();
    resolver.targets = [
      target('recipient-1', 'role-participant', 'participant'),
      target('recipient-2', 'role-vip', 'vip'),
    ];
    prisma.addCertificateTemplate({ recipientRoleId: 'role-participant' });

    const result = await service.preview(
      'event-1',
      {
        artifactType: ArtifactBulkPreviewType.CERTIFICATE,
        scope: ArtifactBulkPreviewScope.ALL_ELIGIBLE,
      },
      user,
    );

    expect(result.artifactCount).toBe(2);
    expect(result.missingTemplateCount).toBe(1);
    expect(result.missingTemplates).toEqual([
      expect.objectContaining({ roleId: 'role-vip', roleCode: 'vip' }),
    ]);
  });

  it('uses legacy recipientRole fallback only when a normalized template is absent', async () => {
    const { service, resolver, prisma } = createService();
    resolver.targets = [target('recipient-1', 'role-participant', 'participant')];
    prisma.addCertificateTemplate({
      recipientRoleId: null,
      recipientRole: ParticipantRole.PARTICIPANT,
    });

    const fallback = await service.preview(
      'event-1',
      {
        artifactType: ArtifactBulkPreviewType.CERTIFICATE,
        scope: ArtifactBulkPreviewScope.ALL_ELIGIBLE,
      },
      user,
    );

    expect(fallback.missingTemplateCount).toBe(0);
    expect(fallback.willGenerateCount).toBe(1);
    expect(prisma.certificateTemplate.findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({ recipientRoleId: 'role-participant' }),
      }),
    );
    expect(prisma.certificateTemplate.findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({ recipientRoleId: null }),
      }),
    );

    const normalized = createService();
    normalized.resolver.targets = [
      target('recipient-1', 'role-participant', 'participant'),
    ];
    normalized.prisma.addCertificateTemplate({
      recipientRoleId: 'role-participant',
      id: 'normalized-template',
    });
    normalized.prisma.addCertificateTemplate({
      recipientRoleId: null,
      recipientRole: ParticipantRole.PARTICIPANT,
      id: 'legacy-template',
    });

    await normalized.service.preview(
      'event-1',
      {
        artifactType: ArtifactBulkPreviewType.CERTIFICATE,
        scope: ArtifactBulkPreviewScope.ALL_ELIGIBLE,
      },
      user,
    );

    expect(normalized.prisma.certificateTemplate.findMany).toHaveBeenCalledTimes(1);
  });

  it('reports certificate READY, STALE, NOT_GENERATED, FAILED, and PROCESSING counts', async () => {
    const { service, resolver, prisma, storage } = createService();
    const template = prisma.addCertificateTemplate({
      recipientRoleId: 'role-participant',
      id: 'template-current',
    });
    const hash = templateHash(template);
    storage.existing.add('/ready.pdf');
    resolver.targets = [
      target('ready-recipient', 'role-participant', 'participant'),
      target('stale-recipient', 'role-participant', 'participant'),
      target('new-recipient', 'role-participant', 'participant'),
      target('failed-recipient', 'role-participant', 'participant'),
      target('processing-recipient', 'role-participant', 'participant'),
    ];
    prisma.addCertificate({
      eventRecipientId: 'ready-recipient',
      recipientRoleId: 'role-participant',
      certificateUrl: '/ready.pdf',
      generationStatus: AssetGenerationStatus.READY,
      templateId: template.id,
      templateVersionHash: hash,
      normalizedArtifactKey: artifactKey(
        'event-1',
        'ready-recipient',
        'role-participant',
        template.id,
        hash,
      ),
    });
    prisma.addCertificate({
      eventRecipientId: 'stale-recipient',
      recipientRoleId: 'role-participant',
      certificateUrl: '/old.pdf',
      generationStatus: AssetGenerationStatus.READY,
      templateId: 'old-template',
      templateVersionHash: 'old-hash',
    });
    prisma.addCertificate({
      eventRecipientId: 'failed-recipient',
      recipientRoleId: 'role-participant',
      generationStatus: AssetGenerationStatus.FAILED,
      templateId: template.id,
      templateVersionHash: hash,
    });
    prisma.addCertificate({
      eventRecipientId: 'processing-recipient',
      recipientRoleId: 'role-participant',
      generationStatus: AssetGenerationStatus.PROCESSING,
      templateId: template.id,
      templateVersionHash: hash,
    });

    const result = await service.preview(
      'event-1',
      {
        artifactType: ArtifactBulkPreviewType.CERTIFICATE,
        scope: ArtifactBulkPreviewScope.ALL_ELIGIBLE,
      },
      user,
    );

    expect(result).toMatchObject({
      readyCount: 1,
      staleCount: 1,
      notGeneratedCount: 1,
      failedCount: 1,
      processingCount: 1,
      willSkipCount: 1,
      willGenerateCount: 3,
      willRegenerateCount: 1,
    });
  });

  it('staleOnly only counts stale certificates', async () => {
    const { service, resolver, prisma, storage } = createService();
    const template = prisma.addCertificateTemplate({
      recipientRoleId: 'role-participant',
      id: 'template-current',
    });
    const hash = templateHash(template);
    storage.existing.add('/ready.pdf');
    resolver.targets = [
      target('ready-recipient', 'role-participant', 'participant'),
      target('stale-recipient', 'role-participant', 'participant'),
    ];
    prisma.addCertificate({
      eventRecipientId: 'ready-recipient',
      recipientRoleId: 'role-participant',
      certificateUrl: '/ready.pdf',
      generationStatus: AssetGenerationStatus.READY,
      templateId: template.id,
      templateVersionHash: hash,
      normalizedArtifactKey: artifactKey(
        'event-1',
        'ready-recipient',
        'role-participant',
        template.id,
        hash,
      ),
    });
    prisma.addCertificate({
      eventRecipientId: 'stale-recipient',
      recipientRoleId: 'role-participant',
      certificateUrl: '/old.pdf',
      generationStatus: AssetGenerationStatus.READY,
      templateId: 'old-template',
      templateVersionHash: 'old-hash',
    });

    const result = await service.preview(
      'event-1',
      {
        artifactType: ArtifactBulkPreviewType.CERTIFICATE,
        scope: ArtifactBulkPreviewScope.ALL_ELIGIBLE,
        staleOnly: true,
      },
      user,
    );

    expect(result).toMatchObject({
      artifactCount: 1,
      staleCount: 1,
      readyCount: 0,
      willRegenerateCount: 1,
    });
  });

  it('forceRegenerate counts ready certificates for regeneration', async () => {
    const { service, resolver, prisma, storage } = createService();
    const template = prisma.addCertificateTemplate({
      recipientRoleId: 'role-participant',
      id: 'template-current',
    });
    const hash = templateHash(template);
    storage.existing.add('/ready.pdf');
    resolver.targets = [target('ready-recipient', 'role-participant', 'participant')];
    prisma.addCertificate({
      eventRecipientId: 'ready-recipient',
      recipientRoleId: 'role-participant',
      certificateUrl: '/ready.pdf',
      generationStatus: AssetGenerationStatus.READY,
      templateId: template.id,
      templateVersionHash: hash,
      normalizedArtifactKey: artifactKey(
        'event-1',
        'ready-recipient',
        'role-participant',
        template.id,
        hash,
      ),
    });

    const result = await service.preview(
      'event-1',
      {
        artifactType: ArtifactBulkPreviewType.CERTIFICATE,
        scope: ArtifactBulkPreviewScope.ALL_ELIGIBLE,
        forceRegenerate: true,
      },
      user,
    );

    expect(result.readyCount).toBe(1);
    expect(result.willRegenerateCount).toBe(1);
    expect(result.willSkipCount).toBe(0);
  });

  it('can exclude ready or stale certificate rows from the preview counts', async () => {
    const { service, resolver, prisma, storage } = createService();
    const template = prisma.addCertificateTemplate({
      recipientRoleId: 'role-participant',
      id: 'template-current',
    });
    const hash = templateHash(template);
    storage.existing.add('/ready.pdf');
    resolver.targets = [
      target('ready-recipient', 'role-participant', 'participant'),
      target('stale-recipient', 'role-participant', 'participant'),
    ];
    prisma.addCertificate({
      eventRecipientId: 'ready-recipient',
      recipientRoleId: 'role-participant',
      certificateUrl: '/ready.pdf',
      generationStatus: AssetGenerationStatus.READY,
      templateId: template.id,
      templateVersionHash: hash,
      normalizedArtifactKey: artifactKey(
        'event-1',
        'ready-recipient',
        'role-participant',
        template.id,
        hash,
      ),
    });
    prisma.addCertificate({
      eventRecipientId: 'stale-recipient',
      recipientRoleId: 'role-participant',
      certificateUrl: '/old.pdf',
      generationStatus: AssetGenerationStatus.READY,
      templateId: 'old-template',
      templateVersionHash: 'old-hash',
    });

    const withoutReady = await service.preview(
      'event-1',
      {
        artifactType: ArtifactBulkPreviewType.CERTIFICATE,
        scope: ArtifactBulkPreviewScope.ALL_ELIGIBLE,
        includeReady: false,
      },
      user,
    );
    const withoutStale = await service.preview(
      'event-1',
      {
        artifactType: ArtifactBulkPreviewType.CERTIFICATE,
        scope: ArtifactBulkPreviewScope.ALL_ELIGIBLE,
        includeStale: false,
      },
      user,
    );

    expect(withoutReady).toMatchObject({ artifactCount: 1, readyCount: 0 });
    expect(withoutStale).toMatchObject({ artifactCount: 1, staleCount: 0 });
  });

  it('previews badge generatable and missing template counts', async () => {
    const { service, resolver, prisma } = createService();
    resolver.targets = [
      target('recipient-1', 'role-participant', 'participant'),
      target('recipient-2', 'role-vip', 'vip'),
    ];
    prisma.addBadgeTemplate({ recipientRoleId: 'role-participant' });

    const result = await service.preview(
      'event-1',
      {
        artifactType: ArtifactBulkPreviewType.BADGE,
        scope: ArtifactBulkPreviewScope.ALL_ELIGIBLE,
      },
      user,
    );

    expect(result.willGenerateCount).toBe(1);
    expect(result.missingTemplateCount).toBe(1);
    expect(result.roles[0].statusBreakdown.generatable).toBe(1);
    expect(resolver.calls[0]).toMatchObject({
      requireApprovedRegistration: true,
      requireAttendance: false,
    });

    await service.preview(
      'event-1',
      {
        artifactType: ArtifactBulkPreviewType.BADGE,
        scope: ArtifactBulkPreviewScope.ALL_ELIGIBLE,
        onlyApproved: false,
      },
      user,
    );

    expect(resolver.calls[1]).toMatchObject({
      requireApprovedRegistration: false,
      requireAttendance: false,
    });
  });

  it('returns excluded recipients for selected role mismatch', async () => {
    const { service, resolver, prisma } = createService();
    resolver.targets = [
      target('recipient-1', 'role-participant', 'participant'),
      target('recipient-2', 'role-vip', 'vip'),
    ];
    prisma.addCertificateTemplate({ recipientRoleId: 'role-vip' });

    const result = await service.preview(
      'event-1',
      {
        artifactType: ArtifactBulkPreviewType.CERTIFICATE,
        scope: ArtifactBulkPreviewScope.SELECTED,
        recipientIds: ['recipient-1', 'recipient-2'],
        roleCode: 'vip',
      },
      user,
    );

    expect(result.artifactCount).toBe(1);
    expect(result.excludedRecipients).toEqual([
      { recipientId: 'recipient-1', reason: 'ROLE_MISMATCH' },
    ]);
  });

  it('adds a large bulk warning over threshold', async () => {
    const { service, resolver, prisma } = createService();
    resolver.targets = Array.from({ length: 101 }, (_, index) =>
      target(`recipient-${index}`, 'role-participant', 'participant'),
    );
    prisma.addCertificateTemplate({ recipientRoleId: 'role-participant' });

    const result = await service.preview(
      'event-1',
      {
        artifactType: ArtifactBulkPreviewType.CERTIFICATE,
        scope: ArtifactBulkPreviewScope.ALL_ELIGIBLE,
      },
      user,
    );

    expect(result.warnings).toEqual([
      expect.objectContaining({ code: 'LARGE_BULK_ACTION' }),
    ]);
  });

  it('rejects cross-event recipient, role, and registration selections through resolver/boundary checks', async () => {
    const { service, resolver, prisma } = createService();
    prisma.events.push({ id: 'event-2', organizationId: 'org-2' });
    resolver.error = new BadRequestException('Selected recipients do not belong');

    await expect(
      service.preview(
        'event-1',
        {
          artifactType: ArtifactBulkPreviewType.CERTIFICATE,
          scope: ArtifactBulkPreviewScope.SELECTED,
          recipientIds: ['other-recipient'],
        },
        user,
      ),
    ).rejects.toThrow('Selected recipients do not belong');

    resolver.error = new BadRequestException(
      'Selected registrations do not match the requested event/status/attendance filters',
    );
    await expect(
      service.preview(
        'event-1',
        {
          artifactType: ArtifactBulkPreviewType.CERTIFICATE,
          scope: ArtifactBulkPreviewScope.SELECTED,
          registrationIds: ['other-registration'],
        },
        user,
      ),
    ).rejects.toThrow(
      'Selected registrations do not match the requested event/status/attendance filters',
    );

    resolver.error = new BadRequestException(
      'Selected recipient role does not belong to this event',
    );
    await expect(
      service.preview(
        'event-1',
        {
          artifactType: ArtifactBulkPreviewType.CERTIFICATE,
          scope: ArtifactBulkPreviewScope.ROLE,
          roleId: 'other-role',
        },
        user,
      ),
    ).rejects.toThrow('Selected recipient role does not belong to this event');

    await expect(
      service.preview(
        'event-2',
        {
          artifactType: ArtifactBulkPreviewType.CERTIFICATE,
          scope: ArtifactBulkPreviewScope.ALL_ELIGIBLE,
        },
        user,
      ),
    ).rejects.toThrow('Нет доступа к этому мероприятию');
  });
});

function target(
  recipientId: string,
  roleId: string,
  roleCode: string,
  overrides: Partial<ArtifactRecipientTarget> = {},
): ArtifactRecipientTarget {
  return {
    recipientId,
    recipientRoleId: roleId,
    roleCode,
    roleDisplayName:
      roleCode === 'participant'
        ? 'Participant'
        : roleCode === 'speaker'
          ? 'Speaker'
          : roleCode.toUpperCase(),
    builtInKey:
      roleCode === 'participant'
        ? BuiltInEventRecipientRoleKey.PARTICIPANT
        : roleCode === 'speaker'
          ? BuiltInEventRecipientRoleKey.SPEAKER
          : null,
    assignmentId: `assignment-${recipientId}-${roleId}`,
    displayName: recipientId,
    firstName: null,
    lastName: null,
    email: null,
    userId: null,
    registrationId: null,
    speakerId: null,
    sourceTypes: [],
    qrPayload: recipientId,
    ...overrides,
  };
}

function templateRow(input: Partial<Row> & { id: string; recipientRoleId: string }) {
  return {
    eventId: 'event-1',
    recipientRole: ParticipantRole.PARTICIPANT,
    sizePreset: 'A4_LANDSCAPE',
    widthPx: 3508,
    heightPx: 2480,
    templateUrl: `/uploads/${input.id}.png`,
    namePosition: { x: 50, y: 50 },
    datePosition: null,
    eventNamePosition: null,
    firstNamePosition: null,
    lastNamePosition: null,
    qrPosition: null,
    nameFontSize: null,
    nameFont: null,
    nameColor: null,
    isDefault: true,
    isActive: true,
    createdAt: new Date(),
    ...input,
  };
}

function templateHash(template: Row): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        recipientRole: template.recipientRole ?? null,
        recipientRoleId: template.recipientRoleId ?? null,
        sizePreset: template.sizePreset,
        widthPx: template.widthPx ?? null,
        heightPx: template.heightPx ?? null,
        templateUrl: template.templateUrl ?? null,
        namePosition: template.namePosition,
        datePosition: template.datePosition,
        eventNamePosition: template.eventNamePosition,
        firstNamePosition: template.firstNamePosition,
        lastNamePosition: template.lastNamePosition,
        qrPosition: template.qrPosition,
        nameFontSize: template.nameFontSize,
        nameFont: template.nameFont,
        nameColor: template.nameColor,
      }),
    )
    .digest('hex');
}

function artifactKey(
  eventId: string,
  recipientId: string,
  roleId: string,
  templateId: string,
  hash: string,
) {
  return [eventId, recipientId, roleId, templateId, hash].join(':');
}

function selectFields(row: Row, select: Record<string, boolean>) {
  return Object.fromEntries(
    Object.entries(select)
      .filter(([, include]) => include)
      .map(([field]) => [field, row[field]]),
  );
}
