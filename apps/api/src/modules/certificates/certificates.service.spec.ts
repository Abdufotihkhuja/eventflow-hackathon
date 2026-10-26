jest.mock('uuid', () => ({ v4: () => 'mocked-uuid' }));

import { ParticipantRole, UserType } from '@prisma/client';
import { CertificatesService } from './certificates.service';

describe('CertificatesService template defaults', () => {
  const user = {
    sub: 'org-id',
    type: UserType.ORGANIZATION,
  } as never;

  function createService() {
    const prisma: Record<string, any> = {
      event: {
        findUnique: jest.fn().mockResolvedValue({ organizationId: 'org-id' }),
      },
      certificateTemplate: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      certificate: {
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      // Запись шаблона идёт в транзакции (разжалование прежнего основного);
      // список сертификатов читает массив запросов.
      $transaction: jest.fn((arg: unknown) =>
        typeof arg === 'function'
          ? (arg as (tx: unknown) => unknown)(prisma)
          : Promise.all(arg as Promise<unknown>[]),
      ),
    };
    const uploads = {
      uploadCertificateTemplateImage: jest
        .fn()
        .mockResolvedValue({ url: '/uploads/certificate-templates/template.png' }),
    };
    const storage = { ensureDirectory: jest.fn() };
    const templateRoleResolver = {
      resolveForWrite: jest.fn().mockResolvedValue({
        recipientRoleId: 'participant-role-id',
        roleCode: 'participant',
        roleDisplayName: 'Participant',
        legacyRecipientRole: ParticipantRole.PARTICIPANT,
      }),
    };
    return {
      prisma,
      service: new CertificatesService(
        prisma as never,
        uploads as never,
        storage as never,
        {} as never,
        { getTemplateVersionHash: () => 'template-hash' } as never,
        templateRoleResolver as never,
      ),
    };
  }

  it('rejects a duplicate active default certificate template for the same role', async () => {
    const { prisma, service } = createService();
    prisma.certificateTemplate.findFirst.mockResolvedValue({
      id: 'existing-template-id',
      name: 'Existing default',
    });

    await expect(
      service.createTemplate(
        'event-id',
        {
          name: 'New default',
          recipientRole: ParticipantRole.PARTICIPANT,
          sizePreset: 'A4_LANDSCAPE',
          namePosition: JSON.stringify({ x: 10, y: 20 }),
          isDefault: 'true',
        },
        { mimetype: 'image/png' } as Express.Multer.File,
        user,
      ),
    ).rejects.toThrow(/Active default certificate template already exists/);

    expect(prisma.certificateTemplate.create).not.toHaveBeenCalled();
  });

  it('switches the default certificate template instead of rejecting the second one', async () => {
    const { prisma, service } = createService();
    prisma.certificateTemplate.findFirst.mockResolvedValue({
      id: 'template-id',
      eventId: 'event-id',
      name: 'Second template',
      recipientRole: ParticipantRole.PARTICIPANT,
      recipientRoleId: 'participant-role-id',
      sizePreset: 'A4_LANDSCAPE',
      widthPx: 3508,
      heightPx: 2480,
      templateUrl: '/uploads/certificate-templates/template.png',
      namePosition: { x: 10, y: 20 },
      isDefault: false,
      isActive: true,
    });
    prisma.certificateTemplate.update.mockResolvedValue({
      id: 'template-id',
      eventId: 'event-id',
      name: 'Second template',
      recipientRole: ParticipantRole.PARTICIPANT,
      recipientRoleId: 'participant-role-id',
      sizePreset: 'A4_LANDSCAPE',
      widthPx: 3508,
      heightPx: 2480,
      templateUrl: '/uploads/certificate-templates/template.png',
      namePosition: { x: 10, y: 20 },
      isDefault: true,
      isActive: true,
      createdAt: new Date(0),
      updatedAt: new Date(0),
    });

    await service.updateTemplate(
      'event-id',
      'template-id',
      { isDefault: 'true' },
      undefined,
      user,
    );

    // Прежний основной шаблон роли разжалован в той же транзакции.
    expect(prisma.certificateTemplate.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          eventId: 'event-id',
          isDefault: true,
          id: { not: 'template-id' },
        }),
        data: { isDefault: false },
      }),
    );
    expect(prisma.certificateTemplate.update).toHaveBeenCalled();
  });

  it('rejects inactive default certificate templates', async () => {
    const { service } = createService();

    await expect(
      service.createTemplate(
        'event-id',
        {
          name: 'Inactive default',
          sizePreset: 'A4_LANDSCAPE',
          namePosition: JSON.stringify({ x: 10, y: 20 }),
          isDefault: 'true',
          isActive: 'false',
        },
        { mimetype: 'image/png' } as Express.Multer.File,
        user,
      ),
    ).rejects.toThrow(/must be active/);
  });

  it('verifies a certificate by code without requiring it to be current', async () => {
    const { prisma, service } = createService();
    prisma.certificate.findFirst.mockResolvedValue({
      id: 'old-certificate-id',
      eventName: 'Event',
      recipientName: 'Ada Lovelace',
      generatedAt: new Date('2026-01-01T00:00:00Z'),
      eventDate: new Date('2026-01-01T00:00:00Z'),
      isCurrent: false,
    });

    await expect(
      service.verifyCertificate({ code: 'old-code' }),
    ).resolves.toMatchObject({
      valid: true,
      certificate: {
        id: 'old-certificate-id',
        recipientName: 'Ada Lovelace',
      },
    });

    expect(prisma.certificate.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { verificationCode: 'old-code' },
      }),
    );
  });

  it('never exposes recipient email on public verify and does not select it (Stage 2 / F3)', async () => {
    const { prisma, service } = createService();
    prisma.certificate.findFirst.mockResolvedValue({
      id: 'cert-id',
      eventName: 'Event',
      recipientName: 'Ada Lovelace',
      generatedAt: new Date('2026-01-01T00:00:00Z'),
      eventDate: new Date('2026-01-01T00:00:00Z'),
      recipientRole: { displayName: 'Speaker' },
      event: {
        venue: 'Technopark',
        city: 'Tashkent',
        organization: { companyName: 'Org LLC', logoUrl: null },
      },
    });

    const result = await service.verifyCertificate({ code: 'pii-code' });

    // PII must not be in the response payload...
    expect(result.certificate).not.toHaveProperty('recipientEmail');
    // ...and must not even be read from the database.
    expect(prisma.certificate.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.not.objectContaining({ recipientEmail: true }),
      }),
    );
    // Non-PII verification facts are still returned.
    expect(result.certificate).toMatchObject({
      recipientName: 'Ada Lovelace',
      recipientRole: 'Speaker',
      eventLocation: 'Technopark, Tashkent',
    });
  });

  it('marks an issued certificate stale when the recipient was renamed', async () => {
    const { prisma, service } = createService();
    const issued = (recipientName: string, eventRecipient: unknown) => ({
      id: 'certificate-id',
      registrationId: 'registration-id',
      templateId: 'template-id',
      certificateUrl: '/uploads/certificates/cert.pdf',
      templateVersionHash: 'template-hash',
      generationStatus: 'READY',
      generatedAt: new Date('2026-01-01T00:00:00Z'),
      downloadCount: 0,
      recipientName,
      recipientEmail: 'ada@test.dev',
      eventName: 'Event',
      eventDate: null,
      registration: { eventId: 'event-id', role: ParticipantRole.PARTICIPANT },
      recipientRole: { code: 'participant' },
      eventRecipient,
      template: { sizePreset: 'A4_LANDSCAPE' },
    });
    const recipient = {
      firstName: 'Ada',
      lastName: 'Lovelace',
      displayName: 'Ada Lovelace',
      email: 'ada@test.dev',
    };
    prisma.certificate.findMany
      .mockResolvedValueOnce([issued('Ada Byron', recipient)])
      .mockResolvedValueOnce([issued('Ada Lovelace', recipient)]);
    prisma.certificate.count.mockResolvedValue(1);

    const renamed = await service.findCertificatesByEvent('event-id', {}, user);
    expect(renamed.certificates[0].isStale).toBe(true);

    const current = await service.findCertificatesByEvent('event-id', {}, user);
    expect(current.certificates[0].isStale).toBe(false);
  });
});
