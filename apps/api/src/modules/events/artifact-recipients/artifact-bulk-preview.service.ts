import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import {
  AssetGenerationStatus,
  CertificateTemplate,
  ParticipantRole,
  Prisma,
  UserType,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import type { ICurrentUser } from '../../../common/interfaces';
import { FileStorageService } from '../../storage/application/file-storage.service';
import {
  ArtifactRecipientResolverService,
  ArtifactRecipientTarget,
  roleCodeToLegacyRecipientRole,
} from './artifact-recipient-resolver.service';
import {
  ArtifactBulkPreviewDto,
  ArtifactBulkPreviewExcludedReason,
  ArtifactBulkPreviewResponseDto,
  ArtifactBulkPreviewScope,
  ArtifactBulkPreviewStatus,
  ArtifactBulkPreviewType,
  ArtifactBulkPreviewWarningCode,
} from './dto';

type PreviewTemplate = {
  id: string;
  eventId: string;
  recipientRoleId: string | null;
  recipientRole: ParticipantRole;
  name: string;
  isActive: boolean;
  isDefault: boolean;
  createdAt: Date;
};

type CertificatePreviewTemplate = CertificateTemplate;

type CertificatePreviewTarget = ArtifactRecipientTarget & {
  certificate: {
    id: string;
    normalizedArtifactKey: string | null;
    isCurrent: boolean;
    certificateUrl: string | null;
    generationStatus: AssetGenerationStatus | null;
    templateId: string | null;
    templateVersionHash: string | null;
  } | null;
};

type RoleAccumulator = {
  roleId: string;
  roleCode: string;
  roleDisplayName: string;
  recipientIds: Set<string>;
  artifactCount: number;
  willGenerateCount: number;
  willRegenerateCount: number;
  willSkipCount: number;
  missingTemplateCount: number;
  blockedCount: number;
  statusBreakdown: Record<ArtifactBulkPreviewStatus, number>;
};

const LARGE_BULK_ACTION_THRESHOLD = 100;

@Injectable()
export class ArtifactBulkPreviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly artifactRecipientResolver: ArtifactRecipientResolverService,
    private readonly storage: FileStorageService,
  ) {}

  async preview(
    eventId: string,
    dto: ArtifactBulkPreviewDto,
    user: ICurrentUser,
  ): Promise<ArtifactBulkPreviewResponseDto> {
    await this.checkEventAccess(eventId, user);
    const { targets, excludedRecipients } = await this.resolvePreviewTargets(
      eventId,
      dto,
    );

    if (dto.artifactType === ArtifactBulkPreviewType.BADGE) {
      return this.previewBadges(eventId, dto, targets, excludedRecipients);
    }

    return this.previewCertificates(eventId, dto, targets, excludedRecipients);
  }

  private async resolvePreviewTargets(
    eventId: string,
    dto: ArtifactBulkPreviewDto,
  ): Promise<{
    targets: ArtifactRecipientTarget[];
    excludedRecipients: Array<{
      recipientId: string;
      reason: ArtifactBulkPreviewExcludedReason;
    }>;
  }> {
    if (dto.scope === ArtifactBulkPreviewScope.ROLE && !this.hasRoleFilter(dto)) {
      throw new BadRequestException('ROLE scope requires a recipient role filter.');
    }
    if (
      dto.scope === ArtifactBulkPreviewScope.SELECTED &&
      !dto.recipientIds?.length &&
      !dto.registrationIds?.length
    ) {
      throw new BadRequestException(
        'SELECTED scope requires recipientIds or registrationIds.',
      );
    }

    const requireApprovedRegistration =
      (dto.artifactType === ArtifactBulkPreviewType.BADGE &&
        dto.onlyApproved !== false) ||
      dto.artifactType === ArtifactBulkPreviewType.CERTIFICATE;
    const requireAttendance =
      dto.artifactType === ArtifactBulkPreviewType.CERTIFICATE &&
      dto.onlyAttended !== false;

    if (dto.scope === ArtifactBulkPreviewScope.SELECTED) {
      // Manual selection must never hard-fail. Resolve without the
      // approved/attendance filters, then classify ineligible recipients
      // softly so the UI can show reasons and offer "issue anyway".
      const selectedTargets = await this.artifactRecipientResolver.resolveTargets(
        {
          eventId,
          recipientIds: dto.recipientIds,
          registrationIds: dto.registrationIds,
          scope: 'ALL_ELIGIBLE',
        },
      );

      const roleIds = await this.resolveRequestedRoleIds(eventId, dto);
      const roleMatched = roleIds
        ? selectedTargets.filter((target) => roleIds.has(target.recipientRoleId))
        : selectedTargets;
      const roleExclusions = roleIds
        ? this.findRoleMismatchExclusions(selectedTargets, roleMatched)
        : [];

      const eligibilityExclusions = await this.classifyEligibilityExclusions(
        eventId,
        roleMatched,
        requireApprovedRegistration,
        requireAttendance,
      );
      const ineligibleIds = new Set(
        eligibilityExclusions.map((exclusion) => exclusion.recipientId),
      );
      const eligibleTargets = roleMatched.filter(
        (target) => !ineligibleIds.has(target.recipientId),
      );

      return {
        targets: eligibleTargets,
        excludedRecipients: [...roleExclusions, ...eligibilityExclusions],
      };
    }

    return {
      targets: await this.artifactRecipientResolver.resolveTargets({
        eventId,
        recipientIds: dto.recipientIds,
        registrationIds: dto.registrationIds,
        ...this.toResolverRoleInput(dto),
        requireApprovedRegistration,
        requireAttendance,
      }),
      excludedRecipients: [],
    };
  }

  private toResolverRoleInput(dto: ArtifactBulkPreviewDto): {
    recipientRoleIds?: string[];
    recipientRoleId?: string;
    roleId?: string;
    roleCode?: string;
    recipientRole?: ParticipantRole;
    scope?: 'ROLE' | 'ALL_ELIGIBLE';
  } {
    if (dto.recipientRoleIds?.length) {
      return { recipientRoleIds: dto.recipientRoleIds, scope: 'ROLE' };
    }
    if (dto.recipientRoleId || dto.roleId) {
      return {
        recipientRoleId: dto.recipientRoleId,
        roleId: dto.roleId,
        scope: 'ROLE',
      };
    }
    if (dto.roleCode?.trim()) {
      return { roleCode: dto.roleCode, scope: 'ROLE' };
    }
    if (dto.recipientRole) {
      return { recipientRole: dto.recipientRole, scope: 'ROLE' };
    }
    if (dto.scope === ArtifactBulkPreviewScope.ALL_ELIGIBLE) {
      return { scope: 'ALL_ELIGIBLE' };
    }
    if (dto.scope === ArtifactBulkPreviewScope.ALL_SPEAKERS) {
      return { roleCode: 'speaker', scope: 'ROLE' };
    }
    return { roleCode: 'participant', scope: 'ROLE' };
  }

  private async resolveRequestedRoleIds(
    eventId: string,
    dto: ArtifactBulkPreviewDto,
  ): Promise<Set<string> | null> {
    const roleIds = [...new Set(dto.recipientRoleIds ?? [])];
    if (roleIds.length > 0) {
      const roles = await this.prisma.eventRecipientRole.findMany({
        where: { eventId, id: { in: roleIds } },
        select: { id: true, isActive: true, isArtifactEligible: true },
      });
      for (const role of roles) {
        this.assertRoleCanTargetArtifacts(role);
      }
      this.assertAllRoleIdsMatched(roleIds, roles.map((role) => role.id));
      return new Set(roleIds);
    }

    const singleRoleId = dto.recipientRoleId ?? dto.roleId;
    if (singleRoleId) {
      const role = await this.prisma.eventRecipientRole.findFirst({
        where: { eventId, id: singleRoleId },
        select: { id: true, isActive: true, isArtifactEligible: true },
      });
      if (!role) {
        throw new BadRequestException(
          'Selected recipient role does not belong to this event.',
        );
      }
      this.assertRoleCanTargetArtifacts(role);
      return new Set([role.id]);
    }

    const roleCode =
      dto.roleCode?.trim().toLowerCase() ??
      (dto.recipientRole
        ? dto.recipientRole.toLowerCase()
        : null);
    if (!roleCode) {
      return null;
    }

    const role = await this.prisma.eventRecipientRole.findFirst({
      where: { eventId, code: roleCode },
      select: { id: true, isActive: true, isArtifactEligible: true },
    });
    if (!role) {
      throw new BadRequestException(
        `Recipient role "${roleCode}" does not belong to this event.`,
      );
    }
    this.assertRoleCanTargetArtifacts(role);
    return new Set([role.id]);
  }

  private assertRoleCanTargetArtifacts(role: {
    isActive: boolean;
    isArtifactEligible: boolean;
  }) {
    if (!role.isActive) {
      throw new BadRequestException('Selected recipient role is inactive.');
    }
    if (!role.isArtifactEligible) {
      throw new BadRequestException(
        'Selected recipient role is not artifact eligible.',
      );
    }
  }

  private assertAllRoleIdsMatched(requestedIds: string[], matchedIds: string[]) {
    const matched = new Set(matchedIds);
    const invalid = [...new Set(requestedIds)].filter((id) => !matched.has(id));
    if (invalid.length > 0) {
      throw new BadRequestException(
        `Selected recipient roles do not belong to this event: ${invalid.join(', ')}`,
      );
    }
  }

  private hasRoleFilter(dto: ArtifactBulkPreviewDto): boolean {
    return Boolean(
      dto.recipientRoleIds?.length ||
        dto.recipientRoleId ||
        dto.roleId ||
        dto.roleCode?.trim() ||
        dto.recipientRole,
    );
  }

  /**
   * Softly classify which manually selected recipients fail the certificate
   * eligibility filters (approved registration / attendance). Returns the
   * excluded recipients with a reason instead of throwing — the resolver no
   * longer hard-fails the whole request for manual selection.
   */
  private async classifyEligibilityExclusions(
    eventId: string,
    targets: ArtifactRecipientTarget[],
    requireApproved: boolean,
    requireAttendance: boolean,
  ): Promise<
    Array<{ recipientId: string; reason: ArtifactBulkPreviewExcludedReason }>
  > {
    if (!requireApproved && !requireAttendance) return [];
    const registrationIds = targets
      .map((target) => target.registrationId)
      .filter((id): id is string => !!id);
    if (registrationIds.length === 0) return [];

    const { approved, attended } =
      await this.artifactRecipientResolver.classifyRegistrationEligibility(
        eventId,
        registrationIds,
      );

    const exclusions: Array<{
      recipientId: string;
      reason: ArtifactBulkPreviewExcludedReason;
    }> = [];
    for (const target of targets) {
      // Recipients without a registration source (speakers, manual) are not
      // subject to attendance/approval gating.
      if (!target.registrationId) continue;
      if (requireApproved && !approved.has(target.registrationId)) {
        exclusions.push({
          recipientId: target.recipientId,
          reason: ArtifactBulkPreviewExcludedReason.NOT_APPROVED,
        });
      } else if (requireAttendance && !attended.has(target.registrationId)) {
        exclusions.push({
          recipientId: target.recipientId,
          reason: ArtifactBulkPreviewExcludedReason.NOT_ATTENDED,
        });
      }
    }
    return exclusions;
  }

  private findRoleMismatchExclusions(
    selectedTargets: ArtifactRecipientTarget[],
    filteredTargets: ArtifactRecipientTarget[],
  ) {
    const matchedRecipientIds = new Set(
      filteredTargets.map((target) => target.recipientId),
    );
    return [
      ...new Set(selectedTargets.map((target) => target.recipientId)),
    ]
      .filter((recipientId) => !matchedRecipientIds.has(recipientId))
      .map((recipientId) => ({
        recipientId,
        reason: ArtifactBulkPreviewExcludedReason.ROLE_MISMATCH,
      }));
  }

  private async previewCertificates(
    eventId: string,
    dto: ArtifactBulkPreviewDto,
    targets: ArtifactRecipientTarget[],
    excludedRecipients: ArtifactBulkPreviewResponseDto['excludedRecipients'],
  ) {
    const targetsWithCertificates = await this.getTargetsWithCertificates(
      eventId,
      targets,
    );
    const templates = await this.resolveCertificateTemplates(eventId, targets);
    const rows = targetsWithCertificates
      .map((target) =>
        this.toCertificatePreviewRow(
          eventId,
          target,
          templates.get(target.recipientRoleId) ?? null,
          dto.forceRegenerate === true,
        ),
      )
      .filter(
        (row) =>
          (!dto.staleOnly || row.status === ArtifactBulkPreviewStatus.STALE) &&
          (dto.includeReady !== false ||
            row.status !== ArtifactBulkPreviewStatus.READY) &&
          (dto.includeStale !== false ||
            row.status !== ArtifactBulkPreviewStatus.STALE),
      );

    return this.toResponse(
      dto,
      rows,
      excludedRecipients,
    );
  }

  private async previewBadges(
    eventId: string,
    dto: ArtifactBulkPreviewDto,
    targets: ArtifactRecipientTarget[],
    excludedRecipients: ArtifactBulkPreviewResponseDto['excludedRecipients'],
  ) {
    const templates = await this.resolveBadgeTemplates(eventId, targets);
    const rows = targets.map((target) => {
      const template = templates.get(target.recipientRoleId) ?? null;
      return {
        target,
        status: template
          ? ArtifactBulkPreviewStatus.GENERATABLE
          : ArtifactBulkPreviewStatus.MISSING_TEMPLATE,
        willGenerate: Boolean(template),
        willRegenerate: false,
        willSkip: false,
        blocked: !template,
        missingTemplate: !template,
      };
    });

    return this.toResponse(dto, rows, excludedRecipients);
  }

  private async getTargetsWithCertificates(
    eventId: string,
    targets: ArtifactRecipientTarget[],
  ): Promise<CertificatePreviewTarget[]> {
    if (targets.length === 0) return [];
    const registrationIds = [
      ...new Set(
        targets
          .map((target) => target.registrationId)
          .filter((id): id is string => !!id),
      ),
    ];
    const certificates = await this.prisma.certificate.findMany({
      where: {
        eventId,
        OR: [
          ...targets.map((target) => ({
            eventRecipientId: target.recipientId,
            recipientRoleId: target.recipientRoleId,
            isCurrent: true,
          })),
          ...(registrationIds.length
            ? [{ registrationId: { in: registrationIds } }]
            : []),
        ],
      },
      select: {
        id: true,
        registrationId: true,
        eventRecipientId: true,
        recipientRoleId: true,
        normalizedArtifactKey: true,
        isCurrent: true,
        certificateUrl: true,
        generationStatus: true,
        templateId: true,
        templateVersionHash: true,
      },
    });
    const byTarget = new Map<string, (typeof certificates)[number]>();
    for (const certificate of certificates) {
      if (certificate.eventRecipientId && certificate.recipientRoleId) {
        byTarget.set(
          `${certificate.eventRecipientId}:${certificate.recipientRoleId}`,
          certificate,
        );
      }
    }

    return targets.map((target) => {
      const normalized = byTarget.get(this.targetKey(target));
      const legacy =
        normalized ??
        (target.registrationId
          ? certificates.find(
              (certificate) =>
                certificate.registrationId === target.registrationId &&
                !certificate.eventRecipientId &&
                (!certificate.recipientRoleId ||
                  certificate.recipientRoleId === target.recipientRoleId),
            )
          : null);
      return { ...target, certificate: legacy ?? null };
    });
  }

  private async resolveCertificateTemplates(
    eventId: string,
    targets: ArtifactRecipientTarget[],
  ): Promise<Map<string, CertificatePreviewTemplate>> {
    const templates = new Map<string, CertificatePreviewTemplate>();
    for (const roleId of [
      ...new Set(targets.map((target) => target.recipientRoleId)),
    ]) {
      const target = targets.find((item) => item.recipientRoleId === roleId);
      if (!target) continue;
      const template = await this.findDefaultTemplateForTarget(
        eventId,
        target,
        this.prisma.certificateTemplate,
      );
      if (template) {
        templates.set(roleId, template as CertificatePreviewTemplate);
      }
    }
    return templates;
  }

  private async resolveBadgeTemplates(
    eventId: string,
    targets: ArtifactRecipientTarget[],
  ): Promise<Map<string, PreviewTemplate>> {
    const templates = new Map<string, PreviewTemplate>();
    const roleIds = [
      ...new Set(targets.map((target) => target.recipientRoleId)),
    ];
    for (const roleId of roleIds) {
      const target = targets.find((item) => item.recipientRoleId === roleId);
      if (!target) continue;
      const template = await this.findDefaultTemplateForTarget(
        eventId,
        target,
        this.prisma.badgeTemplate,
        // Бейджи: единственный активный шаблон роли считается основным — так же,
        // как при самой выгрузке (BadgesService). Иначе предпросмотр обещает
        // «нет шаблона» там, где выгрузка его находит.
        { allowSoleActive: true },
      );
      if (template) {
        templates.set(roleId, template);
      }
    }
    return templates;
  }

  private async findDefaultTemplateForTarget<T extends PreviewTemplate>(
    eventId: string,
    target: ArtifactRecipientTarget,
    model: {
      findMany(args: {
        where: Record<string, unknown>;
        orderBy: Array<Record<string, string>>;
        take: number;
      }): Promise<T[]>;
    },
    options: { allowSoleActive?: boolean } = {},
  ): Promise<T | null> {
    const soleActive = async (): Promise<T | null> => {
      if (!options.allowSoleActive) return null;
      const active = await model.findMany({
        where: { eventId, isActive: true, recipientRoleId: target.recipientRoleId },
        orderBy: [{ createdAt: 'asc' }],
        take: 2,
      });
      return active.length === 1 ? active[0] : null;
    };

    const normalizedTemplates = await model.findMany({
      where: {
        eventId,
        isActive: true,
        isDefault: true,
        recipientRoleId: target.recipientRoleId,
      },
      orderBy: [{ createdAt: 'asc' }],
      take: 2,
    });
    if (normalizedTemplates.length > 1) {
      return null;
    }
    if (normalizedTemplates[0]) {
      return normalizedTemplates[0];
    }

    const recipientRole = roleCodeToLegacyRecipientRole(target.roleCode);
    if (!recipientRole) {
      return soleActive();
    }
    const legacyTemplates = await model.findMany({
      where: {
        eventId,
        isActive: true,
        isDefault: true,
        recipientRoleId: null,
        recipientRole,
      },
      orderBy: [{ createdAt: 'asc' }],
      take: 2,
    });
    return legacyTemplates.length === 1 ? legacyTemplates[0] : soleActive();
  }

  private toCertificatePreviewRow(
    eventId: string,
    target: CertificatePreviewTarget,
    template: CertificatePreviewTemplate | null,
    forceRegenerate: boolean,
  ) {
    if (!template) {
      return this.row(target, ArtifactBulkPreviewStatus.MISSING_TEMPLATE, {
        blocked: true,
        missingTemplate: true,
      });
    }

    const templateVersionHash = this.getTemplateVersionHash(template);
    const normalizedArtifactKey = this.normalizedArtifactKey(
      eventId,
      target,
      template.id,
      templateVersionHash,
    );
    const certificate = target.certificate;
    const status = this.resolveCertificateStatus(
      certificate,
      template,
      templateVersionHash,
      normalizedArtifactKey,
    );

    if (status === ArtifactBulkPreviewStatus.READY) {
      return this.row(target, status, {
        willRegenerate: forceRegenerate,
        willSkip: !forceRegenerate,
      });
    }
    if (status === ArtifactBulkPreviewStatus.STALE) {
      return this.row(target, status, { willRegenerate: true });
    }
    if (status === ArtifactBulkPreviewStatus.FAILED) {
      return this.row(target, status, { willGenerate: true });
    }
    if (status === ArtifactBulkPreviewStatus.PROCESSING) {
      return this.row(target, status, { willGenerate: true });
    }
    return this.row(target, status, { willGenerate: true });
  }

  private resolveCertificateStatus(
    certificate: CertificatePreviewTarget['certificate'],
    template: CertificatePreviewTemplate,
    templateVersionHash: string,
    normalizedArtifactKey: string,
  ): ArtifactBulkPreviewStatus {
    if (!certificate) {
      return ArtifactBulkPreviewStatus.NOT_GENERATED;
    }
    if (certificate.generationStatus === AssetGenerationStatus.FAILED) {
      return ArtifactBulkPreviewStatus.FAILED;
    }
    if (certificate.generationStatus === AssetGenerationStatus.PROCESSING) {
      return ArtifactBulkPreviewStatus.PROCESSING;
    }
    if (
      certificate.certificateUrl &&
      (!certificate.normalizedArtifactKey ||
        certificate.normalizedArtifactKey === normalizedArtifactKey) &&
      certificate.isCurrent &&
      certificate.generationStatus === AssetGenerationStatus.READY &&
      certificate.templateId === template.id &&
      certificate.templateVersionHash === templateVersionHash &&
      this.storage.exists(certificate.certificateUrl)
    ) {
      return ArtifactBulkPreviewStatus.READY;
    }
    return ArtifactBulkPreviewStatus.STALE;
  }

  private row(
    target: ArtifactRecipientTarget,
    status: ArtifactBulkPreviewStatus,
    flags: Partial<{
      willGenerate: boolean;
      willRegenerate: boolean;
      willSkip: boolean;
      blocked: boolean;
      missingTemplate: boolean;
    }>,
  ) {
    return {
      target,
      status,
      willGenerate: flags.willGenerate === true,
      willRegenerate: flags.willRegenerate === true,
      willSkip: flags.willSkip === true,
      blocked: flags.blocked === true,
      missingTemplate: flags.missingTemplate === true,
    };
  }

  private toResponse(
    dto: ArtifactBulkPreviewDto,
    rows: Array<ReturnType<ArtifactBulkPreviewService['row']>>,
    excludedRecipients: ArtifactBulkPreviewResponseDto['excludedRecipients'],
  ): ArtifactBulkPreviewResponseDto {
    const roles = new Map<string, RoleAccumulator>();
    const missingTemplates = new Map<string, ArtifactBulkPreviewResponseDto['missingTemplates'][number]>();
    const recipientIds = new Set<string>();

    const totals = this.emptyCounts();
    for (const row of rows) {
      recipientIds.add(row.target.recipientId);
      this.applyRowCounts(totals, row);
      const role = this.roleAccumulator(roles, row.target);
      role.recipientIds.add(row.target.recipientId);
      this.applyRowCounts(role, row);
      if (row.missingTemplate) {
        missingTemplates.set(row.target.recipientRoleId, {
          roleId: row.target.recipientRoleId,
          roleCode: row.target.roleCode,
          roleDisplayName: this.roleDisplayName(row.target),
          artifactType: dto.artifactType,
        });
      }
    }

    const artifactCount = rows.length;
    return {
      artifactType: dto.artifactType,
      scope: dto.scope,
      recipientCount: recipientIds.size,
      artifactCount,
      willGenerateCount: totals.willGenerateCount,
      willRegenerateCount: totals.willRegenerateCount,
      willSkipCount: totals.willSkipCount,
      missingTemplateCount: totals.missingTemplateCount,
      blockedCount: totals.blockedCount,
      staleCount: totals.statusBreakdown[ArtifactBulkPreviewStatus.STALE],
      readyCount: totals.statusBreakdown[ArtifactBulkPreviewStatus.READY],
      failedCount: totals.statusBreakdown[ArtifactBulkPreviewStatus.FAILED],
      notGeneratedCount:
        totals.statusBreakdown[ArtifactBulkPreviewStatus.NOT_GENERATED],
      processingCount:
        totals.statusBreakdown[ArtifactBulkPreviewStatus.PROCESSING],
      roles: [...roles.values()].map((role) => ({
        roleId: role.roleId,
        roleCode: role.roleCode,
        roleDisplayName: role.roleDisplayName,
        recipientCount: role.recipientIds.size,
        artifactCount: role.artifactCount,
        willGenerateCount: role.willGenerateCount,
        willRegenerateCount: role.willRegenerateCount,
        willSkipCount: role.willSkipCount,
        missingTemplateCount: role.missingTemplateCount,
        blockedCount: role.blockedCount,
        statusBreakdown: this.toStatusBreakdownDto(role.statusBreakdown),
      })),
      missingTemplates: [...missingTemplates.values()],
      warnings:
        artifactCount > LARGE_BULK_ACTION_THRESHOLD
          ? [
              {
                code: ArtifactBulkPreviewWarningCode.LARGE_BULK_ACTION,
                message: `This action affects ${artifactCount} artifacts.`,
              },
            ]
          : [],
      excludedRecipients,
    };
  }

  private emptyCounts(): Omit<RoleAccumulator, 'roleId' | 'roleCode' | 'roleDisplayName' | 'recipientIds'> {
    return {
      artifactCount: 0,
      willGenerateCount: 0,
      willRegenerateCount: 0,
      willSkipCount: 0,
      missingTemplateCount: 0,
      blockedCount: 0,
      statusBreakdown: Object.fromEntries(
        Object.values(ArtifactBulkPreviewStatus).map((status) => [status, 0]),
      ) as Record<ArtifactBulkPreviewStatus, number>,
    };
  }

  private roleAccumulator(
    roles: Map<string, RoleAccumulator>,
    target: ArtifactRecipientTarget,
  ): RoleAccumulator {
    const existing = roles.get(target.recipientRoleId);
    if (existing) return existing;
    const role = {
      roleId: target.recipientRoleId,
      roleCode: target.roleCode,
      roleDisplayName: this.roleDisplayName(target),
      recipientIds: new Set<string>(),
      ...this.emptyCounts(),
    };
    roles.set(target.recipientRoleId, role);
    return role;
  }

  private applyRowCounts(
    counts: Pick<
      RoleAccumulator,
      | 'artifactCount'
      | 'willGenerateCount'
      | 'willRegenerateCount'
      | 'willSkipCount'
      | 'missingTemplateCount'
      | 'blockedCount'
      | 'statusBreakdown'
    >,
    row: ReturnType<ArtifactBulkPreviewService['row']>,
  ) {
    counts.artifactCount++;
    counts.willGenerateCount += row.willGenerate ? 1 : 0;
    counts.willRegenerateCount += row.willRegenerate ? 1 : 0;
    counts.willSkipCount += row.willSkip ? 1 : 0;
    counts.missingTemplateCount += row.missingTemplate ? 1 : 0;
    counts.blockedCount += row.blocked ? 1 : 0;
    counts.statusBreakdown[row.status]++;
  }

  private toStatusBreakdownDto(
    counts: Record<ArtifactBulkPreviewStatus, number>,
  ) {
    return {
      ready: counts[ArtifactBulkPreviewStatus.READY],
      stale: counts[ArtifactBulkPreviewStatus.STALE],
      failed: counts[ArtifactBulkPreviewStatus.FAILED],
      processing: counts[ArtifactBulkPreviewStatus.PROCESSING],
      notGenerated: counts[ArtifactBulkPreviewStatus.NOT_GENERATED],
      missingTemplate: counts[ArtifactBulkPreviewStatus.MISSING_TEMPLATE],
      notEligible: counts[ArtifactBulkPreviewStatus.NOT_ELIGIBLE],
      generatable: counts[ArtifactBulkPreviewStatus.GENERATABLE],
      blocked: counts[ArtifactBulkPreviewStatus.BLOCKED],
    };
  }

  private roleDisplayName(target: ArtifactRecipientTarget): string {
    return target.roleDisplayName;
  }

  private targetKey(target: ArtifactRecipientTarget): string {
    return `${target.recipientId}:${target.recipientRoleId}`;
  }

  private normalizedArtifactKey(
    eventId: string,
    target: ArtifactRecipientTarget,
    templateId: string,
    templateVersionHash: string,
  ): string {
    return [
      eventId,
      target.recipientId,
      target.recipientRoleId,
      templateId,
      templateVersionHash,
    ].join(':');
  }

  private getTemplateVersionHash(template: {
    recipientRoleId?: string | null;
    recipientRole?: ParticipantRole | null;
    sizePreset: string | null;
    widthPx?: number | null;
    heightPx?: number | null;
    templateUrl?: string | null;
    namePosition: Prisma.JsonValue;
    datePosition: Prisma.JsonValue | null;
    eventNamePosition: Prisma.JsonValue | null;
    firstNamePosition: Prisma.JsonValue | null;
    lastNamePosition: Prisma.JsonValue | null;
    qrPosition: Prisma.JsonValue | null;
    nameFontSize: number | null;
    nameFont: string | null;
    nameColor: string | null;
  }): string {
    return createHash('sha256')
      .update(
        JSON.stringify({
          recipientRole: template.recipientRole ?? null,
          recipientRoleId: template.recipientRoleId ?? null,
          sizePreset: template.sizePreset,
          widthPx: template.widthPx ?? null,
          heightPx: template.heightPx ?? null,
          templateUrl: template.templateUrl ?? null,
          namePosition: template.namePosition,
          datePosition: template.datePosition,
          eventNamePosition: template.eventNamePosition,
          firstNamePosition: template.firstNamePosition,
          lastNamePosition: template.lastNamePosition,
          qrPosition: template.qrPosition,
          nameFontSize: template.nameFontSize,
          nameFont: template.nameFont,
          nameColor: template.nameColor,
        }),
      )
      .digest('hex');
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
