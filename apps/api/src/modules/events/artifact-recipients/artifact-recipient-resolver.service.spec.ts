import {
  BuiltInEventRecipientRoleKey,
  EventRecipientRoleAssignmentStatus,
  EventRecipientSourceType,
  EventRecipientStatus,
  ParticipantRole,
} from '@prisma/client';
import { ArtifactRecipientResolverService } from './artifact-recipient-resolver.service';

describe('ArtifactRecipientResolverService', () => {
  const participantRole = {
    id: 'participant-role-id',
    eventId: 'event-id',
    code: 'participant',
    builtInKey: BuiltInEventRecipientRoleKey.PARTICIPANT,
    isActive: true,
    isArtifactEligible: true,
  };
  const speakerRole = {
    id: 'speaker-role-id',
    eventId: 'event-id',
    code: 'speaker',
    builtInKey: BuiltInEventRecipientRoleKey.SPEAKER,
    isActive: true,
    isArtifactEligible: true,
  };

  function assignment(role = participantRole, sources = registrationSources()) {
    return {
      id: `${role.code}-assignment-id`,
      eventId: 'event-id',
      recipientId: 'recipient-id',
      roleId: role.id,
      status: EventRecipientRoleAssignmentStatus.ACTIVE,
      createdAt: new Date(),
      role,
      recipient: {
        id: 'recipient-id',
        eventId: 'event-id',
        userId: 'user-id',
        displayName: 'Ada Lovelace',
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@test.dev',
        status: EventRecipientStatus.ACTIVE,
        sources,
      },
    };
  }

  function registrationSources() {
    return [
      {
        eventId: 'event-id',
        recipientId: 'recipient-id',
        sourceType: EventRecipientSourceType.REGISTRATION,
        sourceId: 'registration-id',
      },
    ];
  }

  function createService(overrides: Record<string, unknown> = {}) {
    const prisma = {
      eventRecipient: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([{ id: 'recipient-id' }]),
      },
      eventRecipientSource: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest
          .fn()
          .mockResolvedValue([
            { recipientId: 'recipient-id', sourceId: 'registration-id' },
          ]),
      },
      eventRecipientRole: {
        findFirst: jest.fn(({ where }) => {
          if (where.id === speakerRole.id || where.code === 'speaker') {
            return Promise.resolve(speakerRole);
          }
          if (where.id === participantRole.id || where.code === 'participant') {
            return Promise.resolve(participantRole);
          }
          return Promise.resolve(null);
        }),
      },
      eventRecipientRoleAssignment: {
        findMany: jest.fn().mockResolvedValue([assignment()]),
      },
      registration: {
        findMany: jest.fn().mockResolvedValue([{ id: 'registration-id' }]),
        count: jest.fn().mockResolvedValue(1),
      },
      speaker: {
        count: jest.fn().mockResolvedValue(0),
      },
      $transaction: jest.fn((queries) => Promise.all(queries)),
      ...overrides,
    };
    const artifactRecipients = {
      ensureBuiltInRolesForEvent: jest.fn().mockResolvedValue(new Map()),
      backfillEventRecipients: jest.fn(),
    };
    return {
      prisma,
      artifactRecipients,
      service: new ArtifactRecipientResolverService(
        prisma as never,
        artifactRecipients as never,
      ),
    };
  }

  it('maps legacy registrationIds through EventRecipientSource', async () => {
    const { prisma, service } = createService();

    const targets = await service.resolveTargets({
      eventId: 'event-id',
      registrationIds: ['registration-id'],
      recipientRole: ParticipantRole.PARTICIPANT,
      requireApprovedRegistration: true,
      requireAttendance: true,
    });

    expect(targets).toHaveLength(1);
    expect(targets[0]).toMatchObject({
      recipientId: 'recipient-id',
      recipientRoleId: participantRole.id,
      roleCode: 'participant',
      registrationId: 'registration-id',
    });
    expect(prisma.eventRecipientSource.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          eventId: 'event-id',
          sourceType: EventRecipientSourceType.REGISTRATION,
          sourceId: { in: ['registration-id'] },
        }),
      }),
    );
  });

  it('resolves selected normalized recipientIds across eligible roles', async () => {
    const { prisma, service } = createService();
    prisma.eventRecipientRoleAssignment.findMany.mockResolvedValue([
      assignment(participantRole),
      assignment(speakerRole),
    ]);

    const targets = await service.resolveTargets({
      eventId: 'event-id',
      recipientIds: ['recipient-id'],
      scope: 'ALL_ELIGIBLE',
    });

    expect(targets.map((target) => target.roleCode)).toEqual([
      'participant',
      'speaker',
    ]);
  });

  it('defaults to all participant role assignments', async () => {
    const { prisma, service } = createService();

    const targets = await service.resolveTargets({ eventId: 'event-id' });

    expect(targets).toHaveLength(1);
    expect(targets[0].roleCode).toBe('participant');
    expect(prisma.eventRecipientRole.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          eventId: 'event-id',
          code: 'participant',
        }),
      }),
    );
  });

  it('supports roleId and roleCode filtering', async () => {
    const { prisma, service } = createService();
    prisma.eventRecipientRoleAssignment.findMany.mockResolvedValue([
      assignment(speakerRole),
    ]);

    const byRoleId = await service.resolveTargets({
      eventId: 'event-id',
      roleId: speakerRole.id,
    });
    const byRoleCode = await service.resolveTargets({
      eventId: 'event-id',
      roleCode: 'speaker',
    });

    expect(byRoleId[0].roleCode).toBe('speaker');
    expect(byRoleCode[0].roleCode).toBe('speaker');
  });

  it('includes manual speakers without registration sources', async () => {
    const { prisma, service } = createService();
    prisma.eventRecipientRoleAssignment.findMany.mockResolvedValue([
      assignment(speakerRole, [
        {
          eventId: 'event-id',
          recipientId: 'recipient-id',
          sourceType: EventRecipientSourceType.SPEAKER,
          sourceId: 'speaker-id',
        },
      ]),
    ]);

    const targets = await service.resolveTargets({
      eventId: 'event-id',
      roleCode: 'speaker',
      requireApprovedRegistration: true,
    });

    expect(targets).toHaveLength(1);
    expect(targets[0]).toMatchObject({
      roleCode: 'speaker',
      registrationId: null,
      speakerId: 'speaker-id',
    });
  });

  it('validates roleId and event recipient boundaries', async () => {
    const { prisma, service } = createService();
    prisma.eventRecipient.findMany.mockResolvedValue([]);

    await expect(
      service.resolveTargets({
        eventId: 'event-id',
        recipientIds: ['other-event-recipient-id'],
        roleId: speakerRole.id,
      }),
    ).rejects.toThrow(/Selected recipients do not belong/);
  });

  it('rejects selected registrations from another event', async () => {
    const { prisma, service } = createService();
    prisma.registration.findMany.mockResolvedValue([]);

    await expect(
      service.resolveTargets({
        eventId: 'event-id',
        registrationIds: ['other-event-registration-id'],
      }),
    ).rejects.toThrow(/Selected registrations do not match/);
  });

  it('classifyRegistrationEligibility groups approved and attended registrations', async () => {
    const { prisma, service } = createService();
    prisma.registration.findMany.mockResolvedValue([
      { id: 'r-approved-attended', status: 'APPROVED', attendances: [{ id: 'a1' }] },
      { id: 'r-approved-only', status: 'APPROVED', attendances: [] },
      { id: 'r-pending', status: 'PENDING', attendances: [{ id: 'a2' }] },
    ]);

    const result = await service.classifyRegistrationEligibility('event-id', [
      'r-approved-attended',
      'r-approved-only',
      'r-pending',
    ]);

    expect([...result.approved].sort()).toEqual([
      'r-approved-attended',
      'r-approved-only',
    ]);
    expect([...result.attended].sort()).toEqual([
      'r-approved-attended',
      'r-pending',
    ]);
  });
});
