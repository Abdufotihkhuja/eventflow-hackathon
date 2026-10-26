import {
  AssetGenerationStatus,
  EventStatus,
  ParticipantRole,
} from '@prisma/client';
import { CertificateGenerationService } from './certificate-generation.service';
import { QUEUE_NAMES } from '../../platform/queue/queue.types';
import { artifactRecipientIdentityHash } from '../../shared/artifact-identity';

jest.mock('uuid', () => ({ v4: () => 'verification-code' }));

describe('CertificateGenerationService safety checks', () => {
  const template = {
    id: 'template-id',
    eventId: 'event-id',
    recipientRoleId: 'role-id',
    recipientRole: ParticipantRole.PARTICIPANT,
    sizePreset: 'A4_LANDSCAPE',
    widthPx: 3508,
    heightPx: 2480,
    templateUrl: '/uploads/certificate-templates/template.png',
    namePosition: { x: 10, y: 20 },
    datePosition: null,
    eventNamePosition: null,
    firstNamePosition: null,
    lastNamePosition: null,
    qrPosition: null,
    nameFontSize: null,
    nameFont: null,
    nameColor: null,
  };
  const target = {
    recipientId: 'recipient-id',
    recipientRoleId: 'role-id',
    roleCode: 'participant',
    builtInKey: 'PARTICIPANT',
    assignmentId: 'assignment-id',
    displayName: 'Ada Lovelace',
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@test.dev',
    userId: 'user-id',
    registrationId: 'registration-id',
    speakerId: null,
    sourceTypes: ['REGISTRATION'],
    qrPayload: 'registration-id',
  };
  const speakerTarget = {
    ...target,
    recipientRoleId: 'speaker-role-id',
    roleCode: 'speaker',
    builtInKey: 'SPEAKER',
    assignmentId: 'speaker-assignment-id',
    speakerId: 'speaker-id',
  };

  function createService() {
    const prisma = {
      event: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'event-id',
          title: 'Event',
          status: EventStatus.COMPLETED,
          startDate: new Date('2026-01-01T00:00:00Z'),
          organization: { companyName: 'Org' },
        }),
      },
      certificateTemplate: {
        findFirst: jest.fn().mockResolvedValue(template),
        findMany: jest.fn().mockImplementation(({ where }) => {
          if (where.recipientRoleId === 'role-id') {
            return Promise.resolve([template]);
          }
          return Promise.resolve([]);
        }),
      },
      certificate: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 'certificate-id',
            verificationCode: data.verificationCode ?? null,
            ...data,
          }),
        ),
        update: jest.fn().mockImplementation(({ where, data }) =>
          Promise.resolve({
            id: where.id ?? 'certificate-id',
            verificationCode: data.verificationCode ?? 'verification-code',
            ...data,
          }),
        ),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      registration: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            { id: 'registration-id', role: ParticipantRole.PARTICIPANT },
          ]),
      },
    };
    (prisma as { $transaction?: jest.Mock }).$transaction = jest.fn(
      async (arg: unknown) =>
        typeof arg === 'function'
          ? (arg as (tx: typeof prisma) => unknown)(prisma)
          : Promise.all(arg as Promise<unknown>[]),
    );

    const uploads = {
      getTemplateFilePath: jest.fn().mockReturnValue('/tmp/template.png'),
    };
    const storage = {
      ensureDirectory: jest.fn(),
      exists: jest.fn().mockReturnValue(true),
      save: jest.fn(),
    };
    const queueService = {
      getQueueDepth: jest.fn().mockResolvedValue(0),
      createJobId: jest.fn().mockReturnValue('job-id'),
      getJobStatus: jest.fn().mockResolvedValue({ state: 'unknown' }),
      removeJob: jest.fn().mockResolvedValue(undefined),
      enqueueCertificateGeneration: jest
        .fn()
        .mockResolvedValue({ jobId: 'job-id' }),
      waitForJob: jest.fn().mockResolvedValue({
        status: 'completed',
        result: { generated: 0, failed: 0, skipped: 0, forceRegenerate: false },
      }),
    };
    const resolver = {
      resolveTargets: jest.fn().mockResolvedValue([target]),
      // Default: every requested registration is eligible (approved + attended).
      // Tests override this to simulate ineligible recipients.
      classifyRegistrationEligibility: jest
        .fn()
        .mockImplementation(async (_eventId: string, registrationIds: string[]) => ({
          approved: new Set(registrationIds),
          attended: new Set(registrationIds),
        })),
    };
    const mail = {
      sendCertificateIssued: jest.fn().mockResolvedValue(undefined),
    };
    const service = new CertificateGenerationService(
      prisma as never,
      uploads as never,
      { get: jest.fn() } as never,
      storage as never,
      queueService as never,
      resolver as never,
      mail as never,
    { consume: jest.fn().mockResolvedValue({ allowed: true, deduped: false }) } as never, // QuotaService (E-6)
    );
    jest
      .spyOn(service as never, 'generatePdfWithTemplate')
      .mockResolvedValue('generated.pdf' as never);

    return { prisma, queueService, resolver, service, storage, mail };
  }

  it('returns a missing template error when no active default exists', async () => {
    const { prisma, service } = createService();
    prisma.certificateTemplate.findMany.mockResolvedValue([]);

    await expect(
      service.getOrScheduleGeneration('event-id', {
        recipientRole: ParticipantRole.PARTICIPANT,
      }),
    ).rejects.toThrow(/Нет шаблона сертификата/);

    expect(prisma.certificateTemplate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isActive: true,
          isDefault: true,
          recipientRoleId: target.recipientRoleId,
        }),
      }),
    );
  });

  it('soft-filters ineligible manual selection instead of hard-failing (EXCLUDE default)', async () => {
    const { resolver, service } = createService();
    // The selected recipient resolves fine by role/event, but their
    // registration is not approved → ineligible under the default EXCLUDE policy.
    resolver.classifyRegistrationEligibility.mockResolvedValue({
      approved: new Set<string>(),
      attended: new Set<string>(),
    });

    // No hard 4xx leaking UUIDs: everyone selected was filtered out, so it
    // surfaces a clean "no recipients" error instead.
    await expect(
      service.getOrScheduleGeneration('event-id', {
        recipientIds: ['recipient-id'],
      }),
    ).rejects.toThrow(/Нет получателей/);

    // Manual selection must resolve WITHOUT the hard approval/attendance filters.
    const call = resolver.resolveTargets.mock.calls[0][0];
    expect(call).toMatchObject({ recipientIds: ['recipient-id'] });
    expect(call.requireApprovedRegistration).toBeUndefined();
    expect(call.requireAttendance).toBeUndefined();
  });

  it('issues to everyone selected when ineligiblePolicy is INCLUDE', async () => {
    const { resolver, service } = createService();
    // Even with no eligible registrations, INCLUDE trusts the manual selection.
    resolver.classifyRegistrationEligibility.mockResolvedValue({
      approved: new Set<string>(),
      attended: new Set<string>(),
    });

    const result = await service.getOrScheduleGeneration('event-id', {
      recipientIds: ['recipient-id'],
      ineligiblePolicy: 'INCLUDE',
    });

    expect(result).toBeDefined();
    // INCLUDE bypasses eligibility filtering entirely.
    expect(resolver.classifyRegistrationEligibility).not.toHaveBeenCalled();
  });

  it('skips an existing non-stale certificate when forceRegenerate is false', async () => {
    const { prisma, service, mail } = createService();
    const templateVersionHash = service.getTemplateVersionHash(template);
    prisma.certificate.findMany.mockResolvedValueOnce([
      {
        id: 'registration-id',
        eventRecipientId: target.recipientId,
        recipientRoleId: target.recipientRoleId,
        registrationId: target.registrationId,
        normalizedArtifactKey: [
          'certificate',
          'event-id',
          target.recipientId,
          target.recipientRoleId,
          template.id,
          templateVersionHash,
        ].join(':'),
        isCurrent: true,
        certificateUrl: '/uploads/certificates/existing.pdf',
        generationStatus: AssetGenerationStatus.READY,
        templateId: template.id,
        templateVersionHash,
        verificationCode: 'existing-code',
        recipientName: 'Ada Lovelace',
      },
    ]);

    const result = await service.processGenerateCertificatesJob({
      jobId: 'job-id',
      type: 'certificate.batch',
      entityId: 'event-id',
      eventId: 'event-id',
      generate: { recipientRole: ParticipantRole.PARTICIPANT },
    });

    expect(result).toMatchObject({ generated: 0, skipped: 1 });
    expect(prisma.certificate.create).not.toHaveBeenCalled();
    // Already-issued certificate is skipped → no notification re-sent.
    expect(mail.sendCertificateIssued).not.toHaveBeenCalled();
  });

  it('regenerates an existing certificate when forceRegenerate is true', async () => {
    const { prisma, service, mail } = createService();
    const staleHash = 'old-template-hash';
    prisma.certificate.findMany.mockResolvedValueOnce([
      {
        id: 'registration-id',
        eventRecipientId: target.recipientId,
        recipientRoleId: target.recipientRoleId,
        registrationId: target.registrationId,
        normalizedArtifactKey: [
          'certificate',
          'event-id',
          target.recipientId,
          target.recipientRoleId,
          template.id,
          staleHash,
        ].join(':'),
        isCurrent: true,
        certificateUrl: '/uploads/certificates/existing.pdf',
        generationStatus: AssetGenerationStatus.READY,
        templateId: template.id,
        templateVersionHash: staleHash,
        verificationCode: 'existing-code',
      },
    ]);

    const result = await service.processGenerateCertificatesJob({
      jobId: 'job-id',
      type: 'certificate.batch',
      entityId: 'event-id',
      eventId: 'event-id',
      generate: {
        recipientRole: ParticipantRole.PARTICIPANT,
        forceRegenerate: true,
      },
    });

    expect(result).toMatchObject({
      generated: 1,
      skipped: 0,
      forceRegenerate: true,
    });
    expect(prisma.certificate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          certificateUrl: '/uploads/certificates/generated.pdf',
          templateVersionHash: service.getTemplateVersionHash(template),
          verificationCode: 'verification-code',
        }),
      }),
    );
    // Recipient is notified, with a stable per-recipient+event idempotency key.
    expect(mail.sendCertificateIssued).toHaveBeenCalledTimes(1);
    expect(mail.sendCertificateIssued).toHaveBeenCalledWith(
      'ada@test.dev',
      expect.any(String),
      expect.any(String),
      expect.objectContaining({
        idempotencyKey: `certificate-issued:event-id:${target.registrationId}`,
      }),
    );
  });

  it('preserves verification code when forceRegenerate targets the same normalized artifact', async () => {
    const { prisma, service } = createService();
    const templateVersionHash = service.getTemplateVersionHash(template);
    const normalizedArtifactKey = [
      'certificate',
      'event-id',
      target.recipientId,
      target.recipientRoleId,
      template.id,
      templateVersionHash,
    ].join(':');
    prisma.certificate.findMany.mockResolvedValueOnce([
      {
        id: 'certificate-id',
        eventRecipientId: target.recipientId,
        recipientRoleId: target.recipientRoleId,
        registrationId: target.registrationId,
        normalizedArtifactKey,
        isCurrent: true,
        certificateUrl: '/uploads/certificates/existing.pdf',
        generationStatus: AssetGenerationStatus.READY,
        templateId: template.id,
        templateVersionHash,
        verificationCode: 'existing-code',
      },
    ]);
    prisma.certificate.findUnique.mockResolvedValueOnce({
      id: 'certificate-id',
      verificationCode: 'existing-code',
    });

    const result = await service.processGenerateCertificatesJob({
      jobId: 'job-id',
      type: 'certificate.batch',
      entityId: 'event-id',
      eventId: 'event-id',
      generate: {
        recipientRole: ParticipantRole.PARTICIPANT,
        forceRegenerate: true,
      },
    });

    expect(result).toMatchObject({ generated: 1, skipped: 0 });
    expect(prisma.certificate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'certificate-id' },
        data: expect.objectContaining({
          verificationCode: 'existing-code',
          certificateUrl: '/uploads/certificates/generated.pdf',
        }),
      }),
    );
  });

  it('regenerates stale certificates even when certificateUrl exists and forceRegenerate is false', async () => {
    const { prisma, service } = createService();
    prisma.certificate.findMany.mockResolvedValueOnce([
      {
        id: 'registration-id',
        eventRecipientId: target.recipientId,
        recipientRoleId: target.recipientRoleId,
        registrationId: target.registrationId,
        normalizedArtifactKey: [
          'certificate',
          'event-id',
          target.recipientId,
          target.recipientRoleId,
          template.id,
          'old-template-hash',
        ].join(':'),
        isCurrent: true,
        certificateUrl: '/uploads/certificates/existing.pdf',
        generationStatus: AssetGenerationStatus.READY,
        templateId: template.id,
        templateVersionHash: 'old-template-hash',
        verificationCode: 'existing-code',
      },
    ]);

    const result = await service.processGenerateCertificatesJob({
      jobId: 'job-id',
      type: 'certificate.batch',
      entityId: 'event-id',
      eventId: 'event-id',
      generate: { recipientRole: ParticipantRole.PARTICIPANT },
    });

    expect(result).toMatchObject({ generated: 1, skipped: 0 });
  });

  it('regenerates a certificate when the recipient was renamed, keeping the verification code', async () => {
    const { prisma, service } = createService();
    const templateVersionHash = service.getTemplateVersionHash(template);
    const normalizedArtifactKey = [
      'certificate',
      'event-id',
      target.recipientId,
      target.recipientRoleId,
      template.id,
      templateVersionHash,
    ].join(':');
    prisma.certificate.findMany.mockResolvedValueOnce([
      {
        id: 'certificate-id',
        eventRecipientId: target.recipientId,
        recipientRoleId: target.recipientRoleId,
        registrationId: target.registrationId,
        normalizedArtifactKey,
        isCurrent: true,
        certificateUrl: '/uploads/certificates/existing.pdf',
        generationStatus: AssetGenerationStatus.READY,
        templateId: template.id,
        templateVersionHash,
        verificationCode: 'existing-code',
        // Issued under the previous name; the recipient is now "Ada Lovelace".
        recipientName: 'Ada Byron',
      },
    ]);

    const result = await service.processGenerateCertificatesJob({
      jobId: 'job-id',
      type: 'certificate.batch',
      entityId: 'event-id',
      eventId: 'event-id',
      generate: { recipientRole: ParticipantRole.PARTICIPANT },
    });

    expect(result).toMatchObject({ generated: 1, skipped: 0 });
    expect(prisma.certificate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          recipientName: 'Ada Lovelace',
          verificationCode: 'existing-code',
        }),
      }),
    );
  });

  it('keeps an issued certificate whose stored name still matches the recipient', async () => {
    const { prisma, service } = createService();
    const templateVersionHash = service.getTemplateVersionHash(template);
    prisma.certificate.findMany.mockResolvedValueOnce([
      {
        id: 'certificate-id',
        eventRecipientId: target.recipientId,
        recipientRoleId: target.recipientRoleId,
        registrationId: target.registrationId,
        normalizedArtifactKey: [
          'certificate',
          'event-id',
          target.recipientId,
          target.recipientRoleId,
          template.id,
          templateVersionHash,
        ].join(':'),
        isCurrent: true,
        certificateUrl: '/uploads/certificates/existing.pdf',
        generationStatus: AssetGenerationStatus.READY,
        templateId: template.id,
        templateVersionHash,
        verificationCode: 'existing-code',
        recipientName: 'Ada Lovelace',
      },
    ]);

    const result = await service.processGenerateCertificatesJob({
      jobId: 'job-id',
      type: 'certificate.batch',
      entityId: 'event-id',
      eventId: 'event-id',
      generate: { recipientRole: ParticipantRole.PARTICIPANT },
    });

    expect(result).toMatchObject({ generated: 0, skipped: 1 });
  });

  it('derives the job id from template versions and recipient identity, and clears a finished job with the same id', async () => {
    const { queueService, service } = createService();
    queueService.getJobStatus.mockResolvedValueOnce({ state: 'completed' });

    await service.getOrScheduleGeneration('event-id', {
      recipientRole: ParticipantRole.PARTICIPANT,
    });

    const parts = queueService.createJobId.mock.calls[0][0] as string[];
    expect(parts).toContain(
      `role-id=${template.id}:${service.getTemplateVersionHash(template)}`,
    );
    expect(parts).toContain(artifactRecipientIdentityHash(target));
    expect(queueService.removeJob).toHaveBeenCalledWith(
      QUEUE_NAMES.CERTIFICATES,
      'job-id',
    );
  });

  it('generates separate certificates for participant and speaker targets on the same recipient', async () => {
    const { prisma, resolver, service } = createService();
    resolver.resolveTargets.mockResolvedValue([target, speakerTarget]);
    prisma.certificate.findMany.mockResolvedValue([]);
    prisma.certificateTemplate.findMany.mockImplementation(({ where }) => {
      if (where.recipientRoleId === speakerTarget.recipientRoleId) {
        return Promise.resolve([
          {
            ...template,
            id: 'speaker-template-id',
            recipientRoleId: speakerTarget.recipientRoleId,
            recipientRole: ParticipantRole.SPEAKER,
          },
        ]);
      }
      if (where.recipientRoleId === target.recipientRoleId) {
        return Promise.resolve([
          {
            ...template,
            recipientRoleId: target.recipientRoleId,
          },
        ]);
      }
      return Promise.resolve([]);
    });

    const result = await service.processGenerateCertificatesJob({
      jobId: 'job-id',
      type: 'certificate.batch',
      entityId: 'event-id',
      eventId: 'event-id',
      generate: { scope: 'ALL_ELIGIBLE', onlyAttended: false },
    });

    expect(result).toMatchObject({ generated: 2, skipped: 0 });
    const readyUpdates = prisma.certificate.update.mock.calls
      .map(([call]) => call.data)
      .filter(
        (data) => data.generationStatus === AssetGenerationStatus.READY,
      );
    expect(
      readyUpdates.filter(
        (data) => data.registrationId === 'registration-id',
      ),
    ).toHaveLength(1);
    expect(readyUpdates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ recipientRoleId: target.recipientRoleId }),
        expect.objectContaining({
          recipientRoleId: speakerTarget.recipientRoleId,
        }),
      ]),
    );
  });

  it('uses the registration role as the preferred legacy certificate link', async () => {
    const { prisma, resolver, service } = createService();
    resolver.resolveTargets.mockResolvedValue([target, speakerTarget]);
    prisma.registration.findMany.mockResolvedValue([
      { id: 'registration-id', role: ParticipantRole.SPEAKER },
    ]);
    prisma.certificate.findMany.mockResolvedValue([]);
    prisma.certificateTemplate.findMany.mockImplementation(({ where }) => {
      if (where.recipientRoleId === speakerTarget.recipientRoleId) {
        return Promise.resolve([
          {
          ...template,
          id: 'speaker-template-id',
            recipientRoleId: speakerTarget.recipientRoleId,
          recipientRole: ParticipantRole.SPEAKER,
          },
        ]);
      }
      if (where.recipientRoleId === target.recipientRoleId) {
        return Promise.resolve([
          {
            ...template,
            recipientRoleId: target.recipientRoleId,
          },
        ]);
      }
      return Promise.resolve([]);
    });

    await service.processGenerateCertificatesJob({
      jobId: 'job-id',
      type: 'certificate.batch',
      entityId: 'event-id',
      eventId: 'event-id',
      generate: { scope: 'ALL_ELIGIBLE', onlyAttended: false },
    });

    const readyUpdates = prisma.certificate.update.mock.calls
      .map(([call]) => call.data)
      .filter(
        (data) => data.generationStatus === AssetGenerationStatus.READY,
      );
    const speakerUpdate = readyUpdates.find(
      (data) => data.recipientRoleId === speakerTarget.recipientRoleId,
    );
    const participantUpdate = readyUpdates.find(
      (data) => data.recipientRoleId === target.recipientRoleId,
    );

    expect(speakerUpdate?.registrationId).toBe('registration-id');
    expect(participantUpdate?.registrationId).toBeNull();
  });

  it('does not attach legacy registrationId when generating a non-preferred registration role only', async () => {
    const { prisma, service } = createService();
    prisma.registration.findMany.mockResolvedValue([
      { id: 'registration-id', role: ParticipantRole.SPEAKER },
    ]);
    prisma.certificate.findMany.mockResolvedValue([]);

    await service.processGenerateCertificatesJob({
      jobId: 'job-id',
      type: 'certificate.batch',
      entityId: 'event-id',
      eventId: 'event-id',
      generate: { recipientRole: ParticipantRole.PARTICIPANT },
    });

    const readyUpdate = prisma.certificate.update.mock.calls
      .map(([call]) => call.data)
      .find((data) => data.generationStatus === AssetGenerationStatus.READY);

    expect(readyUpdate).toEqual(
      expect.objectContaining({
        recipientRoleId: target.recipientRoleId,
        registrationId: null,
      }),
    );
  });

  it('repairs legacy certificates that have role but no normalized recipient', async () => {
    const { prisma, service } = createService();
    prisma.certificate.findMany.mockResolvedValueOnce([
      {
        id: 'legacy-certificate-id',
        eventRecipientId: null,
        recipientRoleId: target.recipientRoleId,
        registrationId: target.registrationId,
        normalizedArtifactKey: null,
        isCurrent: true,
        certificateUrl: '/uploads/certificates/existing.pdf',
        generationStatus: AssetGenerationStatus.READY,
        templateId: template.id,
        templateVersionHash: service.getTemplateVersionHash(template),
        verificationCode: 'legacy-code',
        recipientName: 'Ada Lovelace',
      },
    ]);

    const result = await service.processGenerateCertificatesJob({
      jobId: 'job-id',
      type: 'certificate.batch',
      entityId: 'event-id',
      eventId: 'event-id',
      generate: { recipientRole: ParticipantRole.PARTICIPANT },
    });

    expect(result).toMatchObject({ generated: 0, skipped: 1 });
    expect(prisma.certificate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'legacy-certificate-id' },
        data: expect.objectContaining({
          eventId: 'event-id',
          eventRecipientId: target.recipientId,
          recipientRoleId: target.recipientRoleId,
          isCurrent: true,
        }),
      }),
    );
  });

  it('reports missing templates for unsupported normalized roles in all eligible generation', async () => {
    const { prisma, resolver, service } = createService();
    resolver.resolveTargets.mockResolvedValue([
      target,
      {
        ...target,
        recipientRoleId: 'vip-role-id',
        roleCode: 'vip',
        builtInKey: 'VIP',
        assignmentId: 'vip-assignment-id',
      },
    ]);
    prisma.certificate.findMany.mockResolvedValue([]);

    const result = await service.processGenerateCertificatesJob({
      jobId: 'job-id',
      type: 'certificate.batch',
      entityId: 'event-id',
      eventId: 'event-id',
      generate: { scope: 'ALL_ELIGIBLE', onlyAttended: false },
    });

    expect(result.generated).toBe(1);
    expect(result.missingTemplates).toEqual([
      { roleId: 'vip-role-id', roleCode: 'vip' },
    ]);
  });

  it('generates a certificate for a custom role when a normalized template exists', async () => {
    const { prisma, resolver, service } = createService();
    const vipTarget = {
      ...target,
      recipientRoleId: 'vip-role-id',
      roleCode: 'vip',
      builtInKey: null,
      assignmentId: 'vip-assignment-id',
      registrationId: null,
    };
    resolver.resolveTargets.mockResolvedValue([vipTarget]);
    prisma.certificate.findMany.mockResolvedValue([]);
    prisma.certificateTemplate.findMany.mockImplementation(({ where }) => {
      if (where.recipientRoleId === 'vip-role-id') {
        return Promise.resolve([
          {
            ...template,
            id: 'vip-template-id',
            recipientRoleId: 'vip-role-id',
            recipientRole: ParticipantRole.PARTICIPANT,
          },
        ]);
      }
      return Promise.resolve([]);
    });

    const result = await service.processGenerateCertificatesJob({
      jobId: 'job-id',
      type: 'certificate.batch',
      entityId: 'event-id',
      eventId: 'event-id',
      generate: { roleId: 'vip-role-id', onlyAttended: false },
    });

    expect(result).toMatchObject({ generated: 1, skipped: 0 });
    expect(prisma.certificate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          recipientRoleId: 'vip-role-id',
          templateId: 'vip-template-id',
          registrationId: null,
        }),
      }),
    );
  });

  it('changes the template hash when meaningful template properties change', () => {
    const { service } = createService();
    const baselineHash = service.getTemplateVersionHash(template);
    const variants = [
      { templateUrl: '/uploads/certificate-templates/other.png' },
      { namePosition: { x: 11, y: 20 } },
      { firstNamePosition: { x: 1, y: 2, width: 3, height: 4 } },
      { nameFontSize: 24 },
      { sizePreset: 'A6_PORTRAIT', widthPx: 1240, heightPx: 1748 },
      { recipientRole: ParticipantRole.SPEAKER },
    ];

    for (const patch of variants) {
      expect(
        service.getTemplateVersionHash({
          ...template,
          ...patch,
        }),
      ).not.toBe(baselineHash);
    }
  });
});
