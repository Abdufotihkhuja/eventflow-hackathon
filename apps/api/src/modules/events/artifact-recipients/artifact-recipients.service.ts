import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  BuiltInEventRecipientRoleKey,
  EventRecipientRole,
  EventRecipientRoleAssignmentStatus,
  EventRecipientRoleKind,
  EventRecipientRoleSourceType,
  EventRecipientSourceType,
  EventRecipientStatus,
  ParticipantRole,
  Prisma,
  UserType,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import type { ICurrentUser } from '../../../common/interfaces';
import { pickFallbackTranslation } from '../../translations/dto/business-translation.dto';
import {
  ArtifactTemplateStatus,
  ArtifactTemplateSummaryArtifactType,
  ArtifactTemplateSummaryQueryDto,
  ArtifactRecipientQueryDto,
  AssignArtifactRecipientRoleDto,
  BatchCreateManualArtifactRecipientsDto,
  BatchCreateManualArtifactRecipientsResultDto,
  BatchRecipientOutcome,
  BatchRecipientResultRowDto,
  CreateManualArtifactRecipientDto,
  CreateRecipientRoleDto,
  RecipientRoleDeleteRecommendation,
  UpdateManualArtifactRecipientDto,
  UpdateRecipientRoleDto,
} from './dto';

export const BUILT_IN_RECIPIENT_ROLES = [
  {
    code: 'participant',
    displayName: 'Participant',
    builtInKey: BuiltInEventRecipientRoleKey.PARTICIPANT,
    sortOrder: 10,
    sourceMapping: EventRecipientRoleSourceType.REGISTRATION,
  },
  {
    code: 'speaker',
    displayName: 'Speaker',
    builtInKey: BuiltInEventRecipientRoleKey.SPEAKER,
    sortOrder: 20,
    sourceMapping: EventRecipientRoleSourceType.SPEAKER,
  },
  {
    code: 'mentor',
    displayName: 'Mentor',
    builtInKey: BuiltInEventRecipientRoleKey.MENTOR,
    sortOrder: 25,
    sourceMapping: EventRecipientRoleSourceType.REGISTRATION,
  },
  {
    code: 'staff',
    displayName: 'Staff',
    builtInKey: BuiltInEventRecipientRoleKey.STAFF,
    sortOrder: 30,
    sourceMapping: EventRecipientRoleSourceType.MANUAL,
  },
  {
    code: 'vip',
    displayName: 'VIP',
    builtInKey: BuiltInEventRecipientRoleKey.VIP,
    sortOrder: 40,
    sourceMapping: EventRecipientRoleSourceType.MANUAL,
  },
  {
    code: 'sponsor',
    displayName: 'Sponsor',
    builtInKey: BuiltInEventRecipientRoleKey.SPONSOR,
    sortOrder: 50,
    sourceMapping: EventRecipientRoleSourceType.MANUAL,
  },
  {
    code: 'volunteer',
    displayName: 'Volunteer',
    builtInKey: BuiltInEventRecipientRoleKey.VOLUNTEER,
    sortOrder: 60,
    sourceMapping: EventRecipientRoleSourceType.MANUAL,
  },
  {
    code: 'organizer',
    displayName: 'Organizer',
    builtInKey: BuiltInEventRecipientRoleKey.ORGANIZER,
    sortOrder: 70,
    sourceMapping: EventRecipientRoleSourceType.MANUAL,
  },
] as const;

const BUILT_IN_RECIPIENT_ROLE_CODES: ReadonlySet<string> = new Set(
  BUILT_IN_RECIPIENT_ROLES.map((role) => role.code),
);
const RECIPIENT_ROLE_CODE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type RecipientIdentityInput = {
  eventId: string;
  userId?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  displayName?: string | null;
};

type ArtifactRecipientWithRelations = Prisma.EventRecipientGetPayload<{
  include: {
    sources: true;
    roleAssignments: {
      include: { role: true };
    };
  };
}>;

type ArtifactRecipientRoleAssignmentWithRole =
  Prisma.EventRecipientRoleAssignmentGetPayload<{
    include: { role: true };
  }>;

