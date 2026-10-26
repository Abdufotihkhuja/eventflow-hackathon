import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AssetGenerationStatus,
  CertificateTemplate,
  EventStatus,
  ParticipantRole,
  Prisma,
  CoinMetric,
} from '@prisma/client';
import PDFDocument from 'pdfkit';
import * as QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../../prisma/prisma.service';
import { UploadsService } from '../../uploads/uploads.service';
import { FileStorageService } from '../../storage/application/file-storage.service';
import { QueueService } from '../../platform/queue/queue.service';
import { QuotaService } from '../../billing/quota/quota.service';
import { QuotaExceededException } from '../../billing/errors/billing-errors';
import type { ICurrentUser } from '../../../common/interfaces';
import type { GenerateCertificatesDto } from '../dto';
import {
  CertificateGenerationJobPayload,
  QUEUE_NAMES,
} from '../../platform/queue/queue.types';
import { DEFAULT_CERTIFICATE_SIZE_PRESET } from '../../shared/artifact-size-presets';
import {
  artifactRecipientIdentityHash,
  artifactRecipientName,
  certificateTemplateVersionHash,
  type CertificateTemplateVersionInput,
} from '../../shared/artifact-identity';
import {
  ArtifactRecipientResolverService,
  ArtifactRecipientTarget,
  roleCodeToLegacyRecipientRole,
} from '../../events/artifact-recipients/artifact-recipient-resolver.service';
import {
  DEFAULT_CERTIFICATE_FONT_ID,
  parseCertificateNameFont,
  resolveCertificateFontFile,
} from './certificate-fonts';
import { MailService } from '../../mail/mail.service';

type CertificateTarget = ArtifactRecipientTarget & {
  certificate: {
    id: string;
    normalizedArtifactKey: string | null;
    isCurrent: boolean;
    certificateUrl: string | null;
    generationStatus: AssetGenerationStatus | null;
    templateId: string | null;
    templateVersionHash: string | null;
    verificationCode: string | null;
    recipientName: string | null;
  } | null;
};

type MissingTemplateSummary = {
  roleId: string;
  roleCode: string;
};

type CertificateTemplateSizePreset =
  | 'A4_PORTRAIT'
  | 'A4_LANDSCAPE'
  | 'A6_PORTRAIT'
  | 'A6_LANDSCAPE'
  | 'LETTER_PORTRAIT'
  | 'LETTER_LANDSCAPE'
  | 'A5_LANDSCAPE'
  | 'LEGAL_LANDSCAPE'
  | 'DIGITAL_16_9';

type PdfPageConfig = {
  width: number;
  height: number;
  size: string | [number, number];
  layout?: 'portrait' | 'landscape';
};

const PDF_PAGE_PRESETS: Record<CertificateTemplateSizePreset, PdfPageConfig> = {
  A4_PORTRAIT: { width: 595, height: 842, size: 'A4', layout: 'portrait' },
  A4_LANDSCAPE: { width: 842, height: 595, size: 'A4', layout: 'landscape' },
  A6_PORTRAIT: { width: 298, height: 420, size: 'A6', layout: 'portrait' },
  A6_LANDSCAPE: { width: 420, height: 298, size: 'A6', layout: 'landscape' },
  LETTER_PORTRAIT: {
    width: 612,
    height: 792,
    size: 'LETTER',
    layout: 'portrait',
  },
  LETTER_LANDSCAPE: {
    width: 792,
    height: 612,
    size: 'LETTER',
    layout: 'landscape',
  },
  A5_LANDSCAPE: { width: 595, height: 420, size: 'A5', layout: 'landscape' },
  LEGAL_LANDSCAPE: {
    width: 1008,
    height: 612,
    size: 'LEGAL',
    layout: 'landscape',
  },
  DIGITAL_16_9: { width: 960, height: 540, size: [960, 540] },
};

export type CertificateGenerationResult =
  | {
      status: 'completed';
      generated: number;
      failed: number;
      skipped: number;
      forceRegenerate: boolean;
      errors?: Array<{
        registrationId?: string | null;
        recipientId?: string;
        roleId?: string;
        roleCode?: string;
        error: string;
      }>;
      missingTemplates?: MissingTemplateSummary[];
    }
  | {
      status: 'processing';
      jobId: string;
      message: string;
      forceRegenerate: boolean;
    };

