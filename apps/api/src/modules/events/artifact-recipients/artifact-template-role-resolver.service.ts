import { BadRequestException, Injectable } from '@nestjs/common';
import { EventRecipientRole, ParticipantRole } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { ArtifactRecipientsService } from './artifact-recipients.service';
import {
  legacyRecipientRoleToRoleCode,
  roleCodeToLegacyRecipientRole,
} from './artifact-recipient-resolver.service';

type TemplateRoleInput = {
  recipientRoleId?: string | null;
  roleId?: string | null;
  recipientRole?: string | ParticipantRole | null;
};

export type TemplateRoleResolution = {
  recipientRoleId: string;
  roleCode: string;
  roleDisplayName: string;
  legacyRecipientRole: ParticipantRole | null;
  role: EventRecipientRole;
};

@Injectable()
export class ArtifactTemplateRoleResolverService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly artifactRecipientsService: ArtifactRecipientsService,
  ) {}

  async resolveForWrite(
    eventId: string,
    input: TemplateRoleInput,
    fallback?: {
      recipientRoleId?: string | null;
      recipientRole?: ParticipantRole | null;
    },
  ): Promise<TemplateRoleResolution> {
    await this.artifactRecipientsService.ensureBuiltInRolesForEvent(eventId);

    const normalizedRoleId = (input.recipientRoleId || input.roleId)?.trim();
    const legacyWasSent = input.recipientRole !== undefined;
    const legacyRole = legacyWasSent
      ? this.parseLegacyRecipientRole(input.recipientRole)
      : null;

    if (normalizedRoleId) {
      const role = await this.findRoleById(eventId, normalizedRoleId, true);
      if (legacyRole) {
        this.assertLegacyRoleMatchesNormalizedRole(legacyRole, role);
      }
      return this.toResolution(role);
    }

    if (legacyRole) {
      const role = await this.findRoleByLegacyRecipientRole(
        eventId,
        legacyRole,
        true,
      );
      return this.toResolution(role);
    }

    if (fallback?.recipientRoleId) {
      return this.toResolution(
        await this.findRoleById(eventId, fallback.recipientRoleId, false),
      );
    }

    const fallbackLegacyRole =
      fallback?.recipientRole ?? ParticipantRole.PARTICIPANT;
    return this.toResolution(
      await this.findRoleByLegacyRecipientRole(
        eventId,
        fallbackLegacyRole,
        false,
      ),
    );
  }

  async resolveResponseRole(
    eventId: string,
    roleId: string | null | undefined,
    legacyRole: ParticipantRole,
  ): Promise<TemplateRoleResolution> {
    await this.artifactRecipientsService.ensureBuiltInRolesForEvent(eventId);
    if (roleId) {
      const role = await this.findRoleById(eventId, roleId, false);
      return this.toResolution(role);
    }
    return this.toResolution(
      await this.findRoleByLegacyRecipientRole(eventId, legacyRole, false),
    );
  }

  async findRoleById(
    eventId: string,
    roleId: string,
    requireActiveAndEligible: boolean,
  ): Promise<EventRecipientRole> {
    const role = await this.prisma.eventRecipientRole.findFirst({
      where: { id: roleId, eventId },
    });
    if (!role) {
      throw new BadRequestException(
        'Recipient role does not belong to this event.',
      );
    }
    this.assertRoleCanTargetArtifacts(role, requireActiveAndEligible);
    return role;
  }

  async findRoleByCode(
    eventId: string,
    roleCode: string,
    requireActiveAndEligible: boolean,
  ): Promise<EventRecipientRole> {
    const normalized = roleCode.trim().toLowerCase();
    const role = await this.prisma.eventRecipientRole.findFirst({
      where: { eventId, code: normalized },
    });
    if (!role) {
      throw new BadRequestException(
        `Recipient role "${normalized}" does not belong to this event.`,
      );
    }
    this.assertRoleCanTargetArtifacts(role, requireActiveAndEligible);
    return role;
  }

  toResolution(role: EventRecipientRole): TemplateRoleResolution {
    return {
      recipientRoleId: role.id,
      roleCode: role.code,
      roleDisplayName: role.displayName,
      legacyRecipientRole: roleCodeToLegacyRecipientRole(role.code),
      role,
    };
  }

  private async findRoleByLegacyRecipientRole(
    eventId: string,
    recipientRole: ParticipantRole,
    requireActiveAndEligible: boolean,
  ): Promise<EventRecipientRole> {
    return this.findRoleByCode(
      eventId,
      legacyRecipientRoleToRoleCode(recipientRole),
      requireActiveAndEligible,
    );
  }

  private parseLegacyRecipientRole(
    value: string | ParticipantRole | null | undefined,
  ): ParticipantRole {
    if (!value) return ParticipantRole.PARTICIPANT;
    if (Object.values(ParticipantRole).includes(value as ParticipantRole)) {
      return value as ParticipantRole;
    }
    throw new BadRequestException('Invalid legacy recipientRole value.');
  }

  private assertLegacyRoleMatchesNormalizedRole(
    legacyRole: ParticipantRole,
    normalizedRole: EventRecipientRole,
  ): void {
    const expectedRoleCode = legacyRecipientRoleToRoleCode(legacyRole);
    if (normalizedRole.code !== expectedRoleCode) {
      throw new BadRequestException(
        `recipientRoleId conflicts with legacy recipientRole ${legacyRole}.`,
      );
    }
  }

  private assertRoleCanTargetArtifacts(
    role: EventRecipientRole,
    requireActiveAndEligible: boolean,
  ): void {
    if (!requireActiveAndEligible) return;
    if (!role.isActive) {
      throw new BadRequestException('Recipient role is inactive.');
    }
    if (!role.isArtifactEligible) {
      throw new BadRequestException(
        'Recipient role is not artifact eligible.',
      );
    }
  }
}