type ArtifactTemplateSummaryTemplate = {
  id: string;
  eventId: string;
  recipientRoleId: string | null;
  name: string;
  recipientRole: ParticipantRole;
  sizePreset: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type BackfillSummary = {
  registrationRecipients: number;
  speakerRecipients: number;
  duplicateEmailMatchesSkipped: number;
};

@Injectable()
export class ArtifactRecipientsService {
  private readonly logger = new Logger(ArtifactRecipientsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findRecipientRoles(eventId: string, user: ICurrentUser) {
    await this.checkEventAccess(eventId, user);
    await this.ensureBuiltInRolesForEvent(eventId);

    return this.prisma.eventRecipientRole.findMany({
      where: { eventId },
      orderBy: [{ sortOrder: 'asc' }, { displayName: 'asc' }],
    });
  }

  async createRecipientRole(
    eventId: string,
    dto: CreateRecipientRoleDto,
    user: ICurrentUser,
  ) {
    await this.checkEventAccess(eventId, user);
    await this.ensureBuiltInRolesForEvent(eventId);

    const code = this.normalizeRoleCode(dto.code);
    this.assertRoleCodeIsAllowedForCustomRole(code);

    const existingRole = await this.prisma.eventRecipientRole.findUnique({
      where: { eventId_code: { eventId, code } },
      select: { id: true },
    });
    if (existingRole) {
      throw new ConflictException(
        `Recipient role code "${code}" already exists for this event`,
      );
    }

    try {
      // Если фронт прислал translations, scalar displayName — fallback на
      // первую непустую локаль (или на dto.displayName, если все пустые).
      const scalarDisplayName =
        pickFallbackTranslation(dto.translations, 'displayName', dto.displayName) ||
        dto.displayName;
      return await this.prisma.eventRecipientRole.create({
        data: {
          eventId,
          code,
          displayName: this.normalizeDisplayName(scalarDisplayName),
          kind: EventRecipientRoleKind.CUSTOM,
          builtInKey: null,
          sortOrder: dto.sortOrder ?? 0,
          isActive: true,
          isArtifactEligible: dto.isArtifactEligible ?? true,
          sourceMapping: EventRecipientRoleSourceType.MANUAL,
          translations: (dto.translations ?? {}) as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          `Recipient role code "${code}" already exists for this event`,
        );
      }
      throw error;
    }
  }

  async updateRecipientRole(
    eventId: string,
    roleId: string,
    dto: UpdateRecipientRoleDto,
    user: ICurrentUser,
  ) {
    await this.checkEventAccess(eventId, user);
    this.assertNoImmutableRoleFields(dto);

    const role = await this.findRoleForEvent(eventId, roleId);
    this.assertCustomRole(role, 'Built-in recipient roles cannot be edited');

    const data: Prisma.EventRecipientRoleUpdateInput = {};
    // Translations + scalar displayName fallback (если пришли translations
    // но не scalar — пересчитываем scalar для согласованности).
    if (dto.translations !== undefined) {
      data.translations = dto.translations as Prisma.InputJsonValue;
      if (dto.displayName === undefined) {
        const fallback = pickFallbackTranslation(
          dto.translations,
          'displayName',
          role.displayName,
        );
        if (fallback) data.displayName = this.normalizeDisplayName(fallback);
      }
    }
    if (dto.displayName !== undefined) {
      data.displayName = this.normalizeDisplayName(dto.displayName);
    }
    if (dto.sortOrder !== undefined) {
      data.sortOrder = dto.sortOrder;
    }
    if (dto.isArtifactEligible !== undefined) {
      data.isArtifactEligible = dto.isArtifactEligible;
    }

    if (Object.keys(data).length === 0) {
      return role;
    }

    return this.prisma.eventRecipientRole.update({
      where: { id: role.id },
      data,
    });
  }

  async deactivateRecipientRole(
    eventId: string,
    roleId: string,
    user: ICurrentUser,
  ) {
    await this.checkEventAccess(eventId, user);
    const role = await this.findRoleForEvent(eventId, roleId);
    this.assertCustomRole(role, 'Built-in recipient roles cannot be deactivated');

    return this.prisma.eventRecipientRole.update({
      where: { id: role.id },
      data: { isActive: false },
    });
  }

  async activateRecipientRole(
    eventId: string,
    roleId: string,
    user: ICurrentUser,
  ) {
    await this.checkEventAccess(eventId, user);
    const role = await this.findRoleForEvent(eventId, roleId);
    this.assertCustomRole(role, 'Built-in recipient roles cannot be activated through this endpoint');

    return this.prisma.eventRecipientRole.update({
      where: { id: role.id },
      data: { isActive: true },
    });
  }

  async previewRecipientRoleDelete(
    eventId: string,
    roleId: string,
    user: ICurrentUser,
  ) {
    await this.checkEventAccess(eventId, user);
    const role = await this.findRoleForEvent(eventId, roleId);

    const [
      activeAssignments,
      inactiveAssignments,
      certificateTemplates,
      badgeTemplates,
      certificates,
    ] = await this.prisma.$transaction([
      this.prisma.eventRecipientRoleAssignment.count({
        where: {
          eventId,
          roleId,
          status: EventRecipientRoleAssignmentStatus.ACTIVE,
        },
      }),
      this.prisma.eventRecipientRoleAssignment.count({
        where: {
          eventId,
          roleId,
          status: EventRecipientRoleAssignmentStatus.INACTIVE,
        },
      }),
      this.prisma.certificateTemplate.count({
        where: { eventId, recipientRoleId: roleId },
      }),
      this.prisma.badgeTemplate.count({
        where: { eventId, recipientRoleId: roleId },
      }),
      this.prisma.certificate.count({
        where: { eventId, recipientRoleId: roleId },
      }),
    ]);

    const blockingReasons: string[] = [];
    if (role.kind === EventRecipientRoleKind.BUILT_IN || role.builtInKey) {
      blockingReasons.push('Built-in recipient roles cannot be deleted');
    }
    if (activeAssignments > 0) {
      blockingReasons.push('Role has active recipient assignments');
    }
    if (inactiveAssignments > 0) {
      blockingReasons.push('Role has historical recipient assignments');
    }
    if (certificateTemplates > 0) {
      blockingReasons.push('Role is used by certificate templates');
    }
    if (badgeTemplates > 0) {
      blockingReasons.push('Role is used by badge templates');
    }
    if (certificates > 0) {
      blockingReasons.push('Role is used by generated certificates');
    }

    let recommendedAction = RecipientRoleDeleteRecommendation.SAFE_TO_DELETE;
    if (role.kind === EventRecipientRoleKind.BUILT_IN || role.builtInKey) {
      recommendedAction = RecipientRoleDeleteRecommendation.BLOCKED;
    } else if (blockingReasons.length > 0) {
      recommendedAction = role.isActive
        ? RecipientRoleDeleteRecommendation.DEACTIVATE
        : RecipientRoleDeleteRecommendation.BLOCKED;
    }

    return {
      roleId: role.id,
      code: role.code,
      displayName: role.displayName,
      isBuiltIn: role.kind === EventRecipientRoleKind.BUILT_IN || !!role.builtInKey,
      counts: {
        activeAssignments,
        inactiveAssignments,
        certificateTemplates,
        badgeTemplates,
        certificates,
      },
      recommendedAction,
      blockingReasons,
    };
  }

  async getArtifactTemplateSummary(
    eventId: string,
    query: ArtifactTemplateSummaryQueryDto,
    user: ICurrentUser,
  ) {
    await this.checkEventAccess(eventId, user);
    await this.ensureBuiltInRolesForEvent(eventId);

    const includeInactiveRoles = query.includeInactiveRoles === true;
    const includeInactiveTemplates = query.includeInactiveTemplates === true;
    const includeCertificates =
      !query.artifactType ||
      query.artifactType === ArtifactTemplateSummaryArtifactType.CERTIFICATE;
    const includeBadges =
      !query.artifactType ||
      query.artifactType === ArtifactTemplateSummaryArtifactType.BADGE;

    const roles = await this.prisma.eventRecipientRole.findMany({
      where: {
        eventId,
        ...(includeInactiveRoles ? {} : { isActive: true }),
      },
      orderBy: [{ sortOrder: 'asc' }, { displayName: 'asc' }, { code: 'asc' }],
    });

    const [certificateTemplates, badgeTemplates] = await Promise.all([
      includeCertificates
        ? this.prisma.certificateTemplate.findMany({ where: { eventId } })
        : Promise.resolve([]),
      includeBadges
        ? this.prisma.badgeTemplate.findMany({ where: { eventId } })
        : Promise.resolve([]),
    ]);

    const rows = await Promise.all(
      roles.map(async (role) => {
        const [assignmentCount, activeAssignmentCount] = await Promise.all([
          this.prisma.eventRecipientRoleAssignment.count({
            where: { eventId, roleId: role.id },
          }),
          this.prisma.eventRecipientRoleAssignment.count({
            where: {
              eventId,
              roleId: role.id,
              status: EventRecipientRoleAssignmentStatus.ACTIVE,
            },
          }),
        ]);

        return {
          roleId: role.id,
          roleCode: role.code,
          roleDisplayName: role.displayName,
          roleTranslations: role.translations ?? null,
          builtInKey: role.builtInKey,
          kind: role.kind,
          sortOrder: role.sortOrder,
          isActive: role.isActive,
          isArtifactEligible: role.isArtifactEligible,
          assignmentCount,
          activeAssignmentCount,
          ...(includeCertificates
            ? {
                certificateTemplateSummary: this.buildTemplateTypeSummary(
                  role,
                  certificateTemplates,
                  includeInactiveTemplates,
                ),
              }
            : {}),
          ...(includeBadges
            ? {
                badgeTemplateSummary: this.buildTemplateTypeSummary(
                  role,
                  badgeTemplates,
                  includeInactiveTemplates,
                ),
              }
            : {}),
        };
      }),
    );

    return { roles: rows };
  }

  async createManualArtifactRecipient(
    eventId: string,
    dto: CreateManualArtifactRecipientDto,
    user: ICurrentUser,
  ) {
    await this.checkEventAccess(eventId, user);
    await this.backfillEventRecipients(eventId);

    const displayName = this.normalizeRecipientDisplayName(dto.displayName);
    const email = this.normalizeNullableString(dto.email);
    const emailNormalized = this.normalizeEmail(email);
    const roleIds = await this.resolveArtifactEligibleRoleIds(eventId, {
      roleIds: dto.roleIds,
      roleCodes: dto.roleCodes,
    });

    const recipientMatch = await this.findReusableManualRecipient({
      eventId,
      userId: dto.userId ?? null,
      emailNormalized,
    });

    let recipientId = recipientMatch?.id;
    let created = false;

    if (!recipientId) {
      const createdRecipient = await this.prisma.eventRecipient.create({
        data: {
          eventId,
          userId: dto.userId ?? null,
          displayName,
          firstName: this.normalizeNullableString(dto.firstName),
          lastName: this.normalizeNullableString(dto.lastName),
          email,
          emailNormalized,
          status: EventRecipientStatus.ACTIVE,
        },
        select: { id: true },
      });
      recipientId = createdRecipient.id;
      created = true;
    } else {
      await this.applySafeManualRecipientIdentity(
        recipientId,
        dto.userId ?? null,
        email,
        emailNormalized,
      );
    }

    await this.ensureManualRecipientSource({
      eventId,
      recipientId,
      sourceType: emailNormalized
        ? EventRecipientSourceType.EMAIL
        : EventRecipientSourceType.MANUAL,
      emailSnapshot: email,
      nameSnapshot: displayName,
    });

    for (const roleId of roleIds) {
      await this.ensureRoleAssignment({
        eventId,
        recipientId,
        roleId,
        sourceType: EventRecipientRoleSourceType.MANUAL,
        sourceId: null,
      });
    }

    return {
      recipient: await this.findRecipientResponse(eventId, recipientId),
      created,
      reused: !created,
    };
  }

  async batchCreateManualArtifactRecipients(
    eventId: string,
    dto: BatchCreateManualArtifactRecipientsDto,
    user: ICurrentUser,
  ): Promise<BatchCreateManualArtifactRecipientsResultDto> {
    // Single access check + backfill up front; per-row calls skip the access
    // re-check via the existing public method but stay correct because we
    // already validated event access for the user.
    await this.checkEventAccess(eventId, user);
    await this.backfillEventRecipients(eventId);

    const results: BatchRecipientResultRowDto[] = [];
    let createdCount = 0;
    let reusedCount = 0;
    let failedCount = 0;

    const defaultRoleCodes = dto.defaultRoleCodes?.filter(
      (code) => typeof code === 'string' && code.length > 0,
    );

    // Per-batch dedup. Without this, two rows that point at the same person inside the same
    // Excel file (or a re-upload of the same file) silently become two separate recipients:
    // `findReusableManualRecipient` only matches by email/userId, and the typical Excel pours in
    // people with no email at all (e.g. volunteers Ozodbek / Muhammadsiddiq from the screenshot).
    // We coalesce by `email_normalized` when present, otherwise by a lowercased displayName, and
    // mark the second/third occurrence as REUSED pointing at the recipient created from the first.
    const batchSeen = new Map<string, BatchRecipientResultRowDto['recipient']>();
    const batchKeyFor = (row: CreateManualArtifactRecipientDto): string | null => {
      const email = this.normalizeEmail(this.normalizeNullableString(row.email));
      if (email) return `email:${email}`;
      const displayName =
        row.displayName ??
        [row.firstName, row.lastName].filter(Boolean).join(' ').trim();
      const dn = displayName.trim().toLowerCase().replace(/\s+/g, ' ');
      if (!dn) return null;
      // Scope by userId when present so two manual rows with the same name but different
      // bound users stay distinct.
      return `name:${row.userId ?? '_'}:${dn}`;
    };

    for (let index = 0; index < dto.recipients.length; index += 1) {
      const row = dto.recipients[index];
      try {
        const effectiveRow: CreateManualArtifactRecipientDto = {
          ...row,
          // Apply default role codes when the row has no roles of its own.
          ...((!row.roleIds || row.roleIds.length === 0) &&
          (!row.roleCodes || row.roleCodes.length === 0) &&
          defaultRoleCodes &&
          defaultRoleCodes.length > 0
            ? { roleCodes: defaultRoleCodes }
            : {}),
        };

        const key = batchKeyFor(effectiveRow);
        if (key && batchSeen.has(key)) {
          // Duplicate within this batch — point at the already-created recipient and report
          // REUSED so the UI can show an honest "новых X, повторно Y" breakdown.
          const recipient = batchSeen.get(key)!;
          reusedCount += 1;
          results.push({
            index,
            outcome: BatchRecipientOutcome.REUSED,
            recipient,
            error: null,
          });
          continue;
        }

        const result = await this.createManualArtifactRecipient(
          eventId,
          effectiveRow,
          user,
        );

        if (key) batchSeen.set(key, result.recipient);

        if (result.created) {
          createdCount += 1;
          results.push({
            index,
            outcome: BatchRecipientOutcome.CREATED,
            recipient: result.recipient,
            error: null,
          });
        } else {
          reusedCount += 1;
          results.push({
            index,
            outcome: BatchRecipientOutcome.REUSED,
            recipient: result.recipient,
            error: null,
          });
        }
      } catch (err) {
        failedCount += 1;
        const message =
          err instanceof Error
            ? err.message
            : 'Failed to create recipient';
        this.logger.warn(
          `[batchCreateManualArtifactRecipients] row ${index} failed: ${message}`,
        );
        results.push({
          index,
          outcome: BatchRecipientOutcome.FAILED,
          recipient: null,
          error: message,
        });
      }
    }

    return { results, createdCount, reusedCount, failedCount };
  }

  async updateManualArtifactRecipient(
    eventId: string,
    recipientId: string,
    dto: UpdateManualArtifactRecipientDto,
    user: ICurrentUser,
  ) {
    await this.checkEventAccess(eventId, user);

    const recipient = await this.findRecipientForEvent(eventId, recipientId);
    const data: Prisma.EventRecipientUpdateInput = {};

    if (dto.displayName !== undefined) {
      data.displayName = this.normalizeRecipientDisplayName(dto.displayName);
    }
    if (dto.firstName !== undefined) {
      data.firstName = this.normalizeNullableString(dto.firstName);
    }
    if (dto.lastName !== undefined) {
      data.lastName = this.normalizeNullableString(dto.lastName);
    }
    if (dto.status !== undefined) {
      data.status = dto.status;
      data.archivedAt =
        dto.status === EventRecipientStatus.ARCHIVED ? new Date() : null;
    }
    if (dto.email !== undefined) {
      const email = this.normalizeNullableString(dto.email);
      const emailNormalized = this.normalizeEmail(email);
      await this.assertEmailUpdateDoesNotConflict({
        eventId,
        recipientId,
        emailNormalized,
      });
      data.email = email;
      data.emailNormalized = emailNormalized;
    }

    if (Object.keys(data).length > 0) {
      await this.prisma.eventRecipient.update({
        where: { id: recipient.id },
        data,
      });
    }

    return this.findRecipientResponse(eventId, recipientId);
  }

  async assignRoleToArtifactRecipient(
    eventId: string,
    recipientId: string,
    dto: AssignArtifactRecipientRoleDto,
    user: ICurrentUser,
  ) {
    await this.checkEventAccess(eventId, user);
    await this.ensureBuiltInRolesForEvent(eventId);
    await this.findRecipientForEvent(eventId, recipientId);

    const role = await this.resolveSingleArtifactEligibleRole(eventId, dto);
    const assignment = await this.ensureRoleAssignment({
      eventId,
      recipientId,
      roleId: role.id,
      sourceType: EventRecipientRoleSourceType.MANUAL,
      sourceId: null,
    });

    return {
      recipient: await this.findRecipientResponse(eventId, recipientId),
      assignment: this.toAssignmentSummary(assignment),
    };
  }

  async deactivateRoleForArtifactRecipient(
    eventId: string,
    recipientId: string,
    roleId: string,
    user: ICurrentUser,
  ) {
    await this.checkEventAccess(eventId, user);
    await this.findRecipientForEvent(eventId, recipientId);
    await this.findRoleForEvent(eventId, roleId);

    const assignment =
      await this.prisma.eventRecipientRoleAssignment.findFirst({
        where: { eventId, recipientId, roleId },
        include: { role: true },
      });

    if (!assignment) {
      throw new NotFoundException(
        'Recipient role assignment not found for this event',
      );
    }

    this.assertAssignmentCanBeDeactivated(assignment);

    const updatedAssignment =
      await this.prisma.eventRecipientRoleAssignment.update({
        where: { id: assignment.id },
        data: { status: EventRecipientRoleAssignmentStatus.INACTIVE },
        include: { role: true },
      });

    return {
      recipient: await this.findRecipientResponse(eventId, recipientId),
      assignment: this.toAssignmentSummary(updatedAssignment),
    };
  }

  async findArtifactRecipients(
    eventId: string,
    query: ArtifactRecipientQueryDto,
    user: ICurrentUser,
  ) {
    await this.checkEventAccess(eventId, user);

    const page = query.page ?? 1;
    // Later pages of the same list were preceded by page 1, which already
    // synced recipients from registrations and speakers.
    if (page === 1) {
      await this.backfillEventRecipients(eventId);
    }

    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const roleCode = query.roleCode?.trim().toLowerCase();

    const where: Prisma.EventRecipientWhereInput = {
      eventId,
      ...(query.status && { status: query.status }),
      ...(query.search && {
        OR: [
          { displayName: { contains: query.search, mode: 'insensitive' } },
          { firstName: { contains: query.search, mode: 'insensitive' } },
          { lastName: { contains: query.search, mode: 'insensitive' } },
          { email: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
      ...((query.roleId || roleCode) && {
        roleAssignments: {
          some: {
            eventId,
            status: EventRecipientRoleAssignmentStatus.ACTIVE,
            ...(query.roleId && { roleId: query.roleId }),
            role: {
              eventId,
              ...(roleCode && { code: roleCode }),
            },
          },
        },
      }),
    };

    const [recipients, total] = await this.prisma.$transaction([
      this.prisma.eventRecipient.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ displayName: 'asc' }, { createdAt: 'asc' }],
        include: {
          sources: {
            where: { eventId },
          },
          roleAssignments: {
            where: {
              eventId,
              status: EventRecipientRoleAssignmentStatus.ACTIVE,
              role: { eventId },
            },
            include: { role: true },
            orderBy: { role: { sortOrder: 'asc' } },
          },
        },
      }),
      this.prisma.eventRecipient.count({ where }),
    ]);

    return {
      data: recipients.map((recipient) => ({
        ...this.toArtifactRecipientDto(recipient),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Syncs recipients, sources and role assignments from the event's
   * registrations and speakers. Runs before reads and writes of the recipient
   * list, so it must stay cheap when nothing changed: current state is loaded
   * in a few set-based queries, compared in memory, and only missing or
   * drifted rows are written.
   */
  async backfillEventRecipients(eventId: string): Promise<BackfillSummary> {
    const builtInRoles = await this.ensureBuiltInRolesForEvent(eventId);
    const participantRole = builtInRoles.get('participant');
    const speakerRole = builtInRoles.get('speaker');
    const mentorRole = builtInRoles.get('mentor');
    if (!participantRole || !speakerRole || !mentorRole) {
      throw new Error('Built-in artifact recipient roles were not created');
    }

    const userSelect = {
      select: { id: true, firstName: true, lastName: true, email: true },
    } as const;
    const [registrations, speakers, recipients, sources, assignments] =
      await Promise.all([
        this.prisma.registration.findMany({
          where: { eventId },
          include: { user: userSelect },
          orderBy: { createdAt: 'asc' },
        }),
        this.prisma.speaker.findMany({
          where: { eventId },
          include: { user: userSelect },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        }),
        this.prisma.eventRecipient.findMany({
          where: { eventId },
          select: {
            id: true,
            userId: true,
            firstName: true,
            lastName: true,
            email: true,
            emailNormalized: true,
            displayName: true,
          },
        }),
        this.prisma.eventRecipientSource.findMany({
          where: {
            eventId,
            sourceType: {
              in: [
                EventRecipientSourceType.REGISTRATION,
                EventRecipientSourceType.SPEAKER,
              ],
            },
          },
          select: { sourceType: true, sourceId: true, recipientId: true },
        }),
        this.prisma.eventRecipientRoleAssignment.findMany({
          where: { eventId },
          select: { recipientId: true, roleId: true, status: true },
        }),
      ]);

    const recipientsByUserId = new Map(
      recipients.flatMap((recipient) =>
        recipient.userId ? [[recipient.userId, recipient] as const] : [],
      ),
    );
    const sourceKey = (sourceType: EventRecipientSourceType, sourceId: string) =>
      `${sourceType}:${sourceId}`;
    const sourceRecipientIds = new Map(
      sources.map((source) => [
        sourceKey(source.sourceType, source.sourceId ?? ''),
        source.recipientId,
      ]),
    );
    const activeAssignments = new Set(
      assignments
        .filter(
          (assignment) =>
            assignment.status === EventRecipientRoleAssignmentStatus.ACTIVE,
        )
        .map((assignment) => `${assignment.recipientId}:${assignment.roleId}`),
    );

    const ensureSourceIfMissing = async (
      input: Parameters<ArtifactRecipientsService['ensureSource']>[0],
    ) => {
      if (sourceRecipientIds.has(sourceKey(input.sourceType, input.sourceId))) {
        return;
      }
      await this.ensureSource(input);
    };
    const ensureRoleAssignmentIfMissing = async (
      input: Parameters<ArtifactRecipientsService['ensureRoleAssignment']>[0],
    ) => {
      if (activeAssignments.has(`${input.recipientId}:${input.roleId}`)) {
        return;
      }
      await this.ensureRoleAssignment(input);
    };

    let registrationRecipients = 0;
    let speakerRecipients = 0;
    let duplicateEmailMatchesSkipped = 0;

    for (const registration of registrations) {
      const identity: RecipientIdentityInput = {
        eventId,
        userId: registration.userId,
        firstName: registration.user.firstName,
        lastName: registration.user.lastName,
        email: registration.user.email,
      };

      // A known user-linked recipient only needs its identity snapshot kept
      // fresh; anything else goes through the full lookup with email merge.
      const known = recipientsByUserId.get(registration.userId);
      if (known) {
        await this.syncRecipientIdentityFromUser(known, identity);
      }
      const recipient = known
        ? { id: known.id, created: false, duplicateEmailMatchSkipped: false }
        : await this.findOrCreateRecipient(identity);
      duplicateEmailMatchesSkipped += recipient.duplicateEmailMatchSkipped ? 1 : 0;
      registrationRecipients += recipient.created ? 1 : 0;

      await ensureSourceIfMissing({
        eventId,
        recipientId: recipient.id,
        sourceType: EventRecipientSourceType.REGISTRATION,
        sourceId: registration.id,
        emailSnapshot: registration.user.email,
        nameSnapshot: this.buildDisplayName(identity),
      });
      await ensureRoleAssignmentIfMissing({
        eventId,
        recipientId: recipient.id,
        roleId: participantRole.id,
        sourceType: EventRecipientRoleSourceType.REGISTRATION,
        sourceId: registration.id,
      });

      if (registration.role === ParticipantRole.SPEAKER) {
        await ensureRoleAssignmentIfMissing({
          eventId,
          recipientId: recipient.id,
          roleId: speakerRole.id,
          sourceType: EventRecipientRoleSourceType.REGISTRATION,
          sourceId: registration.id,
        });
      }

      if (registration.role === ParticipantRole.MENTOR) {
        await ensureRoleAssignmentIfMissing({
          eventId,
          recipientId: recipient.id,
          roleId: mentorRole.id,
          sourceType: EventRecipientRoleSourceType.REGISTRATION,
          sourceId: registration.id,
        });
      }
    }

    for (const speaker of speakers) {
      const existingRecipientId = sourceRecipientIds.get(
        sourceKey(EventRecipientSourceType.SPEAKER, speaker.id),
      );

      const speakerEmail = speaker.invitedEmail ?? speaker.user?.email ?? null;
      const displayName = this.buildDisplayName({
        firstName: speaker.firstName,
        lastName: speaker.lastName,
        email: speakerEmail,
      });

      const recipient = existingRecipientId
        ? { id: existingRecipientId, created: false, duplicateEmailMatchSkipped: false }
        : await this.findOrCreateRecipient({
            eventId,
            userId: speaker.userId,
            firstName: speaker.firstName ?? speaker.user?.firstName,
            lastName: speaker.lastName ?? speaker.user?.lastName,
            email: speakerEmail,
            displayName,
          });

      duplicateEmailMatchesSkipped += recipient.duplicateEmailMatchSkipped ? 1 : 0;
      speakerRecipients += recipient.created ? 1 : 0;

      await ensureSourceIfMissing({
        eventId,
        recipientId: recipient.id,
        sourceType: EventRecipientSourceType.SPEAKER,
        sourceId: speaker.id,
        emailSnapshot: speakerEmail,
        nameSnapshot: displayName,
      });
      await ensureRoleAssignmentIfMissing({
        eventId,
        recipientId: recipient.id,
        roleId: speakerRole.id,
        sourceType: EventRecipientRoleSourceType.SPEAKER,
        sourceId: speaker.id,
      });
    }

    return {
      registrationRecipients,
      speakerRecipients,
      duplicateEmailMatchesSkipped,
    };
  }

  async ensureBuiltInRolesForEvent(
    eventId: string,
  ): Promise<Map<string, EventRecipientRole>> {
    const roles = new Map<string, EventRecipientRole>();

    for (const role of BUILT_IN_RECIPIENT_ROLES) {
      const savedRole = await this.prisma.eventRecipientRole.upsert({
        where: {
          eventId_code: {
            eventId,
            code: role.code,
          },
        },
        create: {
          eventId,
          code: role.code,
          displayName: role.displayName,
          kind: EventRecipientRoleKind.BUILT_IN,
          builtInKey: role.builtInKey,
          sortOrder: role.sortOrder,
          isActive: true,
          isArtifactEligible: true,
          sourceMapping: role.sourceMapping,
        },
        update: {
          displayName: role.displayName,
          kind: EventRecipientRoleKind.BUILT_IN,
          builtInKey: role.builtInKey,
          sortOrder: role.sortOrder,
          isActive: true,
          isArtifactEligible: true,
          sourceMapping: role.sourceMapping,
        },
      });
      roles.set(savedRole.code, savedRole);
    }

    return roles;
  }

  private buildTemplateTypeSummary(
    role: EventRecipientRole,
    templates: ArtifactTemplateSummaryTemplate[],
    includeInactiveTemplates: boolean,
  ) {
    const matchedTemplates = this.findTemplatesForRole(role, templates);
    const activeTemplates = matchedTemplates.filter((template) => template.isActive);
    const inactiveTemplates = matchedTemplates.filter(
      (template) => !template.isActive,
    );
    const activeDefaultTemplates = activeTemplates.filter(
      (template) => template.isDefault,
    );
    const defaultTemplate = activeDefaultTemplates[0] ?? null;

    const duplicateActiveDefaultCount =
      activeDefaultTemplates.length > 1
        ? activeDefaultTemplates.length
        : 0;
    const templateStatus = this.resolveTemplateStatus(
      role,
      activeDefaultTemplates.length,
    );

    return {
      defaultTemplateId: defaultTemplate?.id ?? null,
      defaultTemplateName: defaultTemplate?.name ?? null,
      hasActiveDefault: activeDefaultTemplates.length > 0,
      activeTemplateCount: activeTemplates.length,
      inactiveTemplateCount: inactiveTemplates.length,
      duplicateActiveDefaultCount,
      missingTemplate: templateStatus === ArtifactTemplateStatus.MISSING,
      templateStatus,
      templates: matchedTemplates
        .filter((template) => includeInactiveTemplates || template.isActive)
        .map((template) => this.toTemplateSummaryTemplate(role, template)),
    };
  }

  private findTemplatesForRole(
    role: EventRecipientRole,
    templates: ArtifactTemplateSummaryTemplate[],
  ) {
    const legacyRole = this.roleCodeToLegacyRecipientRole(role.code);
    return templates
      .filter((template) => {
        if (template.recipientRoleId) {
          return template.recipientRoleId === role.id;
        }
        return legacyRole ? template.recipientRole === legacyRole : false;
      })
      .sort((a, b) => {
        if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
        if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
        return a.createdAt.getTime() - b.createdAt.getTime();
      });
  }

  private resolveTemplateStatus(
    role: EventRecipientRole,
    activeDefaultCount: number,
  ): ArtifactTemplateStatus {
    if (!role.isActive) {
      return ArtifactTemplateStatus.INACTIVE_ROLE;
    }
    if (!role.isArtifactEligible) {
      return ArtifactTemplateStatus.NOT_ARTIFACT_ELIGIBLE;
    }
    if (activeDefaultCount > 1) {
      return ArtifactTemplateStatus.DUPLICATE_DEFAULT;
    }
    if (activeDefaultCount === 1) {
      return ArtifactTemplateStatus.READY;
    }
    return ArtifactTemplateStatus.MISSING;
  }

  private roleCodeToLegacyRecipientRole(code: string): ParticipantRole | null {
    const normalized = code.trim().toLowerCase();
    if (normalized === 'participant') return ParticipantRole.PARTICIPANT;
    if (normalized === 'speaker') return ParticipantRole.SPEAKER;
    if (normalized === 'mentor') return ParticipantRole.MENTOR;
    return null;
  }

  private toTemplateSummaryTemplate(
    role: EventRecipientRole,
    template: ArtifactTemplateSummaryTemplate,
  ) {
    return {
      id: template.id,
      name: template.name,
      isDefault: template.isDefault,
      isActive: template.isActive,
      recipientRoleId: template.recipientRoleId,
      roleCode: role.code,
      roleDisplayName: role.displayName,
      recipientRole: template.recipientRole,
      sizePreset: template.sizePreset,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    };
  }

  private async findReusableManualRecipient(input: {
    eventId: string;
    userId: string | null;
    emailNormalized: string | null;
  }): Promise<{ id: string } | null> {
    if (input.userId) {
      const byUser = await this.prisma.eventRecipient.findUnique({
        where: {
          eventId_userId: {
            eventId: input.eventId,
            userId: input.userId,
          },
        },
        select: { id: true },
      });
      if (byUser) {
        return byUser;
      }
    }

    if (!input.emailNormalized) {
      return null;
    }

    const matches = await this.prisma.eventRecipient.findMany({
      where: {
        eventId: input.eventId,
        emailNormalized: input.emailNormalized,
        status: EventRecipientStatus.ACTIVE,
      },
      select: { id: true, userId: true },
      orderBy: { createdAt: 'asc' },
    });
    const hasConflictingUserMatch = matches.some(
      (match) =>
        match.userId && (!input.userId || match.userId !== input.userId),
    );
    if (hasConflictingUserMatch) {
      return null;
    }

    const safeMatches = matches.filter((match) => {
      if (!match.userId) {
        return true;
      }
      return input.userId ? match.userId === input.userId : false;
    });

    return safeMatches.length === 1 ? { id: safeMatches[0].id } : null;
  }

  private async applySafeManualRecipientIdentity(
    recipientId: string,
    userId: string | null,
    email: string | null,
    emailNormalized: string | null,
  ): Promise<void> {
    const recipient = await this.prisma.eventRecipient.findUnique({
      where: { id: recipientId },
      select: { userId: true, emailNormalized: true },
    });
    if (!recipient) {
      throw new NotFoundException('Artifact recipient not found for this event');
    }

    const data: Prisma.EventRecipientUpdateInput = {};
    if (userId && !recipient.userId) {
      data.user = { connect: { id: userId } };
    }
    if (emailNormalized && !recipient.emailNormalized) {
      data.email = email;
      data.emailNormalized = emailNormalized;
    }
    if (Object.keys(data).length > 0) {
      await this.prisma.eventRecipient.update({
        where: { id: recipientId },
        data,
      });
    }
  }

  private async assertEmailUpdateDoesNotConflict(input: {
    eventId: string;
    recipientId: string;
    emailNormalized: string | null;
  }): Promise<void> {
    if (!input.emailNormalized) {
      return;
    }

    const conflictingRecipient = await this.prisma.eventRecipient.findFirst({
      where: {
        eventId: input.eventId,
        emailNormalized: input.emailNormalized,
        id: { not: input.recipientId },
      },
      select: { id: true },
    });
    if (conflictingRecipient) {
      throw new ConflictException(
        'Recipient email conflicts with another recipient in this event',
      );
    }
  }

  private async resolveArtifactEligibleRoleIds(
    eventId: string,
    input: { roleIds?: string[]; roleCodes?: string[] },
  ): Promise<string[]> {
    const roleIds = [...new Set(input.roleIds ?? [])];
    const roleCodes = [
      ...new Set((input.roleCodes ?? []).map((code) => this.normalizeRoleCode(code))),
    ];

    if (roleIds.length === 0 && roleCodes.length === 0) {
      return [];
    }

    const roles = await this.prisma.eventRecipientRole.findMany({
      where: {
        eventId,
        OR: [
          ...(roleIds.length > 0 ? [{ id: { in: roleIds } }] : []),
          ...(roleCodes.length > 0 ? [{ code: { in: roleCodes } }] : []),
        ],
      },
    });
    const foundRoleIds = new Set(roles.map((role) => role.id));
    const foundRoleCodes = new Set(roles.map((role) => role.code));
    const hasMissingRole =
      roleIds.some((roleId) => !foundRoleIds.has(roleId)) ||
      roleCodes.some((roleCode) => !foundRoleCodes.has(roleCode));
    if (hasMissingRole) {
      throw new BadRequestException(
        'One or more recipient roles do not belong to this event',
      );
    }

    for (const role of roles) {
      this.assertRoleCanBeAssignedToArtifactRecipient(role);
    }

    return [...new Set(roles.map((role) => role.id))];
  }

  private async resolveSingleArtifactEligibleRole(
    eventId: string,
    dto: AssignArtifactRecipientRoleDto,
  ): Promise<EventRecipientRole> {
    if ((dto.roleId ? 1 : 0) + (dto.roleCode ? 1 : 0) !== 1) {
      throw new BadRequestException('Provide exactly one of roleId or roleCode');
    }

    const role = dto.roleId
      ? await this.findRoleForEvent(eventId, dto.roleId)
      : await this.findRoleForEventByCode(eventId, dto.roleCode as string);

    this.assertRoleCanBeAssignedToArtifactRecipient(role);
    return role;
  }

  private assertRoleCanBeAssignedToArtifactRecipient(
    role: EventRecipientRole,
  ): void {
    if (!role.isActive) {
      throw new BadRequestException('Recipient role is inactive');
    }
    if (!role.isArtifactEligible) {
      throw new BadRequestException(
        'Recipient role is not artifact eligible',
      );
    }
  }

  private assertAssignmentCanBeDeactivated(
    assignment: ArtifactRecipientRoleAssignmentWithRole,
  ): void {
    if (
      assignment.status === EventRecipientRoleAssignmentStatus.ACTIVE &&
      (assignment.sourceType === EventRecipientRoleSourceType.REGISTRATION ||
        assignment.sourceType === EventRecipientRoleSourceType.SPEAKER)
    ) {
      throw new BadRequestException(
        'Source-backed participant or speaker role assignments cannot be removed through manual recipient APIs',
      );
    }
  }

  private async findRecipientForEvent(eventId: string, recipientId: string) {
    const recipient = await this.prisma.eventRecipient.findFirst({
      where: { id: recipientId, eventId },
    });
    if (!recipient) {
      throw new NotFoundException('Artifact recipient not found for this event');
    }
    return recipient;
  }

  private async findRecipientResponse(
    eventId: string,
    recipientId: string,
  ) {
    const recipient = await this.prisma.eventRecipient.findFirst({
      where: { id: recipientId, eventId },
      include: {
        sources: {
          where: { eventId },
        },
        roleAssignments: {
          where: {
            eventId,
            role: { eventId },
          },
          include: { role: true },
          orderBy: { role: { sortOrder: 'asc' } },
        },
      },
    });
    if (!recipient) {
      throw new NotFoundException('Artifact recipient not found for this event');
    }
    return this.toArtifactRecipientDto(recipient);
  }

  private async findOrCreateRecipient(input: RecipientIdentityInput): Promise<{
    id: string;
    created: boolean;
    duplicateEmailMatchSkipped: boolean;
  }> {
    if (input.userId) {
      const byUser = await this.prisma.eventRecipient.findUnique({
        where: {
          eventId_userId: {
            eventId: input.eventId,
            userId: input.userId,
          },
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          emailNormalized: true,
          displayName: true,
        },
      });
      if (byUser) {
        // Снапшот идентичности user-linked получателя держим актуальным:
        // участник мог обновить ФИО/email в своём профиле уже после того, как
        // получатель был создан. Пишем только при реальном расхождении.
        await this.syncRecipientIdentityFromUser(byUser, input);
        return { id: byUser.id, created: false, duplicateEmailMatchSkipped: false };
      }
    }

    const emailNormalized = this.normalizeEmail(input.email);
    let duplicateEmailMatchSkipped = false;
    if (emailNormalized) {
      const matches = await this.prisma.eventRecipient.findMany({
        where: {
          eventId: input.eventId,
          emailNormalized,
          status: EventRecipientStatus.ACTIVE,
          ...(input.userId && {
            OR: [{ userId: null }, { userId: input.userId }],
          }),
        },
        select: { id: true, userId: true },
        orderBy: { createdAt: 'asc' },
        take: 2,
      });
      if (matches.length === 1) {
        if (input.userId && !matches[0].userId) {
          await this.prisma.eventRecipient.update({
            where: { id: matches[0].id },
            data: { userId: input.userId },
          });
        }
        return {
          id: matches[0].id,
          created: false,
          duplicateEmailMatchSkipped: false,
        };
      }
      if (matches.length > 1) {
        duplicateEmailMatchSkipped = true;
        this.logger.warn(
          `Skipped ambiguous artifact recipient email merge for event ${input.eventId}: ${emailNormalized}`,
        );
      }
    }

    const created = await this.prisma.eventRecipient.create({
      data: {
        eventId: input.eventId,
        userId: input.userId ?? null,
        firstName: input.firstName ?? null,
        lastName: input.lastName ?? null,
        email: input.email ?? null,
        emailNormalized,
        displayName: this.buildDisplayName(input),
        status: EventRecipientStatus.ACTIVE,
      },
      select: { id: true },
    });

    return {
      id: created.id,
      created: true,
      duplicateEmailMatchSkipped,
    };
  }

  /**
   * Обновляет снапшот идентичности (ФИО/email/displayName) у user-linked
   * получателя, если он разошёлся с текущими данными профиля. Пишет только
   * изменившиеся поля, чтобы не плодить лишние UPDATE на каждый показ списка.
   * Уже выданные сертификаты при этом не переписываются: список помечает их
   * как устаревшие, а следующая генерация пересобирает PDF с новым именем
   * (см. certificate-generation.service.ts).
   */
  private async syncRecipientIdentityFromUser(
    current: {
      id: string;
      firstName: string | null;
      lastName: string | null;
      email: string | null;
      emailNormalized: string | null;
      displayName: string;
    },
    input: RecipientIdentityInput,
  ): Promise<void> {
    const nextFirstName = input.firstName ?? null;
    const nextLastName = input.lastName ?? null;
    const nextEmail = input.email ?? null;
    const nextEmailNormalized = this.normalizeEmail(input.email);
    const nextDisplayName = this.buildDisplayName(input);

    const data: Prisma.EventRecipientUpdateInput = {};
    if (current.firstName !== nextFirstName) data.firstName = nextFirstName;
    if (current.lastName !== nextLastName) data.lastName = nextLastName;
    if (current.email !== nextEmail) data.email = nextEmail;
    if (current.emailNormalized !== nextEmailNormalized) {
      data.emailNormalized = nextEmailNormalized;
    }
    if (current.displayName !== nextDisplayName) {
      data.displayName = nextDisplayName;
    }

    if (Object.keys(data).length === 0) return;

    await this.prisma.eventRecipient.update({
      where: { id: current.id },
      data,
    });
  }

  private async ensureSource(input: {
    eventId: string;
    recipientId: string;
    sourceType: EventRecipientSourceType;
    sourceId: string;
    emailSnapshot?: string | null;
    nameSnapshot?: string | null;
  }): Promise<void> {
    const existingSource = await this.prisma.eventRecipientSource.findUnique({
      where: {
        eventId_sourceType_sourceId: {
          eventId: input.eventId,
          sourceType: input.sourceType,
          sourceId: input.sourceId,
        },
      },
      select: { id: true },
    });

    if (existingSource) {
      return;
    }

    const existingSourceCount = await this.prisma.eventRecipientSource.count({
      where: { recipientId: input.recipientId },
    });

    await this.prisma.eventRecipientSource.upsert({
      where: {
        eventId_sourceType_sourceId: {
          eventId: input.eventId,
          sourceType: input.sourceType,
          sourceId: input.sourceId,
        },
      },
      create: {
        eventId: input.eventId,
        recipientId: input.recipientId,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        emailSnapshot: input.emailSnapshot ?? null,
        nameSnapshot: input.nameSnapshot ?? null,
        isPrimary: existingSourceCount === 0,
      },
      update: {},
    });
  }

  private async ensureRoleAssignment(input: {
    eventId: string;
    recipientId: string;
    roleId: string;
    sourceType: EventRecipientRoleSourceType;
    sourceId: string | null;
  }): Promise<ArtifactRecipientRoleAssignmentWithRole> {
    return this.prisma.eventRecipientRoleAssignment.upsert({
      where: {
        recipientId_roleId: {
          recipientId: input.recipientId,
          roleId: input.roleId,
        },
      },
      create: {
        eventId: input.eventId,
        recipientId: input.recipientId,
        roleId: input.roleId,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        status: EventRecipientRoleAssignmentStatus.ACTIVE,
      },
      update: {
        status: EventRecipientRoleAssignmentStatus.ACTIVE,
      },
      include: { role: true },
    });
  }

  private async ensureManualRecipientSource(input: {
    eventId: string;
    recipientId: string;
    sourceType: EventRecipientSourceType;
    emailSnapshot: string | null;
    nameSnapshot: string;
  }): Promise<void> {
    const existingSource = await this.prisma.eventRecipientSource.findFirst({
      where: {
        eventId: input.eventId,
        recipientId: input.recipientId,
        sourceType: input.sourceType,
      },
      select: { id: true },
    });
    if (existingSource) {
      return;
    }

    const existingSourceCount = await this.prisma.eventRecipientSource.count({
      where: { recipientId: input.recipientId },
    });

    await this.prisma.eventRecipientSource.create({
      data: {
        eventId: input.eventId,
        recipientId: input.recipientId,
        sourceType: input.sourceType,
        sourceId: null,
        emailSnapshot: input.emailSnapshot,
        nameSnapshot: input.nameSnapshot,
        isPrimary: existingSourceCount === 0,
      },
    });
  }

  private summarizeSources(
    userId: string | null,
    sources: Array<{
      sourceType: EventRecipientSourceType;
      sourceId: string | null;
    }>,
  ) {
    const registrationSource = sources.find(
      (source) => source.sourceType === EventRecipientSourceType.REGISTRATION,
    );
    const speakerSource = sources.find(
      (source) => source.sourceType === EventRecipientSourceType.SPEAKER,
    );

    return {
      userId,
      registrationId: registrationSource?.sourceId ?? null,
      speakerId: speakerSource?.sourceId ?? null,
      sourceTypes: [...new Set(sources.map((source) => source.sourceType))],
    };
  }

  private toArtifactRecipientDto(recipient: ArtifactRecipientWithRelations) {
    return {
      id: recipient.id,
      displayName: recipient.displayName,
      firstName: recipient.firstName,
      lastName: recipient.lastName,
      email: recipient.email,
      status: recipient.status,
      roles: recipient.roleAssignments.map((assignment) => ({
        id: assignment.role.id,
        code: assignment.role.code,
        displayName: assignment.role.displayName,
        translations: assignment.role.translations ?? null,
        kind: assignment.role.kind,
        builtInKey: assignment.role.builtInKey,
        assignmentStatus: assignment.status,
        assignmentId: assignment.id,
        assignmentSourceType: assignment.sourceType,
      })),
      sources: this.summarizeSources(recipient.userId, recipient.sources),
      createdAt: recipient.createdAt,
      updatedAt: recipient.updatedAt,
    };
  }

  private toAssignmentSummary(
    assignment: ArtifactRecipientRoleAssignmentWithRole,
  ) {
    return {
      id: assignment.id,
      roleId: assignment.roleId,
      roleCode: assignment.role.code,
      status: assignment.status,
      sourceType: assignment.sourceType,
    };
  }

  private normalizeEmail(email?: string | null): string | null {
    const normalized = email?.trim().toLowerCase();
    return normalized || null;
  }

  private normalizeNullableString(value?: string | null): string | null {
    if (value === undefined || value === null) {
      return null;
    }
    const normalized = value.trim();
    return normalized || null;
  }

  private normalizeRecipientDisplayName(displayName: string): string {
    const normalized = displayName.trim();
    if (!normalized) {
      throw new BadRequestException('Recipient displayName is required');
    }
    return normalized;
  }

  private buildDisplayName(input: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    displayName?: string | null;
  }): string {
    const fromName = [input.firstName, input.lastName]
      .map((part) => part?.trim())
      .filter(Boolean)
      .join(' ');

    return (
      input.displayName?.trim() ||
      fromName ||
      input.email?.trim() ||
      'Unnamed recipient'
    );
  }

  private normalizeRoleCode(code: string): string {
    return code.trim();
  }

  private normalizeDisplayName(displayName: string): string {
    const normalized = displayName.trim();
    if (!normalized) {
      throw new BadRequestException('Recipient role displayName is required');
    }
    return normalized;
  }

  private assertRoleCodeIsAllowedForCustomRole(code: string): void {
    if (!code) {
      throw new BadRequestException('Recipient role code is required');
    }
    if (!RECIPIENT_ROLE_CODE_PATTERN.test(code)) {
      throw new BadRequestException(
        'Recipient role code must be a lowercase slug',
      );
    }
    if (BUILT_IN_RECIPIENT_ROLE_CODES.has(code)) {
      throw new BadRequestException(
        `Recipient role code "${code}" is reserved for a built-in role`,
      );
    }
  }

  private assertNoImmutableRoleFields(dto: UpdateRecipientRoleDto): void {
    const payload = dto as Record<string, unknown>;
    const immutableFields = ['code', 'kind', 'builtInKey', 'eventId', 'id'];
    const providedImmutableFields = immutableFields.filter(
      (field) => payload[field] !== undefined,
    );
    if (providedImmutableFields.length > 0) {
      throw new BadRequestException(
        `Recipient role fields cannot be changed: ${providedImmutableFields.join(', ')}`,
      );
    }
  }

  private assertCustomRole(
    role: EventRecipientRole,
    message: string,
  ): void {
    if (role.kind === EventRecipientRoleKind.BUILT_IN || role.builtInKey) {
      throw new BadRequestException(message);
    }
  }

  private async findRoleForEvent(
    eventId: string,
    roleId: string,
  ): Promise<EventRecipientRole> {
    const role = await this.prisma.eventRecipientRole.findFirst({
      where: { id: roleId, eventId },
    });
    if (!role) {
      throw new NotFoundException('Recipient role not found for this event');
    }
    return role;
  }

  private async findRoleForEventByCode(
    eventId: string,
    roleCode: string,
  ): Promise<EventRecipientRole> {
    const role = await this.prisma.eventRecipientRole.findUnique({
      where: {
        eventId_code: {
          eventId,
          code: this.normalizeRoleCode(roleCode),
        },
      },
    });
    if (!role) {
      throw new NotFoundException('Recipient role not found for this event');
    }
    return role;
  }

  private async checkEventAccess(
    eventId: string,
    user: ICurrentUser,
  ): Promise<void> {
    const organizationId = this.getOrganizationId(user);
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { organizationId: true },
    });

    if (!event) {
      throw new NotFoundException('Мероприятие не найдено');
    }

    if (event.organizationId !== organizationId) {
      throw new ForbiddenException('Нет доступа к этому мероприятию');
    }
  }

  private getOrganizationId(user: ICurrentUser): string {
    if (user.type === UserType.ORGANIZATION) {
      return user.sub;
    }
    if (user.type === UserType.MEMBER && user.organizationId) {
      return user.organizationId;
    }
    throw new ForbiddenException('Доступно только организаторам');
  }
}
