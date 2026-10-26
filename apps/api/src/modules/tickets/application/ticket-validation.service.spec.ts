import { RegistrationStatus } from '@prisma/client';
import {
  TicketValidationService,
  type TicketValidationResult,
} from './ticket-validation.service';
import type { TicketQrService } from './ticket-qr.service';
import { EventCheckpointsRepository } from '../../events/checkpoints/event-checkpoints.repository';
import { EventCheckpointsService } from '../../events/checkpoints/event-checkpoints.service';

const REG_ID = '11111111-1111-4111-8111-111111111111';
const EVENT_ID = '22222222-2222-4222-8222-222222222222';
const NOW = new Date('2026-12-15T12:00:00Z');
const CHECKPOINT_ID = '33333333-3333-4333-8333-333333333333';

function buildRegistration(
  overrides: Partial<{
    status: RegistrationStatus;
    startDate: Date;
    endDate: Date;
    qrPayloadVersion: number;
  }> = {},
) {
  return {
    id: REG_ID,
    qrCode: 'uuid-x',
    qrPayloadVersion: overrides.qrPayloadVersion ?? 1,
    ticketNumber: 'EVF-261215-AB7K3X',
    role: 'PARTICIPANT',
    status: overrides.status ?? RegistrationStatus.APPROVED,
    user: { id: 'u', firstName: 'Tony', lastName: 'Jackson', email: 't@e.c' },
    event: {
      id: EVENT_ID,
      title: 'ML Hackathon',
      startDate: overrides.startDate ?? new Date('2026-12-15T10:00:00Z'),
      endDate: overrides.endDate ?? new Date('2026-12-15T20:00:00Z'),
      organizationId: 'org-1',
    },
  };
}