@Injectable()
export class CertificateGenerationService {
  private readonly certificatesDir = 'certificates';
  private readonly certificateVerifyBaseUrl: string;
  private readonly publicBaseUrl: string;
  private readonly syncWaitTimeoutMs: number;
  private readonly syncWaitMaxQueueDepth: number;
  private readonly syncWaitMaxRegistrations: number;
  private readonly maxBatchRegistrations: number;
  private readonly queueBackpressureDepth: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadsService: UploadsService,
    private readonly configService: ConfigService,
    private readonly storage: FileStorageService,
    private readonly queueService: QueueService,
    private readonly artifactRecipientResolver: ArtifactRecipientResolverService,
    private readonly mailService: MailService,
    private readonly quotaService: QuotaService,
  ) {
    this.storage.ensureDirectory(this.certificatesDir);
    this.certificateVerifyBaseUrl =
      this.configService.get<string>('frontend.certificateVerifyUrl') ??
      'https://eventflow.uz';
    this.publicBaseUrl =
      this.configService.get<string>('frontend.publicUrl') ?? '';
    this.syncWaitTimeoutMs = this.getPositiveIntEnv(
      'CERTIFICATES_SYNC_WAIT_TIMEOUT_MS',
      5000,
    );
    this.syncWaitMaxQueueDepth = this.getPositiveIntEnv(
      'CERTIFICATES_SYNC_WAIT_MAX_QUEUE_DEPTH',
      1,
    );
    this.syncWaitMaxRegistrations = this.getPositiveIntEnv(
      'CERTIFICATES_SYNC_WAIT_MAX_REGISTRATIONS',
      10,
    );
    this.maxBatchRegistrations = this.getPositiveIntEnv(
      'CERTIFICATES_MAX_BATCH_REGISTRATIONS',
      500,
    );
    this.queueBackpressureDepth = this.getPositiveIntEnv(
      'CERTIFICATES_QUEUE_BACKPRESSURE_MAX_DEPTH',
      20,
    );
  }

  async getOrScheduleGeneration(
    eventId: string,
    dto: GenerateCertificatesDto,
    requestedBy?: ICurrentUser,
  ): Promise<CertificateGenerationResult> {
    await this.assertEventCanGenerate(eventId);
    const targets = await this.resolveTargets(eventId, dto);
    const templates = await this.assertTemplatesAvailableForRequest(
      eventId,
      dto,
      targets,
    );
    const targetsCount = targets.length;

    if (targetsCount === 0) {
      throw new NotFoundException('Нет получателей для генерации сертификатов');
    }

    if (targetsCount > this.maxBatchRegistrations) {
      throw new BadRequestException(
        `Слишком большой batch для генерации сертификатов. Максимум ${this.maxBatchRegistrations} получателей за один запрос.`,
      );
    }

    await this.assertQueueIsNotOverloaded();

    // jobId детерминирован от запроса, чтобы двойной клик схлопывался в один
    // job. В него входит и то, что будет напечатано (версии шаблонов, ФИО
    // получателей): правка дизайна или имени даёт новый job, а не попадает в
    // уже выполненный с тем же id.
    const jobId = this.queueService.createJobId([
      'certificates',
      eventId,
      dto.recipientRoleId ?? dto.roleId ?? 'legacy-role',
      ...(dto.recipientRoleIds ?? []).sort(),
      dto.roleCode ?? 'legacy-code',
      dto.recipientRole ?? ParticipantRole.PARTICIPANT,
      dto.templateId ?? 'default',
      dto.scope ?? 'ROLE',
      dto.onlyAttended ?? true,
      dto.ineligiblePolicy ?? 'EXCLUDE',
      dto.forceRegenerate ?? false,
      ...(dto.recipientIds ?? []).sort(),
      ...(dto.registrationIds ?? []).sort(),
      ...[...templates.entries()]
        .map(
          ([roleId, template]) =>
            `${roleId}=${template.id}:${this.getTemplateVersionHash(template)}`,
        )
        .sort(),
      ...targets.map((target) => artifactRecipientIdentityHash(target)).sort(),
    ]);

    // BullMQ молча игнорирует add с уже существующим id, а выполненные job'ы
    // какое-то время живут в Redis. Завершённый или упавший прогон с тем же
    // ключом снимаем, иначе повторный запрос вернёт его старый результат и
    // ничего не сгенерирует.
    const previous = await this.queueService.getJobStatus(
      QUEUE_NAMES.CERTIFICATES,
      jobId,
    );
    if (previous.state === 'completed' || previous.state === 'failed') {
      await this.queueService.removeJob(QUEUE_NAMES.CERTIFICATES, jobId);
    }

    const payload: CertificateGenerationJobPayload = {
      jobId,
      type: 'certificate.batch',
      entityId: eventId,
      eventId,
      generate: dto,
      requestedBy: requestedBy
        ? {
            userId: requestedBy.sub,
            actorType: requestedBy.type,
            organizationId: requestedBy.organizationId,
          }
        : undefined,
    };

    const handle =
      await this.queueService.enqueueCertificateGeneration(payload);

    if (
      targetsCount > this.syncWaitMaxRegistrations ||
      !(await this.shouldWaitForCompletion())
    ) {
      return {
        status: 'processing',
        jobId: handle.jobId,
        forceRegenerate: dto.forceRegenerate ?? false,
        message:
          'Генерация сертификатов поставлена в очередь. Список обновится после завершения обработки.',
      };
    }

    const completion = await this.queueService.waitForJob<{
      generated: number;
      failed: number;
      skipped: number;
      forceRegenerate: boolean;
      errors?: Array<{
        registrationId?: string | null;
        recipientId?: string;
        roleId?: string;
        roleCode?: string;
        error: string;
      }>;
      missingTemplates?: MissingTemplateSummary[];
    }>(handle, this.syncWaitTimeoutMs);

    if (completion.status === 'completed' && completion.result) {
      return {
        status: 'completed',
        ...completion.result,
      };
    }

    return {
      status: 'processing',
      jobId: handle.jobId,
      forceRegenerate: dto.forceRegenerate ?? false,
      message:
        'Генерация сертификатов поставлена в очередь. Список обновится после завершения обработки.',
    };
  }

  async processGenerateCertificatesJob(
    payload: CertificateGenerationJobPayload,
  ): Promise<{
    generated: number;
    failed: number;
    skipped: number;
    forceRegenerate: boolean;
    errors?: Array<{
      registrationId?: string | null;
      recipientId?: string;
      roleId?: string;
      roleCode?: string;
      error: string;
    }>;
    missingTemplates?: MissingTemplateSummary[];
  }> {
    const event = await this.assertEventCanGenerate(payload.eventId);
    const targets = await this.getTargetsWithCertificates(
      payload.eventId,
      payload.generate,
    );
    const { templates, missingTemplates } =
      await this.resolveTemplatesForTargets(
        payload.eventId,
        payload.generate,
        targets,
      );
    const runnableTargets = targets.filter((target) =>
      templates.has(target.recipientRoleId),
    );

    if (targets.length === 0) {
      throw new NotFoundException('Нет получателей для генерации сертификатов');
    }
    if (runnableTargets.length === 0) {
      throw new BadRequestException(
        `Нет шаблонов сертификата для ролей: ${missingTemplates.map((role) => role.roleCode).join(', ')}. Создайте активные шаблоны по умолчанию.`,
      );
    }

    const templateImagePaths = new Map<string, string>();
    const templateVersionHashes = new Map<string, string>();
    for (const [roleId, template] of templates.entries()) {
      try {
        templateImagePaths.set(
          roleId,
          this.uploadsService.getTemplateFilePath(template.templateUrl),
        );
      } catch {
        const target = targets.find((item) => item.recipientRoleId === roleId);
        throw new BadRequestException(
          `Файл шаблона для роли "${target?.roleCode ?? roleId}" не найден. Загрузите шаблон заново.`,
        );
      }
      templateVersionHashes.set(
        roleId,
        this.getTemplateVersionHash(template),
      );
    }

    const legacyRegistrationLinks =
      await this.resolveLegacyRegistrationLinks(runnableTargets);

    let generated = 0;
    let failed = 0;
    let skipped = 0;
    const errors: Array<{
      registrationId?: string | null;
      recipientId?: string;
      roleId?: string;
      roleCode?: string;
      error: string;
    }> = [];
    const eventDateStr = event.startDate.toISOString().slice(0, 10);
    const forceRegenerate = payload.generate.forceRegenerate ?? false;

    for (const target of runnableTargets) {
      const template = templates.get(target.recipientRoleId);
      const templateImagePath = templateImagePaths.get(target.recipientRoleId);
      const templateVersionHash = templateVersionHashes.get(
        target.recipientRoleId,
      );
      if (!template || !templateImagePath || !templateVersionHash) {
        continue;
      }
      const normalizedArtifactKey = this.normalizedArtifactKey(
        payload.eventId,
        target,
        template.id,
        templateVersionHash,
      );
      const recipientName = artifactRecipientName(target);

      try {
        // Уже выданный сертификат пропускаем только если на нём напечатано
        // ровно то же: тот же шаблон той же версии и то же имя получателя.
        if (
          !forceRegenerate &&
          target.certificate?.certificateUrl &&
          // Старые записи без сохранённого имени считаем актуальными.
          (target.certificate.recipientName === null ||
            target.certificate.recipientName === recipientName) &&
          (!target.certificate.normalizedArtifactKey ||
            target.certificate.normalizedArtifactKey ===
              normalizedArtifactKey) &&
          target.certificate.isCurrent &&
          target.certificate.generationStatus === AssetGenerationStatus.READY &&
          target.certificate.templateId === template.id &&
          target.certificate.templateVersionHash === templateVersionHash &&
          this.storage.exists(target.certificate.certificateUrl)
        ) {
          if (!target.certificate.normalizedArtifactKey) {
            await this.repairCurrentCertificateIdentity({
              certificateId: target.certificate.id,
              eventId: payload.eventId,
              target,
              templateId: template.id,
              templateVersionHash,
              normalizedArtifactKey,
              legacyRegistrationId:
                legacyRegistrationLinks.get(this.targetKey(target)) ?? null,
            });
          }
          skipped++;
          continue;
        }

        const verificationCode =
          target.certificate?.normalizedArtifactKey === normalizedArtifactKey
            ? (target.certificate.verificationCode ?? uuidv4())
            : uuidv4();
        const legacyRegistrationId =
          legacyRegistrationLinks.get(this.targetKey(target)) ?? null;

        // E-6: единица квоты — ПЕРВАЯ генерация для (event, получатель);
        // skip-ветка выше и повторные прогоны с тем же ключом бесплатны
        // (идемпотентность E-10, OQ-A2-3). forceRegenerate того же получателя
        // тоже бесплатен — ключ не меняется.
        await this.quotaService.consume({
          organizationId: event.organizationId,
          metric: CoinMetric.GENERATION_UNITS,
          quantity: 1,
          idempotencyKey: `cert:${payload.eventId}:${this.targetKey(target)}`,
          eventId: payload.eventId,
        });

        const certificate = await this.prepareCertificateForGeneration({
          eventId: payload.eventId,
          target,
          templateId: template.id,
          templateVersionHash,
          normalizedArtifactKey,
          legacyRegistrationId,
          verificationCode,
        });

        const filename = await this.generatePdfWithTemplate(
          template,
          templateImagePath,
          {
            recipientName,
            firstName: target.firstName ?? '',
            lastName: target.lastName ?? '',
            recipientEmail: target.email ?? '',
            eventTitle: event.title,
            eventDate: eventDateStr,
            verificationCode,
          },
        );

        await this.markCertificateReady({
          certificateId: certificate.id,
          eventId: payload.eventId,
          target,
          legacyRegistrationId,
          templateId: template.id,
          certificateUrl: `/uploads/certificates/${filename}`,
          templateVersionHash,
          normalizedArtifactKey,
          recipientName,
          recipientEmail: target.email,
          eventName: event.title,
          eventDate: new Date(eventDateStr),
          verificationCode: certificate.verificationCode ?? verificationCode,
        });

        // Notify the recipient once (idempotency key is stable per
        // recipient+event, so regeneration never sends duplicates). Mail
        // failures must never break certificate generation.
        if (target.email) {
          const recipientKey =
            target.registrationId ?? target.recipientId ?? target.email;
          const finalVerificationCode =
            certificate.verificationCode ?? verificationCode;
          void this.mailService.sendCertificateIssued(
            target.email,
            recipientName,
            event.title,
            {
              idempotencyKey: `certificate-issued:${payload.eventId}:${recipientKey}`,
              eventDate: eventDateStr,
              certificatesUrl: this.publicBaseUrl
                ? `${this.publicBaseUrl}/profile/certificates`
                : undefined,
              verifyUrl: `${this.certificateVerifyBaseUrl.replace(
                /\/$/,
                '',
              )}/certificates/verify?code=${encodeURIComponent(
                finalVerificationCode,
              )}`,
            },
          )
        }

        generated++;
      } catch (error) {
        if (error instanceof QuotaExceededException) {
          failed++;
          errors.push({
            recipientId: target.recipientId,
            roleId: target.recipientRoleId,
            roleCode: target.roleCode,
            error: 'Квота генераций тарифа исчерпана',
          });
          continue;
        }
        failed++;
        errors.push({
          registrationId: target.registrationId,
          recipientId: target.recipientId,
          roleId: target.recipientRoleId,
          roleCode: target.roleCode,
          error: error instanceof Error ? error.message : 'Ошибка генерации',
        });

        await this.markCertificateFailed({
          eventId: payload.eventId,
          target,
          templateId: template.id,
          templateVersionHash,
          normalizedArtifactKey,
          legacyRegistrationId:
            legacyRegistrationLinks.get(this.targetKey(target)) ?? null,
          error: error instanceof Error ? error.message : 'Ошибка генерации',
        });
      }
    }

    return {
      generated,
      failed,
      skipped,
      forceRegenerate,
      ...(errors.length > 0 ? { errors } : {}),
      ...(missingTemplates.length > 0 ? { missingTemplates } : {}),
    };
  }

  private async assertEventCanGenerate(eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        organization: { select: { companyName: true } },
      },
    });

    if (!event) {
      throw new NotFoundException('Мероприятие не найдено');
    }

    if (event.status !== EventStatus.COMPLETED) {
      throw new BadRequestException(
        'Сертификаты можно генерировать только для завершённых мероприятий',
      );
    }

    return event;
  }

  /** Coarse state of a queued generation job (waiting/active/completed/failed). */
  async getJobStatus(jobId: string): Promise<{
    state: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'unknown';
    result?: { generated: number; failed: number; skipped: number };
    failedReason?: string;
  }> {
    return this.queueService.getJobStatus<{
      generated: number;
      failed: number;
      skipped: number;
    }>(QUEUE_NAMES.CERTIFICATES, jobId);
  }

  private async resolveTargets(
    eventId: string,
    dto: GenerateCertificatesDto,
  ): Promise<ArtifactRecipientTarget[]> {
    const requireAttendance = dto.onlyAttended !== false;
    const isManualSelection = Boolean(
      dto.recipientIds?.length || dto.registrationIds?.length,
    );

    if (!isManualSelection) {
      // Role / all-eligible scope: keep the approved + attendance gating.
      // There is no explicit recipient list, so nothing can hard-fail.
      return this.artifactRecipientResolver.resolveTargets({
        eventId,
        recipientRoleId: dto.recipientRoleId,
        recipientRoleIds: dto.recipientRoleIds,
        roleId: dto.roleId,
        roleCode: dto.roleCode,
        recipientRole: dto.recipientRole,
        scope: dto.scope,
        requireApprovedRegistration: true,
        requireAttendance,
      });
    }

    // Manual selection: never hard-fail on eligibility. Resolve the selection
    // without approval/attendance gating, then apply the chosen policy —
    // INCLUDE issues to everyone selected; EXCLUDE (default) drops ineligible
    // recipients and issues to the rest.
    const selected = await this.artifactRecipientResolver.resolveTargets({
      eventId,
      recipientIds: dto.recipientIds,
      registrationIds: dto.registrationIds,
      recipientRoleId: dto.recipientRoleId,
      recipientRoleIds: dto.recipientRoleIds,
      roleId: dto.roleId,
      roleCode: dto.roleCode,
      recipientRole: dto.recipientRole,
      scope: dto.scope,
    });

    if ((dto.ineligiblePolicy ?? 'EXCLUDE') === 'INCLUDE') {
      return selected;
    }
    return this.filterEligibleTargets(eventId, selected, requireAttendance);
  }

  /**
   * Keep only recipients eligible for certificates (approved registration, plus
   * attendance when required). Recipients without a registration source
   * (speakers, manual entries) are always kept.
   */
  private async filterEligibleTargets(
    eventId: string,
    targets: ArtifactRecipientTarget[],
    requireAttendance: boolean,
  ): Promise<ArtifactRecipientTarget[]> {
    const registrationIds = targets
      .map((target) => target.registrationId)
      .filter((id): id is string => !!id);
    if (registrationIds.length === 0) return targets;

    const { approved, attended } =
      await this.artifactRecipientResolver.classifyRegistrationEligibility(
        eventId,
        registrationIds,
      );

    return targets.filter((target) => {
      if (!target.registrationId) return true;
      if (!approved.has(target.registrationId)) return false;
      if (requireAttendance && !attended.has(target.registrationId)) {
        return false;
      }
      return true;
    });
  }

  private async getTargetsWithCertificates(
    eventId: string,
    dto: GenerateCertificatesDto,
  ): Promise<CertificateTarget[]> {
    const targets = await this.resolveTargets(eventId, dto);
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
        verificationCode: true,
        recipientName: true,
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

    for (const target of targets) {
      if (byTarget.has(this.targetKey(target)) || !target.registrationId) {
        continue;
      }
      const legacyCertificate = certificates.find(
        (certificate) =>
          certificate.registrationId === target.registrationId &&
          !certificate.eventRecipientId &&
          (!certificate.recipientRoleId ||
            certificate.recipientRoleId === target.recipientRoleId),
      );
      if (!legacyCertificate) continue;
      await this.prisma.certificate.update({
        where: { id: legacyCertificate.id },
        data: {
          eventId,
          eventRecipientId: target.recipientId,
          recipientRoleId: target.recipientRoleId,
        },
      });
      byTarget.set(this.targetKey(target), legacyCertificate);
    }

    return targets.map((target) => ({
      ...target,
      certificate: byTarget.get(this.targetKey(target)) ?? null,
    }));
  }

  /** Resolves the templates the request will render with, or throws when none fit. */
  private async assertTemplatesAvailableForRequest(
    eventId: string,
    dto: GenerateCertificatesDto,
    targets: ArtifactRecipientTarget[],
  ): Promise<Map<string, CertificateTemplate>> {
    const { templates, missingTemplates } =
      await this.resolveTemplatesForTargets(eventId, dto, targets);
    if (
      missingTemplates.length > 0 &&
      (dto.scope !== 'ALL_ELIGIBLE' || templates.size === 0)
    ) {
      throw new BadRequestException(
        `Нет шаблона сертификата для ролей: ${missingTemplates.map((role) => role.roleCode).join(', ')}. Создайте активный шаблон по умолчанию.`,
      );
    }
    return templates;
  }

  private async resolveTemplatesForTargets(
    eventId: string,
    dto: GenerateCertificatesDto,
    targets: ArtifactRecipientTarget[],
  ): Promise<{
    templates: Map<string, CertificateTemplate>;
    missingTemplates: MissingTemplateSummary[];
  }> {
    const roleIds = [
      ...new Set(targets.map((target) => target.recipientRoleId)),
    ];
    const templates = new Map<string, CertificateTemplate>();
    const missingTemplates: MissingTemplateSummary[] = [];

    if (dto.templateId) {
      const template = await this.prisma.certificateTemplate.findFirst({
        where: { id: dto.templateId, eventId, isActive: true },
        orderBy: [{ createdAt: 'asc' }],
      });
      if (!template) {
        throw new BadRequestException(
          'Шаблон сертификата не найден для этого мероприятия или неактивен.',
        );
      }
      for (const target of targets) {
        if (!this.templateMatchesTarget(template, target)) {
          throw new BadRequestException(
            `Шаблон сертификата не соответствует роли "${target.roleCode}". Выберите шаблон для этой роли.`,
          );
        }
        templates.set(target.recipientRoleId, template);
      }
      return { templates, missingTemplates };
    }

    for (const roleId of roleIds) {
      const target = targets.find((item) => item.recipientRoleId === roleId);
      if (!target) continue;
      const template = await this.findDefaultCertificateTemplateForTarget(
        eventId,
        target,
      );
      if (template) {
        templates.set(roleId, template);
      } else {
        missingTemplates.push({
          roleId: target?.recipientRoleId ?? '',
          roleCode: target?.roleCode ?? roleId,
        });
      }
    }

    return { templates, missingTemplates };
  }

  private async findDefaultCertificateTemplateForTarget(
    eventId: string,
    target: ArtifactRecipientTarget,
  ): Promise<CertificateTemplate | null> {
    const normalizedTemplates =
      await this.prisma.certificateTemplate.findMany({
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
      throw new BadRequestException(
        `Duplicate active default certificate templates for role "${target.roleCode}". Deactivate duplicates first.`,
      );
    }
    if (normalizedTemplates[0]) {
      return normalizedTemplates[0];
    }

    const recipientRole = roleCodeToLegacyRecipientRole(target.roleCode);
    if (!recipientRole) {
      return null;
    }
    const legacyTemplates = await this.prisma.certificateTemplate.findMany({
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
    if (legacyTemplates.length > 1) {
      throw new BadRequestException(
        `Duplicate active default certificate templates for legacy role "${recipientRole}". Deactivate duplicates first.`,
      );
    }
    return legacyTemplates[0] ?? null;
  }

  private templateMatchesTarget(
    template: Pick<CertificateTemplate, 'recipientRoleId' | 'recipientRole'>,
    target: ArtifactRecipientTarget,
  ): boolean {
    if (template.recipientRoleId) {
      return template.recipientRoleId === target.recipientRoleId;
    }
    return (
      roleCodeToLegacyRecipientRole(target.roleCode) === template.recipientRole
    );
  }

  private async prepareCertificateForGeneration(args: {
    eventId: string;
    target: ArtifactRecipientTarget;
    templateId: string;
    templateVersionHash: string;
    normalizedArtifactKey: string;
    legacyRegistrationId: string | null;
    verificationCode: string;
  }): Promise<{ id: string; verificationCode: string | null }> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.certificate.findUnique({
        where: { normalizedArtifactKey: args.normalizedArtifactKey },
        select: { id: true, verificationCode: true },
      });

      const certificate = existing
        ? await tx.certificate.update({
            where: { id: existing.id },
            data: {
              eventId: args.eventId,
              eventRecipientId: args.target.recipientId,
              recipientRoleId: args.target.recipientRoleId,
              templateId: args.templateId,
              templateVersionHash: args.templateVersionHash,
              normalizedArtifactKey: args.normalizedArtifactKey,
              isCurrent: false,
              generationStatus: AssetGenerationStatus.PROCESSING,
              generationError: null,
              verificationCode: existing.verificationCode ?? args.verificationCode,
            },
            select: { id: true, verificationCode: true },
          })
        : await tx.certificate.create({
            data: {
              eventId: args.eventId,
              registrationId: null,
              eventRecipientId: args.target.recipientId,
              recipientRoleId: args.target.recipientRoleId,
              templateId: args.templateId,
              templateVersionHash: args.templateVersionHash,
              normalizedArtifactKey: args.normalizedArtifactKey,
              isCurrent: false,
              verificationCode: args.verificationCode,
              generationStatus: AssetGenerationStatus.PROCESSING,
              generationError: null,
            },
            select: { id: true, verificationCode: true },
          });

      await this.repointCurrentAndLegacyLinks(tx, {
        certificateId: certificate.id,
        eventId: args.eventId,
        target: args.target,
        legacyRegistrationId: args.legacyRegistrationId,
      });
      await tx.certificate.update({
        where: { id: certificate.id },
        data: { isCurrent: true },
      });

      return certificate;
    });
  }

  private async markCertificateReady(args: {
    certificateId: string;
    eventId: string;
    target: ArtifactRecipientTarget;
    legacyRegistrationId: string | null;
    templateId: string;
    certificateUrl: string;
    templateVersionHash: string;
    normalizedArtifactKey: string;
    recipientName: string;
    recipientEmail: string | null;
    eventName: string;
    eventDate: Date;
    verificationCode: string;
  }): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await this.repointCurrentAndLegacyLinks(tx, {
        certificateId: args.certificateId,
        eventId: args.eventId,
        target: args.target,
        legacyRegistrationId: args.legacyRegistrationId,
      });
      await tx.certificate.update({
        where: { id: args.certificateId },
        data: {
          eventId: args.eventId,
          registrationId: args.legacyRegistrationId,
          eventRecipientId: args.target.recipientId,
          recipientRoleId: args.target.recipientRoleId,
          templateId: args.templateId,
          certificateUrl: args.certificateUrl,
          templateVersionHash: args.templateVersionHash,
          normalizedArtifactKey: args.normalizedArtifactKey,
          isCurrent: true,
          generatedAt: new Date(),
          recipientName: args.recipientName,
          recipientEmail: args.recipientEmail,
          eventName: args.eventName,
          eventDate: args.eventDate,
          verificationCode: args.verificationCode,
          generationStatus: AssetGenerationStatus.READY,
          generationError: null,
        },
      });
    });
  }

  private async markCertificateFailed(args: {
    eventId: string;
    target: ArtifactRecipientTarget;
    templateId: string;
    templateVersionHash: string;
    normalizedArtifactKey: string;
    legacyRegistrationId: string | null;
    error: string;
  }): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.certificate.findUnique({
        where: { normalizedArtifactKey: args.normalizedArtifactKey },
        select: { id: true, verificationCode: true },
      });
      const certificate = existing
        ? await tx.certificate.update({
            where: { id: existing.id },
            data: {
              eventId: args.eventId,
              eventRecipientId: args.target.recipientId,
              recipientRoleId: args.target.recipientRoleId,
              templateId: args.templateId,
              templateVersionHash: args.templateVersionHash,
              normalizedArtifactKey: args.normalizedArtifactKey,
              isCurrent: false,
              generationStatus: AssetGenerationStatus.FAILED,
              generationError: args.error,
            },
            select: { id: true },
          })
        : await tx.certificate.create({
            data: {
              eventId: args.eventId,
              registrationId: null,
              eventRecipientId: args.target.recipientId,
              recipientRoleId: args.target.recipientRoleId,
              templateId: args.templateId,
              templateVersionHash: args.templateVersionHash,
              normalizedArtifactKey: args.normalizedArtifactKey,
              isCurrent: false,
              generationStatus: AssetGenerationStatus.FAILED,
              generationError: args.error,
            },
            select: { id: true },
          });
      await this.repointCurrentAndLegacyLinks(tx, {
        certificateId: certificate.id,
        eventId: args.eventId,
        target: args.target,
        legacyRegistrationId: args.legacyRegistrationId,
      });
      await tx.certificate.update({
        where: { id: certificate.id },
        data: { isCurrent: true },
      });
    });
  }

  private async repairCurrentCertificateIdentity(args: {
    certificateId: string;
    eventId: string;
    target: ArtifactRecipientTarget;
    templateId: string;
    templateVersionHash: string;
    normalizedArtifactKey: string;
    legacyRegistrationId: string | null;
  }): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await this.repointCurrentAndLegacyLinks(tx, {
        certificateId: args.certificateId,
        eventId: args.eventId,
        target: args.target,
        legacyRegistrationId: args.legacyRegistrationId,
      });
      await tx.certificate.update({
        where: { id: args.certificateId },
        data: {
          eventId: args.eventId,
          eventRecipientId: args.target.recipientId,
          recipientRoleId: args.target.recipientRoleId,
          templateId: args.templateId,
          templateVersionHash: args.templateVersionHash,
          normalizedArtifactKey: args.normalizedArtifactKey,
          isCurrent: true,
          registrationId: args.legacyRegistrationId,
        },
      });
    });
  }

  private async repointCurrentAndLegacyLinks(
    tx: Prisma.TransactionClient,
    args: {
      certificateId: string;
      eventId: string;
      target: ArtifactRecipientTarget;
      legacyRegistrationId: string | null;
    },
  ): Promise<void> {
    await tx.certificate.updateMany({
      where: {
        eventId: args.eventId,
        eventRecipientId: args.target.recipientId,
        recipientRoleId: args.target.recipientRoleId,
        id: { not: args.certificateId },
        isCurrent: true,
      },
      data: { isCurrent: false },
    });

    if (args.legacyRegistrationId) {
      await tx.certificate.updateMany({
        where: {
          registrationId: args.legacyRegistrationId,
          id: { not: args.certificateId },
        },
        data: { registrationId: null },
      });
    }
  }

  private async resolveLegacyRegistrationLinks(
    targets: CertificateTarget[],
  ): Promise<Map<string, string | null>> {
    const registrationIds = [
      ...new Set(
        targets
          .map((target) => target.registrationId)
          .filter((id): id is string => !!id),
      ),
    ];
    if (registrationIds.length === 0) {
      return new Map(targets.map((target) => [this.targetKey(target), null]));
    }

    const registrations = await this.prisma.registration.findMany({
      where: { id: { in: registrationIds } },
      select: { id: true, role: true },
    });
    const registrationRoleById = new Map(
      registrations.map((registration) => [
        registration.id,
        registration.role.toLowerCase(),
      ]),
    );
    const preferredTargetByRegistration = new Map<string, string>();
    for (const registrationId of registrationIds) {
      const registrationTargets = targets.filter(
        (target) => target.registrationId === registrationId,
      );
      const preferredRoleCode = registrationRoleById.get(registrationId);
      if (!preferredRoleCode) continue;
      const preferredTarget = registrationTargets.find(
        (target) => target.roleCode === preferredRoleCode,
      );
      if (preferredTarget) {
        preferredTargetByRegistration.set(
          registrationId,
          this.targetKey(preferredTarget),
        );
      }
    }

    return new Map(
      targets.map((target) => {
        if (!target.registrationId) return [this.targetKey(target), null];
        return [
          this.targetKey(target),
          preferredTargetByRegistration.get(target.registrationId) ===
          this.targetKey(target)
            ? target.registrationId
            : null,
        ];
      }),
    );
  }

  private targetKey(
    target: Pick<ArtifactRecipientTarget, 'recipientId' | 'recipientRoleId'>,
  ): string {
    return `${target.recipientId}:${target.recipientRoleId}`;
  }

  private normalizedArtifactKey(
    eventId: string,
    target: Pick<ArtifactRecipientTarget, 'recipientId' | 'recipientRoleId'>,
    templateId: string,
    templateVersionHash: string,
  ): string {
    return [
      'certificate',
      eventId,
      target.recipientId,
      target.recipientRoleId,
      templateId,
      templateVersionHash,
    ].join(':');
  }

  /** Read the name alignment stored inside a name position JSON. */
  private readNameAlign(
    value: Prisma.JsonValue | null | undefined,
  ): 'left' | 'center' | 'right' {
    const align = (value as { align?: unknown } | null)?.align;
    return align === 'center' || align === 'right' ? align : 'left';
  }

  private posPx(
    pos: { x?: number; y?: number } | null,
    page: PdfPageConfig,
  ): { x: number; y: number } {
    if (!pos || typeof pos.x !== 'number' || typeof pos.y !== 'number') {
      return { x: 0, y: 0 };
    }
    return {
      x: (pos.x / 100) * page.width,
      y: (pos.y / 100) * page.height,
    };
  }

  private rectPx(
    rect: { x?: number; y?: number; width?: number; height?: number } | null,
    page: PdfPageConfig,
  ): { x: number; y: number; width: number; height: number } {
    if (!rect || typeof rect.x !== 'number' || typeof rect.y !== 'number') {
      return { x: 0, y: 0, width: 100, height: 10 };
    }
    const width =
      typeof rect.width === 'number' ? (rect.width / 100) * page.width : 100;
    const height =
      typeof rect.height === 'number' ? (rect.height / 100) * page.height : 10;
    return {
      x: (rect.x / 100) * page.width,
      y: (rect.y / 100) * page.height,
      width,
      height,
    };
  }

  private async generatePdfWithTemplate(
    template: {
      namePosition: Prisma.JsonValue;
      datePosition: Prisma.JsonValue | null;
      eventNamePosition: Prisma.JsonValue | null;
      firstNamePosition: Prisma.JsonValue | null;
      lastNamePosition: Prisma.JsonValue | null;
      qrPosition: Prisma.JsonValue | null;
      sizePreset: string | null;
      nameFontSize: number | null;
      nameFont: string | null;
      nameColor: string | null;
    },
    templateImagePath: string,
    data: {
      recipientName: string;
      firstName: string;
      lastName: string;
      recipientEmail: string;
      eventTitle: string;
      eventDate: string;
      verificationCode: string;
    },
  ): Promise<string> {
    const filename = `cert-${data.verificationCode.slice(0, 8)}.pdf`;
    const pdfBuffer = await this.buildPdfWithTemplate(
      template,
      templateImagePath,
      data,
    );
    await this.storage.save({
      buffer: pdfBuffer,
      originalName: filename,
      mimetype: 'application/pdf',
      size: pdfBuffer.byteLength,
      directory: this.certificatesDir,
      fileName: filename,
    });

    return filename;
  }

  private async buildPdfWithTemplate(
    template: {
      namePosition: Prisma.JsonValue;
      datePosition: Prisma.JsonValue | null;
      eventNamePosition: Prisma.JsonValue | null;
      firstNamePosition: Prisma.JsonValue | null;
      lastNamePosition: Prisma.JsonValue | null;
      qrPosition: Prisma.JsonValue | null;
      sizePreset: string | null;
      nameFontSize: number | null;
      nameFont: string | null;
      nameColor: string | null;
    },
    templateImagePath: string,
    data: {
      recipientName: string;
      firstName: string;
      lastName: string;
      recipientEmail: string;
      eventTitle: string;
      eventDate: string;
      verificationCode: string;
    },
  ): Promise<Buffer> {
    const page = this.resolvePdfPage(template.sizePreset);
    const namePosition = this.posPx(
      template.namePosition as { x?: number; y?: number },
      page,
    );
    const datePosition = this.posPx(
      (template.datePosition as { x?: number; y?: number }) ?? null,
      page,
    );
    const eventNamePosition = this.posPx(
      (template.eventNamePosition as { x?: number; y?: number }) ?? null,
      page,
    );
    const firstNamePos = this.rectPx(
      (template.firstNamePosition as {
        x?: number;
        y?: number;
        width?: number;
        height?: number;
      }) ?? null,
      page,
    );
    const lastNamePos = this.rectPx(
      (template.lastNamePosition as {
        x?: number;
        y?: number;
        width?: number;
        height?: number;
      }) ?? null,
      page,
    );
    const qrPos = this.rectPx(
      (template.qrPosition as {
        x?: number;
        y?: number;
        width?: number;
        height?: number;
      }) ?? null,
      page,
    );

    const fontSize = template.nameFontSize ?? 20;
    const { fontId, bold: fontBold } = parseCertificateNameFont(
      template.nameFont,
    );
    const fillColor = template.nameColor ?? '#000000';
    // Alignment is stored inside the name position JSON (no extra DB column).
    const nameAlign = this.readNameAlign(
      template.firstNamePosition ?? template.lastNamePosition,
    );

    const useFirstLast =
      template.firstNamePosition &&
      template.lastNamePosition &&
      typeof (template.firstNamePosition as { x?: number }).x === 'number' &&
      typeof (template.lastNamePosition as { x?: number }).x === 'number';

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: page.size,
        layout: page.layout,
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
      });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer | string) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      });
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.image(templateImagePath, 0, 0, {
        width: page.width,
        height: page.height,
      });

      try {
        // Register the chosen Cyrillic-capable font before drawing. PDFKit's
        // built-in Helvetica garbles Cyrillic, so we only fall back to it if
        // both the selected font and the default (Inter) fail to register.
        const NAME_FONT = 'CertificateNameFont';
        let drawFont = NAME_FONT;
        try {
          doc.registerFont(
            NAME_FONT,
            resolveCertificateFontFile(fontId, fontBold),
          );
        } catch {
          try {
            doc.registerFont(
              NAME_FONT,
              resolveCertificateFontFile(DEFAULT_CERTIFICATE_FONT_ID, fontBold),
            );
          } catch {
            drawFont = fontBold ? 'Helvetica-Bold' : 'Helvetica';
          }
        }

        doc.fontSize(fontSize).fillColor(fillColor);
        doc.font(drawFont);

        if (useFirstLast) {
          doc
            .fontSize(fontSize)
            .text(data.firstName, firstNamePos.x, firstNamePos.y, {
              width: firstNamePos.width,
              height: firstNamePos.height,
              align: nameAlign,
            });
          doc.text(data.lastName, lastNamePos.x, lastNamePos.y, {
            width: lastNamePos.width,
            height: lastNamePos.height,
            align: nameAlign,
          });
        } else {
          doc.text(data.recipientName, namePosition.x, namePosition.y, {
            width: page.width - namePosition.x,
            align: nameAlign,
          });
        }

        if (template.datePosition && datePosition.x + datePosition.y > 0) {
          doc
            .fontSize(fontSize * 0.6)
            .text(data.eventDate, datePosition.x, datePosition.y, {
              width: 200,
              align: 'left',
            });
        }
        if (
          template.eventNamePosition &&
          eventNamePosition.x + eventNamePosition.y > 0
        ) {
          doc
            .fontSize(fontSize * 0.8)
            .text(data.eventTitle, eventNamePosition.x, eventNamePosition.y, {
              width: page.width - eventNamePosition.x,
              align: 'left',
            });
        }

        if (template.qrPosition && qrPos.width > 5 && qrPos.height > 5) {
          // A QR code must stay square: stretching it to a non-square box
          // distorts the modules (often unscannable) and overflows the frame.
          // The selected area can be non-square — width% is taken against the
          // page width and height% against the page height, and the default
          // position uses equal percents on a non-square page. So we render a
          // square sized to the smaller side, anchored at the area's top-left.
          // This mirrors the editor, which displays the QR zone the same way
          // (min(width, height), top-left).
          const qrSize = Math.min(qrPos.width, qrPos.height);
          const verifyUrl = `${this.certificateVerifyBaseUrl.replace(/\/$/, '')}/certificates/verify?code=${encodeURIComponent(data.verificationCode)}`;
          QRCode.toBuffer(verifyUrl, {
            width: Math.round(qrSize),
            margin: 0,
          })
            .then((qrBuffer) => {
              doc.image(qrBuffer, qrPos.x, qrPos.y, {
                width: qrSize,
                height: qrSize,
              });
              doc.end();
            })
            .catch((error) => {
              doc.end();
              reject(error);
            });
        } else {
          doc.end();
        }
      } catch (error) {
        doc.end();
        reject(error);
      }
    });
  }

  private async shouldWaitForCompletion(): Promise<boolean> {
    const queueDepth = await this.queueService.getQueueDepth(
      QUEUE_NAMES.CERTIFICATES,
    );
    return queueDepth <= this.syncWaitMaxQueueDepth;
  }

  private resolvePdfPage(sizePreset: string | null): PdfPageConfig {
    const preset = sizePreset ?? DEFAULT_CERTIFICATE_SIZE_PRESET;
    if (preset && preset in PDF_PAGE_PRESETS) {
      return PDF_PAGE_PRESETS[preset as CertificateTemplateSizePreset];
    }
    return PDF_PAGE_PRESETS.A4_LANDSCAPE;
  }

  /** Hash of the template content that affects rendering; see artifact-identity.ts. */
  getTemplateVersionHash(template: CertificateTemplateVersionInput): string {
    return certificateTemplateVersionHash(template);
  }

  private async assertQueueIsNotOverloaded(): Promise<void> {
    const queueDepth = await this.queueService.getQueueDepth(
      QUEUE_NAMES.CERTIFICATES,
    );

    if (queueDepth >= this.queueBackpressureDepth) {
      throw new ServiceUnavailableException(
        'Очередь генерации сертификатов перегружена. Повторите запрос чуть позже.',
      );
    }
  }

  private getPositiveIntEnv(name: string, fallback: number): number {
    const value = this.configService.get<string>(name);

    if (!value) {
      return fallback;
    }

    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }
}
