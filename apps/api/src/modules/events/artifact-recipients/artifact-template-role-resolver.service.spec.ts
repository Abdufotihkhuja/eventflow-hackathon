import { BadRequestException } from '@nestjs/common';
import { EventRecipientRoleKind, ParticipantRole } from '@prisma/client';
import { ArtifactTemplateRoleResolverService } from './artifact-template-role-resolver.service';

describe('ArtifactTemplateRoleResolverService', () => {
  const participantRole = {
    id: 'participant-role-id',
    eventId: 'event-id',
    code: 'participant',
    displayName: 'Participant',
    kind: EventRecipientRoleKind.BUILT_IN,
    builtInKey: 'PARTICIPANT',
    sortOrder: 10,
    isActive: true,
    isArtifactEligible: true,
    sourceMapping: 'REGISTRATION',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const speakerRole = {
    ...participantRole,
    id: 'speaker-role-id',
    code: 'speaker',
    displayName: 'Speaker',
    builtInKey: 'SPEAKER',
  };
  const customRole = {
    ...participantRole,
    id: 'vip-role-id',
    code: 'vip',
    displayName: 'VIP',
    kind: EventRecipientRoleKind.CUSTOM,
    builtInKey: null,
    sourceMapping: 'MANUAL',
  };

  function createService(role = participantRole) {
    const prisma = {
      eventRecipientRole: {
        findFirst: jest.fn().mockResolvedValue(role),
      },
    };
    const artifactRecipientsService = {
      ensureBuiltInRolesForEvent: jest.fn().mockResolvedValue(new Map()),
    };
    return {
      prisma,
      artifactRecipientsService,
      service: new ArtifactTemplateRoleResolverService(
        prisma as never,
        artifactRecipientsService as never,
      ),
    };
  }

  it('resolves a normalized built-in participant role', async () => {
    const { service } = createService(participantRole);

    await expect(
      service.resolveForWrite('event-id', {
        recipientRoleId: 'participant-role-id',
      }),
    ).resolves.toMatchObject({
      recipientRoleId: 'participant-role-id',
      roleCode: 'participant',
      roleDisplayName: 'Participant',
      legacyRecipientRole: ParticipantRole.PARTICIPANT,
    });
  });

  it('maps legacy recipientRole to a normalized built-in speaker role', async () => {
    const { service } = createService(speakerRole);

    await expect(
      service.resolveForWrite('event-id', {
        recipientRole: ParticipantRole.SPEAKER,
      }),
    ).resolves.toMatchObject({
      recipientRoleId: 'speaker-role-id',
      roleCode: 'speaker',
      legacyRecipientRole: ParticipantRole.SPEAKER,
    });
  });

  it('allows custom artifact-eligible roles', async () => {
    const { service } = createService(customRole);

    await expect(
      service.resolveForWrite('event-id', { roleId: 'vip-role-id' }),
    ).resolves.toMatchObject({
      recipientRoleId: 'vip-role-id',
      roleCode: 'vip',
      roleDisplayName: 'VIP',
      legacyRecipientRole: null,
    });
  });

  it('rejects conflicting normalized and legacy role inputs', async () => {
    const { service } = createService(speakerRole);

    await expect(
      service.resolveForWrite('event-id', {
        recipientRoleId: 'speaker-role-id',
        recipientRole: ParticipantRole.PARTICIPANT,
      }),
    ).rejects.toThrow(/conflicts/);
  });

  it('rejects roles from another event', async () => {
    const { prisma, service } = createService(null as never);
    prisma.eventRecipientRole.findFirst.mockResolvedValue(null);

    await expect(
      service.resolveForWrite('event-id', { roleId: 'other-role-id' }),
    ).rejects.toThrow(/does not belong/);
  });

  it('rejects inactive roles', async () => {
    const { service } = createService({
      ...customRole,
      isActive: false,
    });

    await expect(
      service.resolveForWrite('event-id', { roleId: 'vip-role-id' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects non-artifact-eligible roles', async () => {
    const { service } = createService({
      ...customRole,
      isArtifactEligible: false,
    });

    await expect(
      service.resolveForWrite('event-id', { roleId: 'vip-role-id' }),
    ).rejects.toThrow(/not artifact eligible/);
  });
});
