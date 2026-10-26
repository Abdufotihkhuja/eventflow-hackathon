import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, RegistrationStatus, UserType } from '@prisma/client';
import { AttendanceService } from './attendance.service';
import {
  TicketQrService,
  type QrVerifyResult,
} from '../tickets/application/ticket-qr.service';
import { EventCheckpointsRepository } from '../events/checkpoints/event-checkpoints.repository';
import { EventCheckpointsService } from '../events/checkpoints/event-checkpoints.service';

const ORG_ID = 'org-1';
const REG_ID = '11111111-1111-4111-8111-111111111111';
const CHECKPOINT_ID = '33333333-3333-4333-8333-333333333333';

function buildCheckpoint(overrides: Partial<{ name: string }> = {}) {
  return {
    id: CHECKPOINT_ID,
    eventId: 'e',
    name: overrides.name ?? 'Обед',
    startsAt: new Date(Date.now() - 30_000),
    endsAt: new Date(Date.now() + 30_000),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Чекпоинты подключаются настоящими (сервис + репозиторий поверх мока prisma):
 * правила дедупликации живут именно там, заглушка спрятала бы регрессии.
 */
function buildCheckpointsService(prisma: never): EventCheckpointsService {
  return new EventCheckpointsService(
    prisma,
    new EventCheckpointsRepository(prisma),
  );
}

function buildAttendanceService(opts: {
  registration: unknown;
  existingAttendance?: { checkInAt: Date } | null;
  activeCheckpoint?: ReturnType<typeof buildCheckpoint> | null;
  eventOrgId?: string;
  qrVerify: QrVerifyResult;
}) {
  const findUniqueRegistration = jest.fn().mockResolvedValue(opts.registration);
  const findUniqueEvent = jest.fn().mockResolvedValue({
    organizationId: opts.eventOrgId ?? ORG_ID,
    status: 'PUBLISHED',
  });
  const findFirstAttendance = jest
    .fn()
    .mockResolvedValue(opts.existingAttendance ?? null);
  const createAttendance = jest.fn().mockResolvedValue({
    id: 'att-1',
    checkInAt: new Date('2026-12-15T20:00:00Z'),
    checkInDate: new Date('2026-12-15'),
  });
  const findManyCheckpoints = jest
    .fn()
    .mockResolvedValue(opts.activeCheckpoint ? [opts.activeCheckpoint] : []);

  const prisma = {
    registration: { findUnique: findUniqueRegistration },
    event: { findUnique: findUniqueEvent },
    eventCheckpoint: { findMany: findManyCheckpoints },
    attendance: {
      findFirst: findFirstAttendance,
      create: createAttendance,
    },
  } as never;

  const config = { get: jest.fn() } as unknown as ConfigService;
  const ticketQr = {
    verifyQrPayload: jest.fn().mockReturnValue(opts.qrVerify),
    encodeQrPayload: jest.fn(),
  } as unknown as TicketQrService;

  const service = new AttendanceService(
    prisma,
    config,
    ticketQr,
    // Цепочка REG-09 (Батч 6б): в юнитах достаточно тихой заглушки.
    { onCheckIn: jest.fn() } as never,
    buildCheckpointsService(prisma),
  );
  return {
    service,
    findUniqueRegistration,
    findFirstAttendance,
    createAttendance,
  };
}

const validRegistration = {
  id: REG_ID,
  status: RegistrationStatus.APPROVED,
  qrCode: 'uuid-x',
  qrPayloadVersion: 1,
  role: 'PARTICIPANT',
  user: {
    id: 'u',
    firstName: 'A',
    lastName: 'B',
    email: 'a@b.c',
  },
  event: {
    id: 'e',
    title: 't',
    startDate: new Date(Date.now() - 60_000),
    endDate: new Date(Date.now() + 60_000),
    organizationId: ORG_ID,
  },
};

const organizerUser = {
  sub: ORG_ID,
  type: UserType.ORGANIZATION,
} as never;

describe('AttendanceService.checkInByQrCode', () => {
  it('accepts v2 signed payload and creates attendance', async () => {
    const { service, findUniqueRegistration } = buildAttendanceService({
      registration: validRegistration,
      qrVerify: { kind: 'v2', registrationId: REG_ID, version: 1, issuedAt: 0 },
    });
    const result = await service.checkInByQrCode(
      { qrCode: 'v2.body.sig' },
      organizerUser,
    );
    expect(findUniqueRegistration).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: REG_ID } }),
    );
    expect(result.registration.id).toBe(REG_ID);
  });

  it('accepts legacy raw UUID payload', async () => {
    const { service, findUniqueRegistration } = buildAttendanceService({
      registration: validRegistration,
      qrVerify: { kind: 'legacy', qrCode: 'uuid-x' },
    });
    await service.checkInByQrCode({ qrCode: 'uuid-x' }, organizerUser);
    expect(findUniqueRegistration).toHaveBeenCalledWith(
      expect.objectContaining({ where: { qrCode: 'uuid-x' } }),
    );
  });

  it('rejects v2 payload with stale qrPayloadVersion', async () => {
    const stale = { ...validRegistration, qrPayloadVersion: 2 };
    const { service } = buildAttendanceService({
      registration: stale,
      qrVerify: { kind: 'v2', registrationId: REG_ID, version: 1, issuedAt: 0 },
    });
    await expect(
      service.checkInByQrCode({ qrCode: 'v2.body.sig' }, organizerUser),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects invalid payload', async () => {
    const { service } = buildAttendanceService({
      registration: null,
      qrVerify: { kind: 'invalid', reason: 'signature mismatch' },
    });
    await expect(
      service.checkInByQrCode({ qrCode: 'v2.x.y' }, organizerUser),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws 404 when registration not found', async () => {
    const { service } = buildAttendanceService({
      registration: null,
      qrVerify: { kind: 'legacy', qrCode: 'missing' },
    });
    await expect(
      service.checkInByQrCode({ qrCode: 'missing' }, organizerUser),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns 409 already_used on duplicate same-day check-in', async () => {
    const lastCheckInAt = new Date('2026-12-15T18:30:00Z');
    const { service } = buildAttendanceService({
      registration: validRegistration,
      qrVerify: { kind: 'v2', registrationId: REG_ID, version: 1, issuedAt: 0 },
      existingAttendance: { checkInAt: lastCheckInAt },
    });
    await expect(
      service.checkInByQrCode({ qrCode: 'v2.body.sig' }, organizerUser),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'already_used',
        alreadyCheckedIn: true,
        lastCheckInAt: lastCheckInAt.toISOString(),
        registrationId: REG_ID,
      }),
    });
  });

  it('resolves a URL-wrapped legacy code (printed badge scanned by hardware scanner)', async () => {
    // Реальный TicketQrService: проверяем разворачивание /check-in?code=<uuid>.
    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'TICKET_QR_SECRET')
          return 'unit-test-secret-with-enough-entropy-for-hmac';
        if (key === 'NODE_ENV') return 'test';
        return undefined;
      }),
    } as unknown as ConfigService;
    const realTicketQr = new TicketQrService(configService);
    realTicketQr.onModuleInit();

    const findUniqueRegistration = jest
      .fn()
      .mockResolvedValue(validRegistration);
    const prisma = {
      registration: { findUnique: findUniqueRegistration },
      event: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ organizationId: ORG_ID, status: 'PUBLISHED' }),
      },
      eventCheckpoint: { findMany: jest.fn().mockResolvedValue([]) },
      attendance: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          id: 'att-1',
          checkInAt: new Date('2026-12-15T20:00:00Z'),
          checkInDate: new Date('2026-12-15'),
        }),
      },
    } as never;
    const service = new AttendanceService(
      prisma,
      configService,
      realTicketQr,
      { onCheckIn: jest.fn() } as never,
      buildCheckpointsService(prisma),
    );

    const result = await service.checkInByQrCode(
      { qrCode: 'https://app.eventflow.uz/check-in?code=uuid-x' },
      organizerUser,
    );

    expect(findUniqueRegistration).toHaveBeenCalledWith(
      expect.objectContaining({ where: { qrCode: 'uuid-x' } }),
    );
    expect(result.registration.id).toBe(REG_ID);
  });

  it('binds the attendance to the checkpoint active at scan time', async () => {
    const checkpoint = buildCheckpoint({ name: 'Обед' });
    const { service, createAttendance } = buildAttendanceService({
      registration: validRegistration,
      qrVerify: { kind: 'v2', registrationId: REG_ID, version: 1, issuedAt: 0 },
      activeCheckpoint: checkpoint,
    });

    const result = await service.checkInByQrCode(
      { qrCode: 'v2.body.sig' },
      organizerUser,
    );

    expect(createAttendance).toHaveBeenCalledWith({
      data: expect.objectContaining({
        registrationId: REG_ID,
        checkpointId: CHECKPOINT_ID,
      }),
    });
    expect(result.checkpoint).toMatchObject({
      id: CHECKPOINT_ID,
      name: 'Обед',
    });
  });

  it('returns 409 naming the checkpoint on a second scan inside the same window', async () => {
    const lastCheckInAt = new Date('2026-12-15T18:30:00Z');
    const { service, createAttendance } = buildAttendanceService({
      registration: validRegistration,
      qrVerify: { kind: 'v2', registrationId: REG_ID, version: 1, issuedAt: 0 },
      activeCheckpoint: buildCheckpoint({ name: 'Обед' }),
      existingAttendance: { checkInAt: lastCheckInAt },
    });

    await expect(
      service.checkInByQrCode({ qrCode: 'v2.body.sig' }, organizerUser),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'already_used',
        message: 'Участник уже отмечен на чекпоинте «Обед»',
        details: expect.objectContaining({
          checkpoint: expect.objectContaining({ name: 'Обед' }),
        }),
      }),
    });
    expect(createAttendance).not.toHaveBeenCalled();
  });

  it('falls back to a day-scoped attendance when no checkpoint is active', async () => {
    const { service, createAttendance } = buildAttendanceService({
      registration: validRegistration,
      qrVerify: { kind: 'v2', registrationId: REG_ID, version: 1, issuedAt: 0 },
      activeCheckpoint: null,
    });

    const result = await service.checkInByQrCode(
      { qrCode: 'v2.body.sig' },
      organizerUser,
    );

    expect(createAttendance).toHaveBeenCalledWith({
      data: expect.objectContaining({ checkpointId: null }),
    });
    expect(result.checkpoint).toBeNull();
  });

  it('degrades a P2002 race to 409 already_used', async () => {
    const lastCheckInAt = new Date('2026-12-15T18:30:00Z');
    const { service, findFirstAttendance, createAttendance } =
      buildAttendanceService({
        registration: validRegistration,
        qrVerify: {
          kind: 'v2',
          registrationId: REG_ID,
          version: 1,
          issuedAt: 0,
        },
      });
    createAttendance.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('unique violation', {
        code: 'P2002',
        clientVersion: '7.0.0',
      }),
    );
    findFirstAttendance
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ checkInAt: lastCheckInAt });

    await expect(
      service.checkInByQrCode({ qrCode: 'v2.body.sig' }, organizerUser),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'already_used' }),
    });
  });

  it('rejects when registration is not APPROVED', async () => {
    const pending = { ...validRegistration, status: RegistrationStatus.PENDING };
    const { service } = buildAttendanceService({
      registration: pending,
      qrVerify: { kind: 'v2', registrationId: REG_ID, version: 1, issuedAt: 0 },
    });
    await expect(
      service.checkInByQrCode({ qrCode: 'v2.body.sig' }, organizerUser),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

const EVENT_ID = '22222222-2222-4222-8222-222222222222';

function buildSelfCheckInService(opts: {
  registration: unknown;
  existingAttendance?: { checkInAt: Date } | null;
  activeCheckpoint?: ReturnType<typeof buildCheckpoint> | null;
  createError?: unknown;
}) {
  const findUniqueRegistration = jest.fn().mockResolvedValue(opts.registration);
  const findFirstAttendance = jest
    .fn()
    .mockResolvedValue(opts.existingAttendance ?? null);
  const createAttendance = opts.createError
    ? jest.fn().mockRejectedValue(opts.createError)
    : jest.fn().mockResolvedValue({
        id: 'att-1',
        checkInAt: new Date('2026-12-15T20:00:00Z'),
        checkInDate: new Date('2026-12-15'),
      });
  const findManyCheckpoints = jest
    .fn()
    .mockResolvedValue(opts.activeCheckpoint ? [opts.activeCheckpoint] : []);

  const prisma = {
    registration: { findUnique: findUniqueRegistration },
    eventCheckpoint: { findMany: findManyCheckpoints },
    attendance: {
      findFirst: findFirstAttendance,
      create: createAttendance,
    },
  } as never;

  const config = { get: jest.fn() } as unknown as ConfigService;
  const ticketQr = {
    verifyQrPayload: jest.fn(),
    encodeQrPayload: jest.fn(),
  } as unknown as TicketQrService;

  const service = new AttendanceService(
    prisma,
    config,
    ticketQr,
    // Цепочка REG-09 (Батч 6б): в юнитах достаточно тихой заглушки.
    { onCheckIn: jest.fn() } as never,
    buildCheckpointsService(prisma),
  );
  return {
    service,
    findUniqueRegistration,
    findFirstAttendance,
    createAttendance,
  };
}

const selfRegistration = {
  id: REG_ID,
  status: RegistrationStatus.APPROVED,
  event: {
    id: EVENT_ID,
    title: 't',
    slug: 's',
    startDate: new Date(Date.now() - 60_000),
    endDate: new Date(Date.now() + 60_000),
    deletedAt: null,
  },
};

const participantUser = { sub: 'user-1', type: UserType.USER } as never;

describe('AttendanceService.selfCheckIn', () => {
  it('creates attendance and returns contract shape', async () => {
    const { service, findUniqueRegistration, createAttendance } =
      buildSelfCheckInService({ registration: selfRegistration });
    const result = await service.selfCheckIn(EVENT_ID, participantUser);
    expect(findUniqueRegistration).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { eventId_userId: { eventId: EVENT_ID, userId: 'user-1' } },
      }),
    );
    expect(createAttendance).toHaveBeenCalledWith({
      data: expect.objectContaining({
        registrationId: REG_ID,
        checkpointId: null,
      }),
    });
    expect(result.attendance).toMatchObject({ id: 'att-1' });
    expect(result.event).toMatchObject({ id: EVENT_ID, title: 't', slug: 's' });
  });

  it('rejects non-participant callers', async () => {
    const { service, findUniqueRegistration } = buildSelfCheckInService({
      registration: selfRegistration,
    });
    await expect(
      service.selfCheckIn(EVENT_ID, organizerUser),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(findUniqueRegistration).not.toHaveBeenCalled();
  });

  it('throws 404 not_registered when registration is missing', async () => {
    const { service } = buildSelfCheckInService({ registration: null });
    const promise = service.selfCheckIn(EVENT_ID, participantUser);
    await expect(promise).rejects.toBeInstanceOf(NotFoundException);
    await expect(promise).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'not_registered' }),
    });
  });

  it('throws 404 pending_review for PENDING registration', async () => {
    const { service } = buildSelfCheckInService({
      registration: {
        ...selfRegistration,
        status: RegistrationStatus.PENDING,
      },
    });
    await expect(
      service.selfCheckIn(EVENT_ID, participantUser),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'pending_review' }),
    });
  });

  it.each([
    [RegistrationStatus.REJECTED, 'rejected'],
    [RegistrationStatus.CANCELLED, 'cancelled'],
    ['UNKNOWN' as never, 'not_approved'],
  ])('throws 404 with code %s -> %s', async (status, code) => {
    const { service } = buildSelfCheckInService({
      registration: { ...selfRegistration, status },
    });
    await expect(
      service.selfCheckIn(EVENT_ID, participantUser),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code }),
    });
  });

  it('throws 404 event_not_found for soft-deleted event', async () => {
    const { service } = buildSelfCheckInService({
      registration: {
        ...selfRegistration,
        event: { ...selfRegistration.event, deletedAt: new Date() },
      },
    });
    await expect(
      service.selfCheckIn(EVENT_ID, participantUser),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'event_not_found' }),
    });
  });

  it('throws 400 event_not_started before startDate', async () => {
    const { service } = buildSelfCheckInService({
      registration: {
        ...selfRegistration,
        event: {
          ...selfRegistration.event,
          startDate: new Date(Date.now() + 60_000),
        },
      },
    });
    const promise = service.selfCheckIn(EVENT_ID, participantUser);
    await expect(promise).rejects.toBeInstanceOf(BadRequestException);
    await expect(promise).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'event_not_started' }),
    });
  });

  it('throws 400 expired after endDate', async () => {
    const { service } = buildSelfCheckInService({
      registration: {
        ...selfRegistration,
        event: {
          ...selfRegistration.event,
          endDate: new Date(Date.now() - 30_000),
        },
      },
    });
    await expect(
      service.selfCheckIn(EVENT_ID, participantUser),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'expired' }),
    });
  });

  it('returns 409 already_used on duplicate same-day check-in', async () => {
    const lastCheckInAt = new Date('2026-12-15T18:30:00Z');
    const { service, createAttendance } = buildSelfCheckInService({
      registration: selfRegistration,
      existingAttendance: { checkInAt: lastCheckInAt },
    });
    await expect(
      service.selfCheckIn(EVENT_ID, participantUser),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'already_used',
        details: {
          alreadyCheckedIn: true,
          lastCheckInAt: lastCheckInAt.toISOString(),
          registrationId: REG_ID,
          checkpoint: null,
        },
      }),
    });
    expect(createAttendance).not.toHaveBeenCalled();
  });

  it('degrades P2002 race on create to 409 already_used', async () => {
    const lastCheckInAt = new Date('2026-12-15T18:30:00Z');
    const { service, findFirstAttendance } = buildSelfCheckInService({
      registration: selfRegistration,
      createError: new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed on the fields: (`registration_id`,`check_in_date`)',
        { code: 'P2002', clientVersion: '7.0.0' },
      ),
    });
    findFirstAttendance
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ checkInAt: lastCheckInAt });
    await expect(
      service.selfCheckIn(EVENT_ID, participantUser),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'already_used',
        details: {
          alreadyCheckedIn: true,
          lastCheckInAt: lastCheckInAt.toISOString(),
          registrationId: REG_ID,
          checkpoint: null,
        },
      }),
    });
  });
});

