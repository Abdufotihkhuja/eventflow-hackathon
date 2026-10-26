import { BadRequestException, Injectable } from '@nestjs/common';
import {
  BuiltInEventRecipientRoleKey,
  EventRecipientRole,
  EventRecipientRoleAssignmentStatus,
  EventRecipientSourceType,
  EventRecipientStatus,
  ParticipantRole,
  Prisma,
  RegistrationStatus,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { ArtifactRecipientsService } from './artifact-recipients.service';

const INLINE_BACKFILL_LIMIT = 5000;

export type ArtifactRecipientResolveScope = 'ROLE' | 'ALL_ELIGIBLE';

export type ArtifactRecipientResolverInput = {
  eventId: string;
  recipientIds?: string[];
  registrationIds?: string[];
  recipientRoleId?: string;
  recipientRoleIds?: string[];
  roleId?: string;
  roleCode?: string;
  recipientRole?: ParticipantRole;
  scope?: ArtifactRecipientResolveScope;
  requireApprovedRegistration?: boolean;
  requireAttendance?: boolean;
};

export type ArtifactRecipientTarget = {
  recipientId: string;
  recipientRoleId: string;
  roleCode: string;
  roleDisplayName: string;
  builtInKey: BuiltInEventRecipientRoleKey | null;
  assignmentId: string;
  displayName: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  userId: string | null;
  registrationId: string | null;
  speakerId: string | null;
  sourceTypes: EventRecipientSourceType[];
  qrPayload: string;
};

type RoleFilter =
  | { kind: 'all' }
  | { kind: 'roles'; roles: EventRecipientRole[] };

type AssignmentWithRecipient = Prisma.EventRecipientRoleAssignmentGetPayload<{
  include: {
    role: true;
    recipient: {
      include: { sources: true };
    };
  };
}>;

export function legacyRecipientRoleToRoleCode(
  role: ParticipantRole | undefined,
): string {
  return (role ?? ParticipantRole.PARTICIPANT).toLowerCase();
}

export function roleCodeToLegacyRecipientRole(
  code: string,
): ParticipantRole | null {
  const normalized = code.trim().toLowerCase();
  if (normalized === 'participant') return ParticipantRole.PARTICIPANT;
  if (normalized === 'speaker') return ParticipantRole.SPEAKER;
  if (normalized === 'mentor') return ParticipantRole.MENTOR;
  return null;
}

@Injectable()
export class ArtifactRecipientResolverService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly artifactRecipientsService: ArtifactRecipientsService,
  ) {}

  async resolveTargets(
    input: ArtifactRecipientResolverInput,
  ): Promise<ArtifactRecipientTarget[]> {
    await this.ensureNormalizedData(input);
    await this.assertSelectedRecipientsBelongToEvent(input);
    await this.assertSelectedRegistrationsMatch(input);

    const roleFilter = await this.resolveRoleFilter(input);
    const recipientIds = await this.resolveRecipientIdFilter(input);

    const where: Prisma.EventRecipientRoleAssignmentWhereInput = {
      eventId: input.eventId,
      status: EventRecipientRoleAssignmentStatus.ACTIVE,
      recipient: {
        eventId: input.eventId,
        status: EventRecipientStatus.ACTIVE,
        ...(recipientIds ? { id: { in: recipientIds } } : {}),
      },
      role: {
        eventId: input.eventId,
        isActive: true,
        isArtifactEligible: true,
        ...(roleFilter.kind === 'roles'
          ? { id: { in: roleFilter.roles.map((role) => role.id) } }
          : {}),
      },
    };

    const assignments = await this.prisma.eventRecipientRoleAssignment.findMany(
      {
        where,
        include: {
          role: true,
          recipient: {
            include: { sources: { where: { eventId: input.eventId } } },
          },
        },
        orderBy: [
          { role: { sortOrder: 'asc' } },
          { recipient: { displayName: 'asc' } },
          { createdAt: 'asc' },
        ],
      },
    );

    const eligible = await this.applyRegistrationEligibility(
      input,
      assignments,
    );

    this.assertSelectedTargetsMatched(input, eligible);
    return eligible.map((assignment) => this.toTarget(assignment));
  }

  private async ensureNormalizedData(
    input: ArtifactRecipientResolverInput,
  ): Promise<void> {
    await this.artifactRecipientsService.ensureBuiltInRolesForEvent(
      input.eventId,
    );

    const existingRecipients = await this.prisma.eventRecipient.count({
      where: { eventId: input.eventId },
    });
    if (existingRecipients === 0) {
      await this.backfillWithGuard(input.eventId);
      return;
    }

    if (input.registrationIds?.length) {
      const sourceCount = await this.prisma.eventRecipientSource.count({
        where: {
          eventId: input.eventId,
          sourceType: EventRecipientSourceType.REGISTRATION,
          sourceId: { in: input.registrationIds },
        },
      });
      if (sourceCount < new Set(input.registrationIds).size) {
        await this.backfillWithGuard(input.eventId);
      }
    }
  }

  private async backfillWithGuard(eventId: string): Promise<void> {
    const [registrations, speakers] = await this.prisma.$transaction([
      this.prisma.registration.count({ where: { eventId } }),
      this.prisma.speaker.count({ where: { eventId } }),
    ]);
    if (registrations + speakers > INLINE_BACKFILL_LIMIT) {
      throw new BadRequestException(
        'Normalized artifact recipients are missing for this large event. Run the artifact recipients backfill before generating artifacts.',
      );
    }
    await this.artifactRecipientsService.backfillEventRecipients(eventId);
  }

  private async assertSelectedRecipientsBelongToEvent(
    input: ArtifactRecipientResolverInput,
  ): Promise<void> {
    if (!input.recipientIds?.length) return;
    const recipients = await this.prisma.eventRecipient.findMany({
      where: { eventId: input.eventId, id: { in: input.recipientIds } },
      select: { id: true },
    });
    this.assertAllRequestedIdsMatched(
      input.recipientIds,
      recipients.map((recipient) => recipient.id),
      'Selected recipients do not belong to this event',
    );
  }

  private async assertSelectedRegistrationsMatch(
    input: ArtifactRecipientResolverInput,
  ): Promise<void> {
    if (!input.registrationIds?.length) return;
    const where: Prisma.RegistrationWhereInput = {
      eventId: input.eventId,
      id: { in: input.registrationIds },
      ...(input.requireApprovedRegistration && {
        status: RegistrationStatus.APPROVED,
      }),
      ...(input.requireAttendance && {
        attendances: { some: {} },
      }),
    };
    const registrations = await this.prisma.registration.findMany({
      where,
      select: { id: true },
    });
    this.assertAllRequestedIdsMatched(
      input.registrationIds,
      registrations.map((registration) => registration.id),
      'Selected registrations do not match the requested event/status/attendance filters',
    );
  }

  private async resolveRoleFilter(
    input: ArtifactRecipientResolverInput,
  ): Promise<RoleFilter> {
    const recipientRoleIds = [...new Set(input.recipientRoleIds ?? [])];
    if (recipientRoleIds.length > 0) {
      return {
        kind: 'roles',
        roles: await this.findRolesByIds(input.eventId, recipientRoleIds),
      };
    }

    const singleRoleId = input.recipientRoleId ?? input.roleId;
    if (singleRoleId) {
      return {
        kind: 'roles',
        roles: [await this.findRoleById(input.eventId, singleRoleId)],
      };
    }

    if (input.roleCode?.trim()) {
      return {
        kind: 'roles',
        roles: [await this.findRoleByCode(input.eventId, input.roleCode)],
      };
    }

    if (
      input.scope === 'ALL_ELIGIBLE' ||
      (input.recipientIds?.length &&
        !input.registrationIds?.length &&
        !input.recipientRole)
    ) {
      return { kind: 'all' };
    }

    return {
      kind: 'roles',
      roles: [
        await this.findRoleByCode(
          input.eventId,
          legacyRecipientRoleToRoleCode(input.recipientRole),
        ),
      ],
    };
  }

  private async findRolesByIds(
    eventId: string,
    roleIds: string[],
  ): Promise<EventRecipientRole[]> {
    const roles = await this.prisma.eventRecipientRole.findMany({
      where: { id: { in: roleIds }, eventId },
    });
    this.assertAllRequestedIdsMatched(
      roleIds,
      roles.map((role) => role.id),
      'Selected recipient roles do not belong to this event',
    );
    for (const role of roles) {
      this.assertRoleCanTargetArtifacts(role);
    }
    return roles;
  }

  private async findRoleById(
    eventId: string,
    roleId: string,
  ): Promise<EventRecipientRole> {
    const role = await this.prisma.eventRecipientRole.findFirst({
      where: {
        id: roleId,
        eventId,
      },
    });
    if (!role) {
      throw new BadRequestException(
        'Selected recipient role does not belong to this event.',
      );
    }
    this.assertRoleCanTargetArtifacts(role);
    return role;
  }

  private async findRoleByCode(
    eventId: string,
    roleCode: string,
  ): Promise<EventRecipientRole> {
    const normalized = roleCode.trim().toLowerCase();
    const role = await this.prisma.eventRecipientRole.findFirst({
      where: {
        eventId,
        code: normalized,
      },
    });
    if (!role) {
      throw new BadRequestException(
        `Recipient role "${normalized}" does not belong to this event.`,
      );
    }
    this.assertRoleCanTargetArtifacts(role);
    return role;
  }

  private assertRoleCanTargetArtifacts(role: EventRecipientRole): void {
    if (!role.isActive) {
      throw new BadRequestException('Selected recipient role is inactive.');
    }
    if (!role.isArtifactEligible) {
      throw new BadRequestException(
        'Selected recipient role is not artifact eligible.',
      );
    }
  }

  private async resolveRecipientIdFilter(
    input: ArtifactRecipientResolverInput,
  ): Promise<string[] | undefined> {
    const fromRecipients = input.recipientIds ?? [];
    if (!input.registrationIds?.length) {
      return fromRecipients.length ? [...new Set(fromRecipients)] : undefined;
    }

    const sources = await this.prisma.eventRecipientSource.findMany({
      where: {
        eventId: input.eventId,
        sourceType: EventRecipientSourceType.REGISTRATION,
        sourceId: { in: input.registrationIds },
      },
      select: { recipientId: true, sourceId: true },
    });

    this.assertAllRequestedIdsMatched(
      input.registrationIds,
      sources
        .map((source) => source.sourceId)
        .filter((id): id is string => !!id),
      'Selected registrations are not linked to normalized artifact recipients',
    );

    return [
      ...new Set([
        ...fromRecipients,
        ...sources.map((source) => source.recipientId),
      ]),
    ];
  }

  private async applyRegistrationEligibility(
    input: ArtifactRecipientResolverInput,
    assignments: AssignmentWithRecipient[],
  ): Promise<AssignmentWithRecipient[]> {
    const registrationIds = [
      ...new Set(
        assignments
          .map((assignment) => this.registrationSourceId(assignment))
          .filter((id): id is string => !!id),
      ),
    ];
    if (
      registrationIds.length === 0 ||
      (!input.requireApprovedRegistration && !input.requireAttendance)
    ) {
      return assignments;
    }

    const allowed = await this.prisma.registration.findMany({
      where: {
        eventId: input.eventId,
        id: { in: registrationIds },
        ...(input.requireApprovedRegistration && {
          status: RegistrationStatus.APPROVED,
        }),
        ...(input.requireAttendance && {
          attendances: { some: {} },
        }),
      },
      select: { id: true },
    });
    const allowedIds = new Set(allowed.map((registration) => registration.id));

    return assignments.filter((assignment) => {
      const registrationId = this.registrationSourceId(assignment);
      return !registrationId || allowedIds.has(registrationId);
    });
  }

  /**
   * Classify which of the given registrations are APPROVED and which have
   * attendance. Used for *soft* eligibility handling of manually selected
   * recipients (so the UI can show "excluded: N — not approved / not attended"
   * and offer "issue anyway" instead of hard-failing the whole request).
   */
  async classifyRegistrationEligibility(
    eventId: string,
    registrationIds: string[],
  ): Promise<{ approved: Set<string>; attended: Set<string> }> {
    const uniqueIds = [...new Set(registrationIds)];
    if (uniqueIds.length === 0) {
      return { approved: new Set(), attended: new Set() };
    }
    const registrations = await this.prisma.registration.findMany({
      where: { eventId, id: { in: uniqueIds } },
      select: {
        id: true,
        status: true,
        attendances: { select: { id: true }, take: 1 },
      },
    });
    const approved = new Set<string>();
    const attended = new Set<string>();
    for (const registration of registrations) {
      if (registration.status === RegistrationStatus.APPROVED) {
        approved.add(registration.id);
      }
      if (registration.attendances.length > 0) {
        attended.add(registration.id);
      }
    }
    return { approved, attended };
  }

  private assertSelectedTargetsMatched(
    input: ArtifactRecipientResolverInput,
    assignments: AssignmentWithRecipient[],
  ): void {
    if (input.registrationIds?.length) {
      const matchedRegistrationIds = assignments
        .map((assignment) => this.registrationSourceId(assignment))
        .filter((id): id is string => !!id);
      this.assertAllRequestedIdsMatched(
        input.registrationIds,
        matchedRegistrationIds,
        'Selected registrations do not match the requested recipient role filters',
      );
    }

    if (input.recipientIds?.length) {
      const matchedRecipientIds = assignments.map(
        (assignment) => assignment.recipientId,
      );
      this.assertAllRequestedIdsMatched(
        input.recipientIds,
        matchedRecipientIds,
        'Selected recipients do not match the requested recipient role filters',
      );
    }
  }

  private assertAllRequestedIdsMatched(
    requestedIds: string[],
    matchedIds: string[],
    message: string,
  ): void {
    const matched = new Set(matchedIds);
    const invalid = [...new Set(requestedIds)].filter((id) => !matched.has(id));
    if (invalid.length > 0) {
      throw new BadRequestException(`${message}: ${invalid.join(', ')}`);
    }
  }

  private toTarget(
    assignment: AssignmentWithRecipient,
  ): ArtifactRecipientTarget {
    const registrationId = this.registrationSourceId(assignment);
    const speakerId = this.speakerSourceId(assignment);
    const sourceTypes = [
      ...new Set(
        assignment.recipient.sources.map((source) => source.sourceType),
      ),
    ];

    return {
      recipientId: assignment.recipientId,
      recipientRoleId: assignment.roleId,
      roleCode: assignment.role.code,
      roleDisplayName: assignment.role.displayName,
      builtInKey: assignment.role.builtInKey,
      assignmentId: assignment.id,
      displayName: assignment.recipient.displayName,
      firstName: assignment.recipient.firstName,
      lastName: assignment.recipient.lastName,
      email: assignment.recipient.email,
      userId: assignment.recipient.userId,
      registrationId,
      speakerId,
      sourceTypes,
      qrPayload:
        registrationId ??
        speakerId ??
        `${assignment.recipientId}:${assignment.roleId}`,
    };
  }

  private registrationSourceId(
    assignment: AssignmentWithRecipient,
  ): string | null {
    return (
      assignment.recipient.sources.find(
        (source) => source.sourceType === EventRecipientSourceType.REGISTRATION,
      )?.sourceId ?? null
    );
  }

  private speakerSourceId(assignment: AssignmentWithRecipient): string | null {
    return (
      assignment.recipient.sources.find(
        (source) => source.sourceType === EventRecipientSourceType.SPEAKER,
      )?.sourceId ?? null
    );
  }
}
