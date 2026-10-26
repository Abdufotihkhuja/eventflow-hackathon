import { ForbiddenException } from '@nestjs/common';
import {
  EventAccessType,
  EventStatus,
  InviteStatus,
  RegistrationMode,
  RegistrationStatus,
  UserType,
} from '@prisma/client';
import { RegistrationsService } from './registrations.service';
import { hashEventInvitationToken } from '../../common/events';
import type { ICurrentUser } from '../../common/interfaces';

const EVENT_ID = 'event-1';
const TOKEN = 'raw-personal-token';

const participant = { sub: 'user-1', type: UserType.USER } as ICurrentUser;

function buildService(opts: {
  invitation: { id: string } | null;
  acceptedCount?: number;
}) {
  const event = {
    id: EVENT_ID,
    status: EventStatus.PUBLISHED,
    registrationOpen: true,
    accessType: EventAccessType.PRIVATE,
    inviteCode: null,
    registrationDeadline: null,
    organizationId: 'org-1',
    createdAt: new Date(),
    maxParticipants: null,
    registrationQuestions: [],
    registrationMode: RegistrationMode.SIMPLE,
    testEvaluationType: null,
  };
  const created = {
    id: 'reg-1',
    eventId: EVENT_ID,
    status: RegistrationStatus.APPROVED,
  };

  const repo = {
    findEventRegistrationSnapshot: jest.fn().mockResolvedValue(event),
    findByEventAndUser: jest.fn().mockResolvedValue(null),
    countByEventAndStatus: jest.fn().mockResolvedValue(0),
    create: jest.fn().mockResolvedValue(created),
    findEventWithOrgName: jest.fn().mockResolvedValue(null),
  };
  const tx = {
    $executeRaw: jest.fn().mockResolvedValue(1),
    eventInvitation: {
      updateMany: jest
        .fn()
        .mockResolvedValue({ count: opts.acceptedCount ?? 1 }),
    },
  };
  const prisma = {
    eventInvitation: {
      findFirst: jest.fn().mockResolvedValue(opts.invitation),
    },
    $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
  };

  const service = new RegistrationsService(
    repo as never,
    { ensureTicketNumber: jest.fn().mockResolvedValue('T-1') } as never,
    {} as never, // MailService: no user include on `created`, so no email
    { get: jest.fn() } as never,
    { prepareForSubmit: jest.fn().mockResolvedValue([]) } as never,
    { effectiveEventCap: jest.fn().mockResolvedValue({ cap: null }) } as never,
    { isOrgSuspended: jest.fn().mockResolvedValue(false) } as never,
    prisma as never,
    { emit: jest.fn() } as never,
    { onRegistrationCreated: jest.fn().mockResolvedValue(undefined) } as never,
  );
  return { service, prisma, tx, repo };
}

describe('RegistrationsService — PRIVATE event invitations', () => {
  it('rejects registration without an invitation token', async () => {
    const { service, repo } = buildService({ invitation: null });

    await expect(
      service.register(EVENT_ID, {} as never, participant),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('looks the token up by hash among PENDING invitations only', async () => {
    const { service, prisma } = buildService({ invitation: null });

    await expect(
      service.register(EVENT_ID, {} as never, participant, TOKEN),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.eventInvitation.findFirst).toHaveBeenCalledWith({
      where: {
        eventId: EVENT_ID,
        tokenHash: hashEventInvitationToken(TOKEN),
        status: InviteStatus.PENDING,
      },
      select: { id: true },
    });
  });

  it('registers with a valid token and marks the invitation ACCEPTED in the same transaction', async () => {
    const { service, tx } = buildService({ invitation: { id: 'inv-1' } });

    const result = await service.register(
      EVENT_ID,
      {} as never,
      participant,
      TOKEN,
    );

    expect(result.id).toBe('reg-1');
    expect(tx.eventInvitation.updateMany).toHaveBeenCalledWith({
      where: { id: 'inv-1', status: InviteStatus.PENDING },
      data: expect.objectContaining({
        status: InviteStatus.ACCEPTED,
        acceptedByUserId: 'user-1',
        registrationId: 'reg-1',
      }) as unknown,
    });
  });

  it('fails when a concurrent request already used the same link', async () => {
    const { service } = buildService({
      invitation: { id: 'inv-1' },
      acceptedCount: 0,
    });

    await expect(
      service.register(EVENT_ID, {} as never, participant, TOKEN),
    ).rejects.toThrow('Приглашение недействительно или уже использовано');
  });
});
