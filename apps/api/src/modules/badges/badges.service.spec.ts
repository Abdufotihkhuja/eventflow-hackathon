jest.mock('uuid', () => ({ v4: () => 'mocked-uuid' }));
jest.mock('qrcode', () => ({
  toBuffer: jest.fn(() =>
    Promise.resolve(
      Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
        'base64',
      ),
    ),
  ),
}));

import { BadRequestException } from '@nestjs/common';
import { ParticipantRole, RegistrationStatus, UserType } from '@prisma/client';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import PDFDocument from 'pdfkit';
import * as QRCode from 'qrcode';
import { BadgesService } from './badges.service';
import {
  artifactRecipientIdentityHash,
  badgeTemplateVersionHash,
} from '../shared/artifact-identity';

describe('BadgesService safety checks', () => {
  const user = {
    sub: 'org-id',
    type: UserType.ORGANIZATION,
  } as never;

  // Снимаем шпионы с PDFDocument.prototype, чтобы они не протекали между тестами.
  afterEach(() => {
    jest.restoreAllMocks();
  });

  function recipientTarget(
    overrides: Partial<{
      recipientId: string;
      recipientRoleId: string;
      roleCode: string;
      registrationId: string | null;
    }> = {},
  ) {
    return {
      recipientId: 'recipient-id',
      recipientRoleId: 'role-id',
      roleCode: 'participant',
      roleDisplayName: 'Participant',
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
      ...overrides,
    };
  }

  function createService() {
    const prisma: Record<string, any> = {
      event: {
        findUnique: jest.fn().mockResolvedValue({ organizationId: 'org-id' }),
      },
      badgeTemplate: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      registration: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      // Запись шаблона идёт в транзакции (разжалование прежнего основного).
      $transaction: jest.fn((fn: (tx: unknown) => unknown) => fn(prisma)),
    };
    const uploads = {
      uploadBadgeTemplateImage: jest
        .fn()
        .mockResolvedValue({ url: '/uploads/badge-templates/template.png' }),
      getTemplateFilePath: jest.fn().mockReturnValue('/tmp/template.png'),
      deleteTemplateFileByUrl: jest.fn(),
    };
    const resolver = {
      resolveTargets: jest.fn().mockResolvedValue([recipientTarget()]),
      classifyRegistrationEligibility: jest.fn().mockResolvedValue({
        approved: new Set<string>(),
        attended: new Set<string>(),
      }),
    };
    const templateRoleResolver = {
      resolveForWrite: jest.fn().mockResolvedValue({
        recipientRoleId: 'role-id',
        roleCode: 'participant',
        roleDisplayName: 'Participant',
        legacyRecipientRole: ParticipantRole.PARTICIPANT,
      }),
    };
    const config = {
      get: jest.fn().mockReturnValue('https://app.eventflow.test'),
    };
    const ticketQr = {
      encodeQrPayload: jest.fn().mockReturnValue('v2.signed.payload'),
    };
    return {
      prisma,
      uploads,
      resolver,
      config,
      ticketQr,
      service: new BadgesService(
        prisma as never,
        uploads as never,
        resolver as never,
        templateRoleResolver as never,
        config as never,
        ticketQr as never,
        {
          consume: jest.fn().mockResolvedValue({ allowed: true, deduped: false }),
        } as never, // QuotaService (E-6)
        { exists: jest.fn().mockReturnValue(false) } as never, // FileStorageService
        { createJobId: jest.fn().mockReturnValue('job-id') } as never, // QueueService
        {
          start: jest.fn(),
          advance: jest.fn(),
          read: jest.fn(),
          clear: jest.fn(),
        } as never, // BadgeZipProgressService
      ),
    };
  }

  function createTemplateImage(): { path: string; cleanup: () => void } {
    const dir = mkdtempSync(join(tmpdir(), 'eventflow-badge-test-'));
    const path = join(dir, 'template.png');
    writeFileSync(
      path,
      Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
        'base64',
      ),
    );
    return {
      path,
      cleanup: () => rmSync(dir, { recursive: true, force: true }),
    };
  }

  function badgeTemplate() {
    return {
      id: 'template-id',
      eventId: 'event-id',
      name: 'Default',
      recipientRole: ParticipantRole.PARTICIPANT,
      sizePreset: 'BADGE_85X55',
      widthPx: 1004,
      heightPx: 650,
      templateUrl: '/uploads/badge-templates/template.png',
      thumbnailUrl: null,
      namePosition: null,
      nameFont: null,
      nameFontSize: null,
      nameColor: null,
      firstNamePosition: null,
      lastNamePosition: null,
      rolePosition: null,
      eventNamePosition: null,
      qrPosition: null,
      isDefault: true,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      recipientRoleId: 'role-id',
      roleCode: 'participant',
      roleDisplayName: 'Participant',
    };
  }

  it('rejects a duplicate active default template for the same event and role', async () => {
    const { prisma, service } = createService();
    prisma.badgeTemplate.findFirst.mockResolvedValue({
      id: 'existing-template-id',
      name: 'Existing default',
    });

    await expect(
      service.createTemplate(
        'event-id',
        {
          name: 'New default',
          recipientRole: ParticipantRole.PARTICIPANT,
          sizePreset: 'BADGE_85X55',
          isDefault: 'true',
        },
        { mimetype: 'image/png' } as Express.Multer.File,
        user,
      ),
    ).rejects.toThrow(/Active default badge template already exists/);

    expect(prisma.badgeTemplate.create).not.toHaveBeenCalled();
  });

  it('does not allow an inactive template to be default', async () => {
    const { service } = createService();

    await expect(
      service.createTemplate(
        'event-id',
        {
          name: 'Inactive default',
          sizePreset: 'BADGE_85X55',
          isDefault: 'true',
          isActive: 'false',
        },
        { mimetype: 'image/png' } as Express.Multer.File,
        user,
      ),
    ).rejects.toThrow(/must be active/);
  });

  it('rejects selected recipient IDs that do not match role/status filters', async () => {
    const { resolver, service } = createService();
    resolver.resolveTargets.mockRejectedValue(
      new BadRequestException(
        'Selected registrations do not match the requested recipient role filters: wrong-role-id',
      ),
    );

    await expect(
      service.renderBadgesZip(
        'event-id',
        {
          recipientRole: ParticipantRole.SPEAKER,
          registrationIds: ['valid-id', 'wrong-role-id'],
        },
      ),
    ).rejects.toThrow(/wrong-role-id/);

    // Статус проверяется отдельно после резолва (см. тест ниже), поэтому сам
    // резолвер зовётся без него — но несовпадение роли по-прежнему ошибка.
    expect(resolver.resolveTargets).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: 'event-id',
        registrationIds: ['valid-id', 'wrong-role-id'],
        recipientRole: ParticipantRole.SPEAKER,
        requireApprovedRegistration: false,
      }),
    );
  });

  it('пропускает неподтверждённые регистрации в ручной выборке вместо ошибки', async () => {
    const { prisma, resolver, service } = createService();
    resolver.resolveTargets.mockResolvedValue([
      recipientTarget({
        recipientId: 'approved-recipient',
        registrationId: 'approved-registration',
      }),
      recipientTarget({
        recipientId: 'pending-recipient',
        registrationId: 'pending-registration',
      }),
    ]);
    resolver.classifyRegistrationEligibility.mockResolvedValue({
      approved: new Set(['approved-registration']),
      attended: new Set<string>(),
    });
    prisma.event.findUnique
      .mockResolvedValueOnce({ organizationId: 'org-id' })
      .mockResolvedValueOnce({ title: 'Event title' });
    prisma.badgeTemplate.findMany.mockResolvedValue([badgeTemplate()]);
    const buildBadgePdf = jest
      .spyOn(service as never, 'buildBadgePdf')
      .mockResolvedValue(Buffer.from('pdf') as never);
    jest
      .spyOn(service as never, 'createZipArchive')
      .mockResolvedValue(Buffer.from('zip') as never);

    await service.renderBadgesZip('event-id', {
      recipientIds: ['approved-recipient', 'pending-recipient'],
      onlyApproved: true,
    });

    expect(buildBadgePdf).toHaveBeenCalledTimes(1);
    expect(buildBadgePdf).toHaveBeenCalledWith(
      expect.anything(),
      '/tmp/template.png',
      expect.objectContaining({ firstName: 'Ada' }),
    );
  });

  it('берёт единственный активный шаблон роли, если основной не отмечен', async () => {
    const { prisma, resolver, service } = createService();
    resolver.resolveTargets.mockResolvedValue([
      recipientTarget({
        recipientId: 'staff-recipient',
        recipientRoleId: 'staff-role-id',
        roleCode: 'staff',
        registrationId: null,
      }),
    ]);
    prisma.event.findUnique
      .mockResolvedValueOnce({ organizationId: 'org-id' })
      .mockResolvedValueOnce({ title: 'Event title' });
    prisma.badgeTemplate.findMany.mockImplementation(
      ({ where }: { where: { isDefault?: boolean } }) =>
        Promise.resolve(
          // Основного нет — есть ровно один активный шаблон этой роли.
          where.isDefault === true
            ? []
            : [{ ...badgeTemplate(), isDefault: false, recipientRoleId: 'staff-role-id' }],
        ),
    );
    const buildBadgePdf = jest
      .spyOn(service as never, 'buildBadgePdf')
      .mockResolvedValue(Buffer.from('pdf') as never);
    jest
      .spyOn(service as never, 'createZipArchive')
      .mockResolvedValue(Buffer.from('zip') as never);

    await service.renderBadgesZip('event-id', { scope: 'ALL_ELIGIBLE' });

    expect(buildBadgePdf).toHaveBeenCalledTimes(1);
    expect(buildBadgePdf).toHaveBeenCalledWith(
      expect.anything(),
      '/tmp/template.png',
      expect.objectContaining({ roleCode: 'staff' }),
    );
  });

  it('пропускает роли без шаблона, но выгружает остальные', async () => {
    const { prisma, resolver, service } = createService();
    resolver.resolveTargets.mockResolvedValue([
      recipientTarget({ recipientId: 'participant-recipient' }),
      recipientTarget({
        recipientId: 'staff-recipient',
        recipientRoleId: 'staff-role-id',
        roleCode: 'staff',
        registrationId: null,
      }),
    ]);
    prisma.event.findUnique
      .mockResolvedValueOnce({ organizationId: 'org-id' })
      .mockResolvedValueOnce({ title: 'Event title' });
    // Шаблон по умолчанию есть только у роли participant.
    prisma.badgeTemplate.findMany.mockImplementation(
      ({ where }: { where: { recipientRoleId?: string | null } }) =>
        Promise.resolve(
          where.recipientRoleId === 'role-id' ? [badgeTemplate()] : [],
        ),
    );
    const buildBadgePdf = jest
      .spyOn(service as never, 'buildBadgePdf')
      .mockResolvedValue(Buffer.from('pdf') as never);
    jest
      .spyOn(service as never, 'createZipArchive')
      .mockResolvedValue(Buffer.from('zip') as never);

    await service.renderBadgesZip('event-id', { scope: 'ALL_ELIGIBLE' });

    expect(buildBadgePdf).toHaveBeenCalledTimes(1);
    expect(buildBadgePdf).toHaveBeenCalledWith(
      expect.anything(),
      '/tmp/template.png',
      expect.objectContaining({ roleCode: 'participant' }),
    );
  });

  it('returns a clear error when no active default template exists', async () => {
    const { prisma, service } = createService();
    prisma.badgeTemplate.findMany.mockResolvedValue([]);

    await expect(
      service.renderBadgesZip(
        'event-id',
        { recipientRole: ParticipantRole.PARTICIPANT },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('uses signed v2 payload check-in URL for participant badge QR', async () => {
    const { prisma, service, ticketQr } = createService();
    prisma.registration.findMany.mockResolvedValue([
      {
        id: 'registration-id',
        qrCode: 'registration-qr-code',
        qrPayloadVersion: 3,
        status: RegistrationStatus.APPROVED,
      },
    ]);
    prisma.event.findUnique
      .mockResolvedValueOnce({ organizationId: 'org-id' })
      .mockResolvedValueOnce({ title: 'Event title' });
    prisma.badgeTemplate.findMany.mockResolvedValue([badgeTemplate()]);
    const buildBadgePdf = jest
      .spyOn(service as never, 'buildBadgePdf')
      .mockResolvedValue(Buffer.from('pdf') as never);
    jest
      .spyOn(service as never, 'createZipArchive')
      .mockResolvedValue(Buffer.from('zip') as never);

    await service.renderBadgesZip(
      'event-id',
      { recipientRole: ParticipantRole.PARTICIPANT },
    );

    expect(prisma.registration.findMany).toHaveBeenCalledWith({
      where: {
        eventId: 'event-id',
        id: { in: ['registration-id'] },
        status: RegistrationStatus.APPROVED,
        qrCode: { not: null },
      },
      select: { id: true, qrCode: true, qrPayloadVersion: true },
    });
    expect(ticketQr.encodeQrPayload).toHaveBeenCalledWith({
      id: 'registration-id',
      qrCode: 'registration-qr-code',
      qrPayloadVersion: 3,
    });
    expect(buildBadgePdf).toHaveBeenCalledWith(
      expect.anything(),
      '/tmp/template.png',
      expect.objectContaining({
        qrCode: `https://app.eventflow.test/check-in?code=${encodeURIComponent('v2.signed.payload')}`,
      }),
    );
  });

  it('does not render a badge QR for targets without registration', async () => {
    const { prisma, resolver, service } = createService();
    resolver.resolveTargets.mockResolvedValue([
      {
        recipientId: 'recipient-id',
        recipientRoleId: 'role-id',
        roleCode: 'speaker',
        builtInKey: 'SPEAKER',
        assignmentId: 'assignment-id',
        displayName: 'Speaker One',
        firstName: 'Speaker',
        lastName: 'One',
        email: 'speaker@test.dev',
        userId: null,
        registrationId: null,
        speakerId: 'speaker-id',
        sourceTypes: ['SPEAKER'],
        qrPayload: 'speaker-id',
      },
    ]);
    prisma.event.findUnique
      .mockResolvedValueOnce({ organizationId: 'org-id' })
      .mockResolvedValueOnce({ title: 'Event title' });
    prisma.badgeTemplate.findMany.mockResolvedValue([{
      ...badgeTemplate(),
      recipientRole: ParticipantRole.SPEAKER,
      recipientRoleId: 'role-id',
      roleCode: 'speaker',
      roleDisplayName: 'Speaker',
    }]);
    const buildBadgePdf = jest
      .spyOn(service as never, 'buildBadgePdf')
      .mockResolvedValue(Buffer.from('pdf') as never);
    jest
      .spyOn(service as never, 'createZipArchive')
      .mockResolvedValue(Buffer.from('zip') as never);

    await service.renderBadgesZip(
      'event-id',
      { recipientRole: ParticipantRole.SPEAKER },
    );

    expect(prisma.registration.findMany).not.toHaveBeenCalled();
    expect(buildBadgePdf).toHaveBeenCalledWith(
      expect.anything(),
      '/tmp/template.png',
      expect.objectContaining({ qrCode: null }),
    );
  });

  it('does not render a badge QR when registration has no approved qrCode', async () => {
    const { prisma, service } = createService();
    prisma.registration.findMany.mockResolvedValue([]);
    prisma.event.findUnique
      .mockResolvedValueOnce({ organizationId: 'org-id' })
      .mockResolvedValueOnce({ title: 'Event title' });
    prisma.badgeTemplate.findMany.mockResolvedValue([badgeTemplate()]);
    const buildBadgePdf = jest
      .spyOn(service as never, 'buildBadgePdf')
      .mockResolvedValue(Buffer.from('pdf') as never);
    jest
      .spyOn(service as never, 'createZipArchive')
      .mockResolvedValue(Buffer.from('zip') as never);

    await service.renderBadgesZip(
      'event-id',
      { recipientRole: ParticipantRole.PARTICIPANT },
    );

    expect(buildBadgePdf).toHaveBeenCalledWith(
      expect.anything(),
      '/tmp/template.png',
      expect.objectContaining({ qrCode: null }),
    );
  });

  it('builds separate badge PDFs for participant and speaker targets on the same recipient', async () => {
    const { prisma, resolver, service } = createService();
    resolver.resolveTargets.mockResolvedValue([
      {
        recipientId: 'recipient-id',
        recipientRoleId: 'participant-role-id',
        roleCode: 'participant',
        builtInKey: 'PARTICIPANT',
        assignmentId: 'participant-assignment-id',
        displayName: 'Ada Lovelace',
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@test.dev',
        userId: 'user-id',
        registrationId: 'registration-id',
        speakerId: null,
        sourceTypes: ['REGISTRATION'],
        qrPayload: 'registration-id',
      },
      {
        recipientId: 'recipient-id',
        recipientRoleId: 'speaker-role-id',
        roleCode: 'speaker',
        builtInKey: 'SPEAKER',
        assignmentId: 'speaker-assignment-id',
        displayName: 'Ada Lovelace',
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@test.dev',
        userId: 'user-id',
        registrationId: 'registration-id',
        speakerId: 'speaker-id',
        sourceTypes: ['REGISTRATION', 'SPEAKER'],
        qrPayload: 'registration-id',
      },
    ]);
    prisma.event.findUnique
      .mockResolvedValueOnce({ organizationId: 'org-id' })
      .mockResolvedValueOnce({ title: 'Event title' });
    prisma.badgeTemplate.findMany.mockImplementation(({ where }) => {
      if (where.recipientRoleId === 'speaker-role-id') {
        return Promise.resolve([
          {
            ...badgeTemplate(),
            id: 'speaker-template-id',
            recipientRole: ParticipantRole.SPEAKER,
            recipientRoleId: 'speaker-role-id',
            roleCode: 'speaker',
            roleDisplayName: 'Speaker',
          },
        ]);
      }
      return Promise.resolve([
        {
          ...badgeTemplate(),
          recipientRoleId: 'participant-role-id',
        },
      ]);
    });
    const buildBadgePdf = jest
      .spyOn(service as never, 'buildBadgePdf')
      .mockResolvedValue(Buffer.from('pdf') as never);
    jest
      .spyOn(service as never, 'createZipArchive')
      .mockResolvedValue(Buffer.from('zip') as never);

    await service.renderBadgesZip(
      'event-id',
      { scope: 'ALL_ELIGIBLE' },
    );

    expect(buildBadgePdf).toHaveBeenCalledTimes(2);
    expect(buildBadgePdf).toHaveBeenCalledWith(
      expect.objectContaining({ recipientRole: ParticipantRole.PARTICIPANT }),
      '/tmp/template.png',
      expect.objectContaining({ roleCode: 'participant' }),
    );
    expect(buildBadgePdf).toHaveBeenCalledWith(
      expect.objectContaining({ recipientRole: ParticipantRole.SPEAKER }),
      '/tmp/template.png',
      expect.objectContaining({ roleCode: 'speaker' }),
    );
  });

  it('uses normalized badge templates for custom roles', async () => {
    const { prisma, resolver, service } = createService();
    resolver.resolveTargets.mockResolvedValue([
      {
        recipientId: 'recipient-id',
        recipientRoleId: 'vip-role-id',
        roleCode: 'vip',
        builtInKey: null,
        assignmentId: 'vip-assignment-id',
        displayName: 'VIP Guest',
        firstName: 'VIP',
        lastName: 'Guest',
        email: 'vip@test.dev',
        userId: null,
        registrationId: null,
        speakerId: null,
        sourceTypes: [],
        qrPayload: 'recipient-id:vip-role-id',
      },
    ]);
    prisma.event.findUnique
      .mockResolvedValueOnce({ organizationId: 'org-id' })
      .mockResolvedValueOnce({ title: 'Event title' });
    prisma.badgeTemplate.findMany.mockImplementation(({ where }) => {
      if (where.recipientRoleId === 'vip-role-id') {
        return Promise.resolve([
          {
            ...badgeTemplate(),
            id: 'vip-template-id',
            recipientRoleId: 'vip-role-id',
            recipientRole: ParticipantRole.PARTICIPANT,
            roleCode: 'vip',
            roleDisplayName: 'VIP',
          },
        ]);
      }
      return Promise.resolve([]);
    });
    const buildBadgePdf = jest
      .spyOn(service as never, 'buildBadgePdf')
      .mockResolvedValue(Buffer.from('pdf') as never);
    jest
      .spyOn(service as never, 'createZipArchive')
      .mockResolvedValue(Buffer.from('zip') as never);

    await service.renderBadgesZip(
      'event-id',
      { roleId: 'vip-role-id' },
    );

    expect(buildBadgePdf).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'vip-template-id' }),
      '/tmp/template.png',
      expect.objectContaining({ roleCode: 'vip' }),
    );
  });

  it('passes provided badge QR payload to QRCode rendering', async () => {
    const { service } = createService();
    const image = createTemplateImage();
    const toBufferMock = jest.mocked(QRCode.toBuffer);
    toBufferMock.mockClear();

    try {
      await (service as never)['buildBadgePdf'](badgeTemplate(), image.path, {
        fullName: 'Ada Lovelace',
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@test.dev',
        eventTitle: 'Event title',
        roleCode: 'participant',
        qrCode: 'https://app.eventflow.test/check-in?code=registration-qr-code',
      });
    } finally {
      image.cleanup();
    }

    expect(toBufferMock).toHaveBeenCalledWith(
      'https://app.eventflow.test/check-in?code=registration-qr-code',
      expect.objectContaining({ margin: 0 }),
    );
  });

  it('skips QRCode rendering when badge QR payload is null', async () => {
    const { service } = createService();
    const image = createTemplateImage();
    const toBufferMock = jest.mocked(QRCode.toBuffer);
    toBufferMock.mockClear();

    try {
      await (service as never)['buildBadgePdf'](badgeTemplate(), image.path, {
        fullName: 'Speaker One',
        firstName: 'Speaker',
        lastName: 'One',
        email: 'speaker@test.dev',
        eventTitle: 'Event title',
        roleCode: 'speaker',
        qrCode: null,
      });
    } finally {
      image.cleanup();
    }

    expect(toBufferMock).not.toHaveBeenCalled();
  });

  it('renders the badge QR square (sized by the smaller side of a non-square area)', async () => {
    const { service } = createService();
    const image = createTemplateImage();
    const toBufferMock = jest.mocked(QRCode.toBuffer);

    const renderedWidths: number[] = [];
    try {
      // Two areas with the SAME smaller side (height 10%) but different larger
      // side (width 30% vs 50%). A square QR must be sized by the smaller side,
      // so widening the box must NOT change the rendered QR size.
      for (const width of [30, 50]) {
        toBufferMock.mockClear();
        await (service as never)['buildBadgePdf'](
          {
            ...badgeTemplate(),
            qrPosition: { x: 40, y: 40, width, height: 10 },
          },
          image.path,
          {
            fullName: 'Ada Lovelace',
            firstName: 'Ada',
            lastName: 'Lovelace',
            email: 'ada@test.dev',
            eventTitle: 'Event title',
            roleCode: 'participant',
            qrCode: 'https://app.eventflow.test/check-in?code=x',
          },
        );
        const opts = toBufferMock.mock.calls[0]?.[1] as { width: number };
        renderedWidths.push(opts.width);
      }
    } finally {
      image.cleanup();
    }

    expect(renderedWidths[0]).toBeGreaterThan(0);
    // Driven by the smaller side → identical regardless of the box width.
    expect(renderedWidths[0]).toBe(renderedWidths[1]);
  });

  it('applies template name typography: chosen font, unclamped size, color and align', async () => {
    const { service } = createService();
    const image = createTemplateImage();
    const registerFontSpy = jest.spyOn(PDFDocument.prototype, 'registerFont');
    const fontSpy = jest.spyOn(PDFDocument.prototype, 'font');
    const fontSizeSpy = jest.spyOn(PDFDocument.prototype, 'fontSize');
    const fillColorSpy = jest.spyOn(PDFDocument.prototype, 'fillColor');
    const textSpy = jest.spyOn(PDFDocument.prototype, 'text');

    try {
      await (service as never)['buildBadgePdf'](
        {
          ...badgeTemplate(),
          nameFont: 'roboto-bold',
          nameFontSize: 24,
          nameColor: '#ff0000',
          firstNamePosition: { x: 8, y: 38, width: 58, height: 10, align: 'center' },
          lastNamePosition: { x: 8, y: 50, width: 58, height: 10, align: 'center' },
        },
        image.path,
        {
          fullName: 'Ада Лавлейс',
          firstName: 'Ада',
          lastName: 'Лавлейс',
          email: 'ada@test.dev',
          eventTitle: 'Event title',
          roleCode: 'participant',
          roleDisplayName: 'Participant',
          qrCode: null,
        },
      );
    } finally {
      image.cleanup();
    }

    expect(registerFontSpy).toHaveBeenCalledWith(
      'BadgeNameFont',
      expect.stringContaining('roboto-all-700.woff'),
    );
    // Роль/название события — то же семейство, но regular 400.
    expect(registerFontSpy).toHaveBeenCalledWith(
      'BadgeTextFont',
      expect.stringContaining('roboto-all-400.woff'),
    );
    expect(fontSpy).toHaveBeenCalledWith('BadgeNameFont');
    expect(fontSpy).toHaveBeenCalledWith('BadgeTextFont');
    // Выбранный организатором размер применяется как есть (без clamp:
    // clamp срезал бы 24 до page.height * 0.11 ≈ 17.15 на BADGE_85X55).
    expect(fontSizeSpy).toHaveBeenCalledWith(24);
    expect(fillColorSpy).toHaveBeenCalledWith('#ff0000');
    expect(textSpy).toHaveBeenCalledWith(
      'Ада',
      expect.any(Number),
      expect.any(Number),
      expect.objectContaining({ align: 'center' }),
    );
    // Роль и название события выравнивание имени не наследуют.
    expect(textSpy).toHaveBeenCalledWith(
      'Participant',
      expect.any(Number),
      expect.any(Number),
      expect.not.objectContaining({ align: expect.anything() }),
    );
  });

  it('falls back to Inter regular, #111827 and clamped default size when typography is null', async () => {
    const { service } = createService();
    const image = createTemplateImage();
    const registerFontSpy = jest.spyOn(PDFDocument.prototype, 'registerFont');
    const fontSizeSpy = jest.spyOn(PDFDocument.prototype, 'fontSize');
    const fillColorSpy = jest.spyOn(PDFDocument.prototype, 'fillColor');
    const textSpy = jest.spyOn(PDFDocument.prototype, 'text');

    try {
      await (service as never)['buildBadgePdf'](badgeTemplate(), image.path, {
        fullName: 'Ада Лавлейс',
        firstName: 'Ада',
        lastName: 'Лавлейс',
        email: 'ada@test.dev',
        eventTitle: 'Event title',
        roleCode: 'participant',
        roleDisplayName: 'Participant',
        qrCode: null,
      });
    } finally {
      image.cleanup();
    }

    expect(registerFontSpy).toHaveBeenCalledWith(
      'BadgeNameFont',
      expect.stringContaining('inter-all-400.woff'),
    );
    expect(fillColorSpy).toHaveBeenCalledWith('#111827');
    // Прежний дефолт: fullName 18pt с clamp по высоте страницы.
    const pageHeightPt = (55 / 25.4) * 72;
    expect(fontSizeSpy).toHaveBeenCalledWith(
      Math.max(6, Math.min(18, pageHeightPt * 0.11)),
    );
    expect(textSpy).toHaveBeenCalledWith(
      'Ада Лавлейс',
      expect.any(Number),
      expect.any(Number),
      expect.objectContaining({ align: 'left' }),
    );
  });

  it('prints the role displayName for custom roles and template overrides for role/event texts', async () => {
    const { service } = createService();
    const image = createTemplateImage();
    const fontSizeSpy = jest.spyOn(PDFDocument.prototype, 'fontSize');
    const fillColorSpy = jest.spyOn(PDFDocument.prototype, 'fillColor');
    const textSpy = jest.spyOn(PDFDocument.prototype, 'text');
    const data = {
      fullName: 'Ада Лавлейс',
      firstName: 'Ада',
      lastName: 'Лавлейс',
      email: 'ada@test.dev',
      eventTitle: 'Event title',
      roleCode: 'press-team',
      roleDisplayName: 'Пресса',
      qrCode: null,
    };

    try {
      // Без переопределений: кастомная роль печатается по displayName, а не
      // title-case от кода; кегль/цвет прежние.
      await (service as never)['buildBadgePdf'](
        { ...badgeTemplate(), recipientRole: null, roleCode: 'press-team' },
        image.path,
        data,
      );
      expect(textSpy).toHaveBeenCalledWith(
        'Пресса',
        expect.any(Number),
        expect.any(Number),
        expect.anything(),
      );
      expect(fillColorSpy).toHaveBeenCalledWith('#4b5563');
      expect(fillColorSpy).toHaveBeenCalledWith('#374151');

      textSpy.mockClear();
      fontSizeSpy.mockClear();
      fillColorSpy.mockClear();

      await (service as never)['buildBadgePdf'](
        {
          ...badgeTemplate(),
          roleLabel: 'Участник хакатона',
          roleFontSize: 24,
          roleColor: '#123456',
          eventLabel: 'National AI Hackathon - Наманган',
          eventFontSize: 18,
          eventColor: '#654321',
        },
        image.path,
        data,
      );
    } finally {
      image.cleanup();
    }

    expect(textSpy).toHaveBeenCalledWith(
      'Участник хакатона',
      expect.any(Number),
      expect.any(Number),
      expect.anything(),
    );
    expect(textSpy).toHaveBeenCalledWith(
      'National AI Hackathon - Наманган',
      expect.any(Number),
      expect.any(Number),
      expect.anything(),
    );
    expect(textSpy).not.toHaveBeenCalledWith(
      'Event title',
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );
    // Явный кегль применяется без clamp по высоте страницы.
    expect(fontSizeSpy).toHaveBeenCalledWith(24);
    expect(fontSizeSpy).toHaveBeenCalledWith(18);
    expect(fillColorSpy).toHaveBeenCalledWith('#123456');
    expect(fillColorSpy).toHaveBeenCalledWith('#654321');
  });

  it('validates and normalizes role/event text fields from the multipart body', () => {
    const { service } = createService();
    const parse = (body: Record<string, string | undefined>) =>
      (service as never)['parseSecondaryTextFields'](body);

    // Отсутствующие поля не трогают значение, пустые сбрасывают в null.
    expect(parse({})).toEqual({
      roleLabel: undefined,
      roleFontSize: undefined,
      roleColor: undefined,
      eventLabel: undefined,
      eventFontSize: undefined,
      eventColor: undefined,
    });
    expect(
      parse({
        roleLabel: '  Speaker  ',
        roleFontSize: '24',
        roleColor: '#ABCDEF',
        eventLabel: '',
        eventFontSize: '',
        eventColor: '',
      }),
    ).toEqual({
      roleLabel: 'Speaker',
      roleFontSize: 24,
      roleColor: '#ABCDEF',
      eventLabel: null,
      eventFontSize: null,
      eventColor: null,
    });
    expect(() => parse({ roleFontSize: '0' })).toThrow(BadRequestException);
    expect(() => parse({ eventFontSize: 'abc' })).toThrow(BadRequestException);
    expect(() => parse({ roleColor: 'red' })).toThrow(BadRequestException);
    expect(() => parse({ eventLabel: 'x'.repeat(121) })).toThrow(
      BadRequestException,
    );
  });

  it('switches the default badge template instead of rejecting the second one', async () => {
    const { prisma, service } = createService();
    prisma.badgeTemplate.findFirst
      .mockResolvedValueOnce({
        id: 'template-id',
        eventId: 'event-id',
        name: 'Second template',
        recipientRole: ParticipantRole.PARTICIPANT,
        sizePreset: 'BADGE_85X55',
        widthPx: 1004,
        heightPx: 650,
        templateUrl: '/uploads/badge-templates/template.png',
        namePosition: null,
        firstNamePosition: null,
        lastNamePosition: null,
        rolePosition: null,
        eventNamePosition: null,
        qrPosition: null,
        isDefault: false,
        isActive: true,
      })
      .mockResolvedValueOnce(null);
    prisma.badgeTemplate.update.mockResolvedValue({
      id: 'template-id',
      eventId: 'event-id',
      name: 'Second template',
      recipientRole: ParticipantRole.PARTICIPANT,
      recipientRoleId: 'role-id',
      sizePreset: 'BADGE_85X55',
      widthPx: 1004,
      heightPx: 650,
      templateUrl: '/uploads/badge-templates/template.png',
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
    expect(prisma.badgeTemplate.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          eventId: 'event-id',
          isDefault: true,
          id: { not: 'template-id' },
        }),
        data: { isDefault: false },
      }),
    );
    expect(prisma.badgeTemplate.update).toHaveBeenCalled();
  });

  it('maps race-time unique index errors on update to a clear duplicate default error', async () => {
    const { prisma, service } = createService();
    prisma.badgeTemplate.findFirst
      .mockResolvedValueOnce({
        id: 'template-id',
        eventId: 'event-id',
        name: 'Existing',
        recipientRole: ParticipantRole.PARTICIPANT,
        sizePreset: 'BADGE_85X55',
        widthPx: 1004,
        heightPx: 650,
        templateUrl: '/uploads/badge-templates/template.png',
        namePosition: null,
        firstNamePosition: null,
        lastNamePosition: null,
        rolePosition: null,
        eventNamePosition: null,
        qrPosition: null,
        isDefault: false,
        isActive: true,
      })
      .mockResolvedValueOnce(null);
    prisma.badgeTemplate.update.mockRejectedValue({ code: 'P2002' });

    await expect(
      service.updateTemplate(
        'event-id',
        'template-id',
        { isDefault: 'true' },
        undefined,
        user,
      ),
    ).rejects.toThrow(/Active default badge template already exists/);
  });

  it('ключ архива учитывает версию шаблона и ФИО получателя', async () => {
    const { service } = createService();
    const queue = (service as never)['queueService'] as {
      createJobId: jest.Mock;
    };
    const template = badgeTemplate();
    const buildZipJobId = (service as never)['buildZipJobId'] as (
      ...args: unknown[]
    ) => string;

    buildZipJobId.call(
      service,
      'event-id',
      { onlyApproved: true },
      [recipientTarget()],
      new Map([['role-id', template]]),
    );
    const parts = queue.createJobId.mock.calls[0][0] as string[];
    expect(parts).toContain(
      `role-id=${template.id}:${badgeTemplateVersionHash(template)}`,
    );
    expect(parts).toContain(artifactRecipientIdentityHash(recipientTarget()));

    // Правка шаблона и переименование получателя дают другие части ключа.
    expect(
      badgeTemplateVersionHash({ ...template, nameFontSize: 24 }),
    ).not.toBe(badgeTemplateVersionHash(template));
    expect(
      artifactRecipientIdentityHash({
        ...recipientTarget(),
        lastName: 'Byron',
      }),
    ).not.toBe(artifactRecipientIdentityHash(recipientTarget()));
  });
});