function buildCheckpoint(name = 'Обед') {
  return {
    id: CHECKPOINT_ID,
    eventId: EVENT_ID,
    name,
    startsAt: new Date('2026-12-15T11:00:00Z'),
    endsAt: new Date('2026-12-15T14:00:00Z'),
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function buildService(opts: {
  registration: ReturnType<typeof buildRegistration> | null;
  qrVerify: ReturnType<TicketQrService['verifyQrPayload']>;
  /** Уже сделанная отметка в текущем слоте — источник already_used. */
  existingAttendance?: { checkInAt: Date } | null;
  activeCheckpoint?: ReturnType<typeof buildCheckpoint> | null;
}) {
  const findUnique = jest.fn().mockResolvedValue(opts.registration);
  const prisma = {
    registration: { findUnique },
    event: { findUnique: jest.fn() },
    eventCheckpoint: {
      findMany: jest
        .fn()
        .mockResolvedValue(opts.activeCheckpoint ? [opts.activeCheckpoint] : []),
    },
    attendance: {
      findFirst: jest.fn().mockResolvedValue(opts.existingAttendance ?? null),
    },
  } as never;
  const qr = {
    verifyQrPayload: jest.fn().mockReturnValue(opts.qrVerify),
    encodeQrPayload: jest.fn(),
  } as unknown as TicketQrService;
  // Настоящий сервис чекпоинтов поверх мока prisma: правила дедупликации живут в нём.
  const checkpoints = new EventCheckpointsService(
    prisma,
    new EventCheckpointsRepository(prisma),
  );
  return new TicketValidationService(prisma, qr, checkpoints);
}

async function expectStatus(
  service: TicketValidationService,
  input: { qrCode: string; eventId?: string; now?: Date },
  status: TicketValidationResult['status'],
): Promise<TicketValidationResult> {
  const r = await service.validate(input);
  expect(r.status).toBe(status);
  expect(r.valid).toBe(status === 'valid');
  return r;
}

describe('TicketValidationService.validate', () => {
  it('returns valid when APPROVED + within event window + no attendance today', async () => {
    const service = buildService({
      registration: buildRegistration(),
      qrVerify: { kind: 'v2', registrationId: REG_ID, version: 1, issuedAt: 0 },
    });
    const r = await expectStatus(service, { qrCode: 'v2.x', now: NOW }, 'valid');
    expect(r.attendee?.fullName).toBe('Tony Jackson');
    expect(r.event?.title).toBe('ML Hackathon');
    expect(r.ticket?.number).toBe('EVF-261215-AB7K3X');
  });

  it('returns invalid_signature when HMAC fails', async () => {
    const service = buildService({
      registration: null,
      qrVerify: { kind: 'invalid', reason: 'signature mismatch' },
    });
    await expectStatus(service, { qrCode: 'v2.x', now: NOW }, 'invalid_signature');
  });

  it('returns invalid_signature when qrPayloadVersion stale', async () => {
    const service = buildService({
      registration: buildRegistration({ qrPayloadVersion: 2 }),
      qrVerify: { kind: 'v2', registrationId: REG_ID, version: 1, issuedAt: 0 },
    });
    await expectStatus(service, { qrCode: 'v2.x', now: NOW }, 'invalid_signature');
  });

  it('returns ticket_not_found when registration missing', async () => {
    const service = buildService({
      registration: null,
      qrVerify: { kind: 'v2', registrationId: REG_ID, version: 1, issuedAt: 0 },
    });
    await expectStatus(service, { qrCode: 'v2.x', now: NOW }, 'ticket_not_found');
  });

  it('returns wrong_event when caller scopes to a different event', async () => {
    const service = buildService({
      registration: buildRegistration(),
      qrVerify: { kind: 'v2', registrationId: REG_ID, version: 1, issuedAt: 0 },
    });
    const r = await expectStatus(
      service,
      { qrCode: 'v2.x', eventId: 'other-event', now: NOW },
      'wrong_event',
    );
    expect(r.event?.id).toBe(EVENT_ID);
  });

  it('returns pending_review for PENDING registration', async () => {
    const service = buildService({
      registration: buildRegistration({ status: RegistrationStatus.PENDING }),
      qrVerify: { kind: 'v2', registrationId: REG_ID, version: 1, issuedAt: 0 },
    });
    await expectStatus(service, { qrCode: 'v2.x', now: NOW }, 'pending_review');
  });

  it('returns cancelled for CANCELLED registration', async () => {
    const service = buildService({
      registration: buildRegistration({ status: RegistrationStatus.CANCELLED }),
      qrVerify: { kind: 'v2', registrationId: REG_ID, version: 1, issuedAt: 0 },
    });
    await expectStatus(service, { qrCode: 'v2.x', now: NOW }, 'cancelled');
  });

  it('returns rejected for REJECTED registration', async () => {
    const service = buildService({
      registration: buildRegistration({ status: RegistrationStatus.REJECTED }),
      qrVerify: { kind: 'v2', registrationId: REG_ID, version: 1, issuedAt: 0 },
    });
    await expectStatus(service, { qrCode: 'v2.x', now: NOW }, 'rejected');
  });

  it('returns expired when event has ended', async () => {
    const service = buildService({
      registration: buildRegistration({
        endDate: new Date('2026-12-15T11:00:00Z'),
      }),
      qrVerify: { kind: 'v2', registrationId: REG_ID, version: 1, issuedAt: 0 },
    });
    await expectStatus(service, { qrCode: 'v2.x', now: NOW }, 'expired');
  });

  it('returns event_not_started when scanning before start', async () => {
    const service = buildService({
      registration: buildRegistration({
        startDate: new Date('2026-12-15T13:00:00Z'),
      }),
      qrVerify: { kind: 'v2', registrationId: REG_ID, version: 1, issuedAt: 0 },
    });
    await expectStatus(service, { qrCode: 'v2.x', now: NOW }, 'event_not_started');
  });

  it('returns already_used with first checkedInAt on duplicate same-day scan', async () => {
    const lastCheckIn = new Date('2026-12-15T10:30:00Z');
    const service = buildService({
      registration: buildRegistration(),
      existingAttendance: { checkInAt: lastCheckIn },
      qrVerify: { kind: 'v2', registrationId: REG_ID, version: 1, issuedAt: 0 },
    });
    const r = await expectStatus(
      service,
      { qrCode: 'v2.x', now: NOW },
      'already_used',
    );
    expect(r.checkedInAt).toBe(lastCheckIn.toISOString());
  });

  it('scopes already_used to the active checkpoint window', async () => {
    const lastCheckIn = new Date('2026-12-15T11:30:00Z');
    const service = buildService({
      registration: buildRegistration(),
      activeCheckpoint: buildCheckpoint('Обед'),
      existingAttendance: { checkInAt: lastCheckIn },
      qrVerify: { kind: 'v2', registrationId: REG_ID, version: 1, issuedAt: 0 },
    });
    const r = await expectStatus(
      service,
      { qrCode: 'v2.x', now: NOW },
      'already_used',
    );
    expect(r.message).toBe('Билет уже использован на чекпоинте «Обед»');
    expect(r.checkpoint).toMatchObject({ id: CHECKPOINT_ID, name: 'Обед' });
  });

  it('stays valid inside a new checkpoint even after an earlier same-day scan', async () => {
    // Отметка на предыдущем чекпоинте существует, но в текущем окне её нет —
    // findFirst по слоту вернёт null, и билет снова валиден.
    const service = buildService({
      registration: buildRegistration(),
      activeCheckpoint: buildCheckpoint('Вечерняя сессия'),
      existingAttendance: null,
      qrVerify: { kind: 'v2', registrationId: REG_ID, version: 1, issuedAt: 0 },
    });
    const r = await expectStatus(service, { qrCode: 'v2.x', now: NOW }, 'valid');
    expect(r.checkpoint).toMatchObject({ name: 'Вечерняя сессия' });
  });

  it('accepts legacy raw UUID payload', async () => {
    const service = buildService({
      registration: buildRegistration(),
      qrVerify: { kind: 'legacy', qrCode: 'uuid-x' },
    });
    await expectStatus(service, { qrCode: 'uuid-x', now: NOW }, 'valid');
  });
});