/**
 * Регрессия: с чекпоинтами у участника несколько отметок за день, и дневной
 * отчёт раньше отдавал строку на каждую — в шапке колонки получалось
 * невозможное «332 / 150».
 */
describe('AttendanceService.getAttendanceReport — ось «день»', () => {
  const DAY = new Date('2026-08-11');

  function buildReportService(
    attendances: { registrationId: string; checkInAt: Date; checkInDate: Date }[],
  ) {
    const rows = attendances.map((a, i) => ({
      ...a,
      id: `att-${i}`,
      registration: {
        user: {
          id: `user-${a.registrationId}`,
          firstName: 'A',
          lastName: String(a.registrationId),
          email: `${a.registrationId}@e.c`,
        },
      },
    }));
    const prisma = {
      event: {
        findUnique: jest.fn().mockResolvedValue({ organizationId: ORG_ID }),
      },
      eventCheckpoint: { findMany: jest.fn().mockResolvedValue([]) },
      attendance: {
        findMany: jest.fn().mockResolvedValue(rows),
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      registration: { findUnique: jest.fn() },
    } as never;

    return new AttendanceService(
      prisma,
      { get: jest.fn() } as unknown as ConfigService,
      { verifyQrPayload: jest.fn() } as unknown as TicketQrService,
      { onCheckIn: jest.fn() } as never,
      buildCheckpointsService(prisma),
    );
  }

  it('counts a participant once per day even with several checkpoint passes', async () => {
    const service = buildReportService([
      { registrationId: 'r1', checkInAt: new Date('2026-08-11T09:00:00Z'), checkInDate: DAY },
      { registrationId: 'r1', checkInAt: new Date('2026-08-11T13:00:00Z'), checkInDate: DAY },
      { registrationId: 'r1', checkInAt: new Date('2026-08-11T17:00:00Z'), checkInDate: DAY },
      { registrationId: 'r2', checkInAt: new Date('2026-08-11T09:05:00Z'), checkInDate: DAY },
    ]);

    const report = await service.getAttendanceReport(
      '22222222-2222-4222-8222-222222222222',
      {},
      organizerUser,
    );

    expect(report).toHaveLength(1);
    expect(report[0].total).toBe(2);
    expect(report[0].attendees).toHaveLength(2);
    // Остаётся первый проход за день, а не последний.
    expect(report[0].attendees[0].checkInAt).toEqual(
      new Date('2026-08-11T09:00:00Z'),
    );
  });
});
