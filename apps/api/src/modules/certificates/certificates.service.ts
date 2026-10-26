import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';
import {
  CertificateQueryDto,
  GenerateCertificatesDto,
  VerifyCertificateDto,
} from './dto';
import {
  Certificate,
  CertificateTemplate,
  ParticipantRole,
  UserType,
  Prisma,
} from '@prisma/client';
import { ICurrentUser } from '../../common/interfaces';
import { FileStorageService } from '../storage/application/file-storage.service';
import {
  CertificateGenerationResult,
  CertificateGenerationService,
} from './application/certificate-generation.service';
import { resolveCertificateSizePreset } from '../shared/artifact-size-presets';
import { artifactRecipientName } from '../shared/artifact-identity';
import { ArtifactTemplateRoleResolverService } from '../events/artifact-recipients/artifact-template-role-resolver.service';
import {
  BusinessTranslations,
  pickFallbackTranslation,
} from '../translations/dto/business-translation.dto';

export const CERTIFICATE_TEMPLATE_TRANSLATION_FIELDS = ['name'] as const;

export type CertificateTemplateResponse = Omit<
  CertificateTemplate,
  'recipientRole'
> & {
  eventId: string;
  recipientRole: ParticipantRole | null;
  roleCode: string;
  roleDisplayName: string;
};

function roleCodeToParticipantRole(
  code?: string | null,
): ParticipantRole | null {
  if (code === 'participant') return ParticipantRole.PARTICIPANT;
  if (code === 'speaker') return ParticipantRole.SPEAKER;
  if (code === 'mentor') return ParticipantRole.MENTOR;
  return null;
}

type CertificateTemplateWithRole = CertificateTemplate & {
  normalizedRecipientRole?: { code: string; displayName: string } | null;
};

@Injectable()
export class CertificatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadsService: UploadsService,
    private readonly storage: FileStorageService,
    private readonly configService: ConfigService,
    private readonly certificateGenerationService: CertificateGenerationService,
    private readonly templateRoleResolver: ArtifactTemplateRoleResolverService,
  ) {
    this.storage.ensureDirectory('certificates');
  }

  /**
   * Генерирует сертификаты для участников по шаблону по умолчанию
   */
  async generateCertificates(
    eventId: string,
    dto: GenerateCertificatesDto,
    user: ICurrentUser,
  ): Promise<CertificateGenerationResult> {
    await this.checkEventAccess(eventId, user);
    return this.certificateGenerationService.getOrScheduleGeneration(
      eventId,
      dto,
      user,
    );
  }

  /**
   * Status of an async certificate generation job: the coarse queue state plus
   * live per-status counts of the event's certificates (so the UI can render a
   * progress bar and auto-refresh the list as PDFs become READY).
   */
  async getGenerationStatus(
    eventId: string,
    jobId: string,
    user: ICurrentUser,
  ): Promise<{
    state: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'unknown';
    result?: { generated: number; failed: number; skipped: number };
    failedReason?: string;
    counts: {
      total: number;
      ready: number;
      processing: number;
      pending: number;
      failed: number;
    };
  }> {
    await this.checkEventAccess(eventId, user);
    const [job, grouped] = await Promise.all([
      this.certificateGenerationService.getJobStatus(jobId),
      this.prisma.certificate.groupBy({
        by: ['generationStatus'],
        where: { eventId, isCurrent: true },
        _count: { _all: true },
      }),
    ]);

    const byStatus = new Map<string, number>();
    let total = 0;
    for (const row of grouped) {
      const n = row._count._all;
      total += n;
      byStatus.set(row.generationStatus ?? 'READY', n);
    }

    return {
      ...job,
      counts: {
        total,
        ready: byStatus.get('READY') ?? 0,
        processing: byStatus.get('PROCESSING') ?? 0,
        pending: byStatus.get('PENDING') ?? 0,
        failed: byStatus.get('FAILED') ?? 0,
      },
    };
  }

  /**
   * Список выданных сертификатов по событию (пагинация, поиск)
   */
  async findCertificatesByEvent(
    eventId: string,
    query: CertificateQueryDto,
    user: ICurrentUser,
  ): Promise<{
    certificates: Array<{
      id: string;
      eventId: string;
      registrationId: string;
      templateId: string | null;
      certificateUrl: string | null;
      issuedAt: string | null;
      downloadCount: number;
      recipientName: string | null;
      recipientEmail: string | null;
      eventName: string | null;
      eventDate: string | null;
      recipientRole: ParticipantRole;
      generationStatus: string | null;
      isStale: boolean;
    }>;
    total: number;
    page: number;
    limit: number;
  }> {
    await this.checkEventAccess(eventId, user);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.CertificateWhereInput = { eventId, isCurrent: true };
    if (query.search?.trim()) {
      const search = query.search.trim();
      where.OR = [
        { recipientName: { contains: search, mode: 'insensitive' } },
        { recipientEmail: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [certificates, total] = await this.prisma.$transaction([
      this.prisma.certificate.findMany({
        where,
        skip,
        take: limit,
        orderBy: { generatedAt: 'desc' },
        select: {
          id: true,
          registrationId: true,
          templateId: true,
          certificateUrl: true,
          templateVersionHash: true,
          generationStatus: true,
          generatedAt: true,
          downloadCount: true,
          recipientName: true,
          recipientEmail: true,
          eventName: true,
          eventDate: true,
          registration: { select: { eventId: true, role: true } },
          recipientRole: { select: { code: true } },
          eventRecipient: {
            select: {
              firstName: true,
              lastName: true,
              displayName: true,
              email: true,
            },
          },
          template: {
            select: {
              recipientRole: true,
              sizePreset: true,
              widthPx: true,
              heightPx: true,
              templateUrl: true,
              namePosition: true,
              datePosition: true,
              eventNamePosition: true,
              firstNamePosition: true,
              lastNamePosition: true,
              qrPosition: true,
              nameFontSize: true,
              nameFont: true,
              nameColor: true,
            },
          },
        },
      }),
      this.prisma.certificate.count({ where }),
    ]);

    const eventIdVal = eventId;
    return {
      certificates: certificates.map((c) => ({
        id: c.id,
        eventId: c.registration?.eventId ?? eventIdVal,
        registrationId: c.registrationId ?? '',
        templateId: c.templateId,
        certificateUrl: c.certificateUrl,
        generationStatus:
          c.generationStatus ?? (c.certificateUrl ? 'READY' : null),
        issuedAt: c.generatedAt?.toISOString() ?? null,
        downloadCount: c.downloadCount,
        recipientName: c.recipientName,
        recipientEmail: c.recipientEmail,
        eventName: c.eventName,
        eventDate: c.eventDate
          ? new Date(c.eventDate).toISOString().slice(0, 10)
          : null,
        recipientRole:
          roleCodeToParticipantRole(c.recipientRole?.code) ??
          c.registration?.role ??
          ParticipantRole.PARTICIPANT,
        // Устарел, если с момента выдачи поменялся шаблон или ФИО получателя:
        // на PDF напечатано не то, что сейчас в данных.
        isStale:
          (c.template
            ? c.templateVersionHash !==
              this.certificateGenerationService.getTemplateVersionHash(
                c.template,
              )
            : false) ||
          (c.eventRecipient
            ? artifactRecipientName(c.eventRecipient) !== c.recipientName
            : false),
      })),
      total,
      page,
      limit,
    };
  }

  /**
   * Скачивание сертификата по eventId и certificateId (увеличивает downloadCount)
   */
  async downloadCertificateByEvent(
    eventId: string,
    certificateId: string,
    user: ICurrentUser,
  ): Promise<{ path: string; filename: string }> {
    await this.checkEventAccess(eventId, user);

    const certificate = await this.prisma.certificate.findFirst({
      where: { id: certificateId, eventId },
      include: {
        event: { select: { title: true } },
        registration: {
          include: {
            event: { select: { title: true } },
          },
        },
      },
    });

    if (!certificate) {
      throw new NotFoundException('Сертификат не найден');
    }

    if (!certificate.certificateUrl) {
      throw new NotFoundException('Файл сертификата не найден');
    }

    await this.prisma.certificate.update({
      where: { id: certificateId },
      data: { downloadCount: { increment: 1 } },
    });

    if (!this.storage.exists(certificate.certificateUrl)) {
      throw new NotFoundException('Файл сертификата не найден');
    }

    return {
      path: certificate.certificateUrl,
      filename: `certificate-${(certificate.registration?.event.title ?? certificate.event.title).substring(0, 30)}.pdf`,
    };
  }

  /**
   * Скачивает сертификат
   */
  async downloadCertificate(
    certificateId: string,
    user: ICurrentUser,
  ): Promise<{ path: string; filename: string }> {
    const certificate = await this.prisma.certificate.findUnique({
      where: { id: certificateId },
      include: {
        event: { select: { title: true, organizationId: true } },
        registration: {
          include: {
            user: { select: { id: true } },
            event: { select: { title: true, organizationId: true } },
          },
        },
        eventRecipient: { select: { userId: true } },
      },
    });

    if (!certificate) {
      throw new NotFoundException('Сертификат не найден');
    }

    // Проверяем доступ
    const isOwner =
      certificate.registration?.user.id === user.sub ||
      certificate.eventRecipient?.userId === user.sub;
    const isOrganizer =
      user.type === UserType.ORGANIZATION &&
      certificate.event.organizationId === user.sub;
    const isMember =
      user.type === UserType.MEMBER &&
      certificate.event.organizationId === user.organizationId;

    if (!isOwner && !isOrganizer && !isMember) {
      throw new ForbiddenException('Нет доступа к этому сертификату');
    }

    if (!certificate.certificateUrl) {
      throw new NotFoundException('Файл сертификата не найден');
    }

    // Увеличиваем счётчик скачиваний
    await this.prisma.certificate.update({
      where: { id: certificateId },
      data: { downloadCount: { increment: 1 } },
    });

    if (!this.storage.exists(certificate.certificateUrl)) {
      throw new NotFoundException('Файл сертификата не найден');
    }

    return {
      path: certificate.certificateUrl,
      filename: `certificate-${(certificate.registration?.event.title ?? certificate.event.title).substring(0, 30)}.pdf`,
    };
  }

  /**
   * Список шаблонов сертификатов события
   */
  async findTemplatesByEvent(
    eventId: string,
    user: ICurrentUser,
  ): Promise<{ templates: CertificateTemplateResponse[] }> {
    await this.checkEventAccess(eventId, user);
    const templates = await this.prisma.certificateTemplate.findMany({
      where: { eventId },
      include: { normalizedRecipientRole: true },
      orderBy: [{ recipientRole: 'asc' }, { createdAt: 'asc' }],
    });
    return {
      templates: templates.map((template) =>
        this.toTemplateResponse(template),
      ),
    };
  }

  /**
   * Создаёт шаблон сертификата (multipart: template file + поля)
   */
  async createTemplate(
    eventId: string,
    body: Record<string, string | undefined>,
    file: Express.Multer.File | undefined,
    user: ICurrentUser,
  ): Promise<CertificateTemplateResponse> {
    await this.checkEventAccess(eventId, user);

    if (!file) {
      throw new BadRequestException('Файл шаблона обязателен');
    }

    const translations = this.parseTranslationsField(body.translations);
    const name =
      pickFallbackTranslation(translations, 'name', body.name) ||
      body.name?.trim();
    if (!name) {
      throw new BadRequestException('Поле name обязательно');
    }

    const roleResolution = await this.templateRoleResolver.resolveForWrite(
      eventId,
      body,
    );
    const recipientRole =
      roleResolution.legacyRecipientRole ?? ParticipantRole.PARTICIPANT;
    const size = this.parseTemplateSize(body);
    const isActive = this.parseBoolean(body.isActive, true);
    const isDefault = this.parseBoolean(body.isDefault, false);
    if (isDefault && !isActive) {
      throw new BadRequestException(
        'Default certificate template must be active. Set isActive=true or isDefault=false.',
      );
    }
    await this.assertNoActiveDefaultTemplate(
      eventId,
      roleResolution.recipientRoleId,
      roleResolution.roleCode,
      undefined,
      isDefault,
      isActive,
    );

    const namePosition = this.parseJsonField(body.namePosition, 'namePosition');
    if (
      !namePosition ||
      typeof (namePosition as { x?: number }).x !== 'number' ||
      typeof (namePosition as { y?: number }).y !== 'number'
    ) {
      throw new BadRequestException(
        'namePosition должен быть JSON-объектом с полями x и y (числа 0–100)',
      );
    }

    const uploaded =
      await this.uploadsService.uploadCertificateTemplateImage(file);

    const template = await this.createCertificateTemplate({
      eventId,
      name,
      translations,
      recipientRole,
      recipientRoleId: roleResolution.recipientRoleId,
      roleCode: roleResolution.roleCode,
      size,
      uploadedUrl: uploaded.url,
      body,
      namePosition,
      isDefault,
      isActive,
    });

    return this.toTemplateResponse(template);
  }

  /**
   * Обновляет шаблон (все поля опциональны, включая новый файл)
   */
  async updateTemplate(
    eventId: string,
    templateId: string,
    body: Record<string, string | undefined>,
    file: Express.Multer.File | undefined,
    user: ICurrentUser,
  ): Promise<CertificateTemplateResponse> {
    await this.checkEventAccess(eventId, user);

    const existing = await this.prisma.certificateTemplate.findFirst({
      where: { id: templateId, eventId },
    });
    if (!existing) {
      throw new NotFoundException('Шаблон не найден');
    }

    let templateUrl = existing.templateUrl;
    if (file) {
      const uploaded =
        await this.uploadsService.uploadCertificateTemplateImage(file);
      templateUrl = uploaded.url;
      try {
        await this.uploadsService.deleteTemplateFileByUrl(existing.templateUrl);
      } catch {
        // игнорируем ошибку удаления старого файла
      }
    }

    const roleResolution = await this.templateRoleResolver.resolveForWrite(
      eventId,
      body,
      {
        recipientRoleId: existing.recipientRoleId,
        recipientRole: existing.recipientRole,
      },
    );
    const recipientRole =
      roleResolution.legacyRecipientRole ?? existing.recipientRole;
    const size =
      body.sizePreset !== undefined ||
      body.widthPx !== undefined ||
      body.heightPx !== undefined
        ? this.parseTemplateSize(body)
        : {
            preset: existing.sizePreset,
            widthPx: existing.widthPx,
            heightPx: existing.heightPx,
          };
    const isActive =
      body.isActive !== undefined
        ? this.parseBoolean(body.isActive, existing.isActive)
        : existing.isActive;
    const isDefault =
      body.isDefault !== undefined
        ? this.parseBoolean(body.isDefault, existing.isDefault)
        : existing.isDefault;

    if (isDefault && !isActive) {
      throw new BadRequestException(
        'Default certificate template must be active. Set isActive=true or isDefault=false.',
      );
    }

    const namePositionParsed = body.namePosition
      ? this.parseJsonField(body.namePosition, 'namePosition')
      : existing.namePosition;
    if (
      body.namePosition &&
      (!namePositionParsed ||
        typeof (namePositionParsed as { x?: number }).x !== 'number')
    ) {
      throw new BadRequestException(
        'namePosition должен быть JSON-объектом с полями x и y',
      );
    }

    const existingTranslations = (existing.translations ??
      undefined) as BusinessTranslations | undefined;
    const nextTranslations =
      body.translations !== undefined
        ? this.parseTranslationsField(body.translations)
        : existingTranslations;
    const trimmedScalarName = body.name?.trim();
    const computedName =
      pickFallbackTranslation(
        nextTranslations,
        'name',
        trimmedScalarName ?? existing.name,
      ) ||
      trimmedScalarName ||
      existing.name;

    const updateData: Prisma.CertificateTemplateUpdateInput = {
      name: computedName,
      recipientRole,
      normalizedRecipientRole: {
        connect: { id: roleResolution.recipientRoleId },
      },
      sizePreset: size.preset,
      widthPx: size.widthPx,
      heightPx: size.heightPx,
      templateUrl,
      namePosition: (namePositionParsed as object) ?? undefined,
      nameFont:
        body.nameFont !== undefined
          ? body.nameFont.trim() || undefined
          : existing.nameFont,
      nameFontSize:
        body.nameFontSize !== undefined
          ? parseInt(body.nameFontSize, 10) || undefined
          : existing.nameFontSize,
      nameColor:
        body.nameColor !== undefined
          ? body.nameColor.trim() || undefined
          : existing.nameColor,
      isDefault,
      isActive,
    };

    if (body.translations !== undefined) {
      updateData.translations = (nextTranslations ?? {}) as Prisma.InputJsonValue;
    }

    const setJsonField = (
      key: keyof Prisma.CertificateTemplateUpdateInput,
      bodyVal: string | undefined,
      fieldName: string,
    ) => {
      if (bodyVal === undefined) return;
      const parsed = this.parseJsonField(bodyVal, fieldName);
      (updateData as Record<string, unknown>)[key] = parsed
        ? (parsed as Prisma.InputJsonValue)
        : Prisma.JsonNull;
    };
    setJsonField('datePosition', body.datePosition, 'datePosition');
    setJsonField(
      'eventNamePosition',
      body.eventNamePosition,
      'eventNamePosition',
    );
    setJsonField(
      'firstNamePosition',
      body.firstNamePosition,
      'firstNamePosition',
    );
    setJsonField('lastNamePosition', body.lastNamePosition, 'lastNamePosition');
    setJsonField('qrPosition', body.qrPosition, 'qrPosition');

    const template = await this.updateCertificateTemplate({
      eventId,
      templateId,
      data: updateData,
      recipientRoleId: roleResolution.recipientRoleId,
      roleCode: roleResolution.roleCode,
      isDefault,
      isActive,
    });

    return this.toTemplateResponse(template);
  }

  /**
   * Удаляет шаблон и файл
   */
  async deleteTemplate(
    eventId: string,
    templateId: string,
    user: ICurrentUser,
  ): Promise<void> {
    await this.checkEventAccess(eventId, user);

    const template = await this.prisma.certificateTemplate.findFirst({
      where: { id: templateId, eventId },
    });
    if (!template) {
      throw new NotFoundException('Шаблон не найден');
    }

    try {
      await this.uploadsService.deleteTemplateFileByUrl(template.templateUrl);
    } catch {
      // продолжаем удаление записи даже если файл не найден
    }
    await this.prisma.certificateTemplate.delete({
      where: { id: templateId },
    });
  }

  private parseTranslationsField(
    value: string | undefined,
  ): BusinessTranslations | undefined {
    if (value === undefined || value === '') return undefined;
    let parsed: unknown;
    try {
      parsed = JSON.parse(value) as unknown;
    } catch {
      throw new BadRequestException('Неверный формат JSON в поле translations');
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new BadRequestException(
        'Поле translations должно быть объектом { fieldKey: { ru?, uz?, en? } }',
      );
    }
    const allowedFields = new Set<string>(
      CERTIFICATE_TEMPLATE_TRANSLATION_FIELDS,
    );
    const allowedLocales = new Set(['ru', 'uz', 'en']);
    for (const [fieldKey, localeValues] of Object.entries(
      parsed as Record<string, unknown>,
    )) {
      if (!allowedFields.has(fieldKey)) {
        throw new BadRequestException(
          `Поле translations.${fieldKey} не поддерживается`,
        );
      }
      if (!localeValues || typeof localeValues !== 'object') {
        throw new BadRequestException(
          `Значение translations.${fieldKey} должно быть объектом`,
        );
      }
      for (const [locale, text] of Object.entries(
        localeValues as Record<string, unknown>,
      )) {
        if (!allowedLocales.has(locale)) {
          throw new BadRequestException(
            `Локаль translations.${fieldKey}.${locale} не поддерживается`,
          );
        }
        if (typeof text !== 'string') {
          throw new BadRequestException(
            `translations.${fieldKey}.${locale} должно быть строкой`,
          );
        }
      }
    }
    return parsed as BusinessTranslations;
  }

  private parseJsonField(
    value: string | undefined,
    fieldName: string,
  ): Record<string, unknown> | null {
    if (value === undefined || value === '') return null;
    try {
      const parsed = JSON.parse(value) as unknown;
      if (
        parsed !== null &&
        typeof parsed === 'object' &&
        !Array.isArray(parsed)
      ) {
        return parsed as Record<string, unknown>;
      }
      return null;
    } catch {
      throw new BadRequestException(`Неверный формат JSON в поле ${fieldName}`);
    }
  }

  private toTemplateResponse(
    template: CertificateTemplateWithRole,
  ): CertificateTemplateResponse {
    const { normalizedRecipientRole, ...data } = template;
    const legacyRecipientRole = normalizedRecipientRole
      ? roleCodeToParticipantRole(normalizedRecipientRole.code)
      : data.recipientRole;
    return {
      ...data,
      eventId: data.eventId,
      recipientRole: legacyRecipientRole,
      roleCode:
        normalizedRecipientRole?.code ?? data.recipientRole.toLowerCase(),
      roleDisplayName:
        normalizedRecipientRole?.displayName ?? data.recipientRole,
    };
  }

  private parseTemplateSize(body: Record<string, string | undefined>): {
    preset: string;
    widthPx: number;
    heightPx: number;
  } {
    const { preset, size } = resolveCertificateSizePreset(body.sizePreset);
    const widthPx = this.parsePositiveInt(body.widthPx, size.widthPx);
    const heightPx = this.parsePositiveInt(body.heightPx, size.heightPx);

    if (widthPx < 300 || heightPx < 300 || widthPx > 8000 || heightPx > 8000) {
      throw new BadRequestException(
        'Размер шаблона должен быть в диапазоне 300–8000 px по каждой стороне',
      );
    }

    return { preset, widthPx, heightPx };
  }

  private parseBoolean(value: string | undefined, fallback: boolean): boolean {
    if (value === undefined || value === '') return fallback;
    if (value === 'true') return true;
    if (value === 'false') return false;
    throw new BadRequestException('Boolean fields must be "true" or "false"');
  }

  /** Снимает флаг «основной» с других шаблонов той же роли (в транзакции записи). */
  private async demoteOtherDefaultTemplates(
    tx: Prisma.TransactionClient,
    args: {
      eventId: string;
      recipientRoleId: string;
      roleCode: string;
      exceptId?: string;
    },
  ): Promise<void> {
    const legacyRole = roleCodeToParticipantRole(args.roleCode);
    await tx.certificateTemplate.updateMany({
      where: {
        eventId: args.eventId,
        OR: [
          { recipientRoleId: args.recipientRoleId },
          ...(legacyRole
            ? [{ recipientRoleId: null, recipientRole: legacyRole }]
            : []),
        ],
        isDefault: true,
        ...(args.exceptId ? { id: { not: args.exceptId } } : {}),
      },
      data: { isDefault: false },
    });
  }

  private async assertNoActiveDefaultTemplate(
    eventId: string,
    recipientRoleId: string,
    roleCode: string,
    exceptId: string | undefined,
    isDefault: boolean,
    isActive: boolean,
  ): Promise<void> {
    if (!isDefault || !isActive) return;
    const legacyRole = roleCodeToParticipantRole(roleCode);
    const existing = await this.prisma.certificateTemplate.findFirst({
      where: {
        eventId,
        OR: [
          { recipientRoleId },
          ...(legacyRole
            ? [{ recipientRoleId: null, recipientRole: legacyRole }]
            : []),
        ],
        isDefault: true,
        isActive: true,
        ...(exceptId ? { id: { not: exceptId } } : {}),
      },
      select: { id: true, name: true },
    });
    if (existing) {
      throw new BadRequestException(
        `Active default certificate template already exists for role ${roleCode}: ${existing.name} (${existing.id}). Deactivate it or unset it as default first.`,
      );
    }
  }

  private async createCertificateTemplate(args: {
    eventId: string;
    name: string;
    translations: BusinessTranslations | undefined;
    recipientRole: ParticipantRole;
    recipientRoleId: string;
    roleCode: string;
    size: { preset: string; widthPx: number; heightPx: number };
    uploadedUrl: string;
    body: Record<string, string | undefined>;
    namePosition: Record<string, unknown>;
    isDefault: boolean;
    isActive: boolean;
  }): Promise<CertificateTemplateWithRole> {
    try {
      return await this.prisma.certificateTemplate.create({
        data: {
          eventId: args.eventId,
          name: args.name,
          translations: (args.translations ?? {}) as Prisma.InputJsonValue,
          recipientRole: args.recipientRole,
          recipientRoleId: args.recipientRoleId,
          sizePreset: args.size.preset,
          widthPx: args.size.widthPx,
          heightPx: args.size.heightPx,
          templateUrl: args.uploadedUrl,
          namePosition: args.namePosition as object,
          nameFont: args.body.nameFont?.trim() || undefined,
          nameFontSize: args.body.nameFontSize
            ? parseInt(args.body.nameFontSize, 10)
            : undefined,
          nameColor: args.body.nameColor?.trim() || undefined,
          datePosition: this.parseJsonField(
            args.body.datePosition,
            'datePosition',
          ) as object | undefined,
          eventNamePosition: this.parseJsonField(
            args.body.eventNamePosition,
            'eventNamePosition',
          ) as object | undefined,
          firstNamePosition: this.parseJsonField(
            args.body.firstNamePosition,
            'firstNamePosition',
          ) as object | undefined,
          lastNamePosition: this.parseJsonField(
            args.body.lastNamePosition,
            'lastNamePosition',
          ) as object | undefined,
          qrPosition: this.parseJsonField(
            args.body.qrPosition,
            'qrPosition',
          ) as object | undefined,
          isDefault: args.isDefault,
          isActive: args.isActive,
        },
        include: { normalizedRecipientRole: true },
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new BadRequestException(
          `Active default certificate template already exists for role ${args.roleCode}. Deactivate it or unset it as default first.`,
        );
      }
      throw error;
    }
  }

  /**
   * Обновление шаблона. Назначение основным — это переключение: прежний
   * основной шаблон роли разжалуется в той же транзакции, иначе частичный
   * уникальный индекс (один активный основной на роль) отклонил бы запись, и
   * кнопка «Сделать основным» упиралась бы в 400.
   */
  private async updateCertificateTemplate(args: {
    eventId: string;
    templateId: string;
    data: Prisma.CertificateTemplateUpdateInput;
    recipientRoleId: string;
    roleCode: string;
    isDefault: boolean;
    isActive: boolean;
  }): Promise<CertificateTemplateWithRole> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        if (args.isDefault && args.isActive) {
          await this.demoteOtherDefaultTemplates(tx, {
            eventId: args.eventId,
            recipientRoleId: args.recipientRoleId,
            roleCode: args.roleCode,
            exceptId: args.templateId,
          });
        }
        return tx.certificateTemplate.update({
          where: { id: args.templateId },
          data: args.data,
          include: { normalizedRecipientRole: true },
        });
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new BadRequestException(
          `Active default certificate template already exists for role ${args.roleCode}. Deactivate it or unset it as default first.`,
        );
      }
      throw error;
    }
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === 'P2002'
    );
  }

  private parsePositiveInt(
    value: string | undefined,
    fallback: number,
  ): number {
    if (value === undefined || value === '') return fallback;
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new BadRequestException(
        'Размер шаблона должен быть положительным числом',
      );
    }
    return parsed;
  }

  /**
   * Публичная верификация сертификата по ID или коду
   */
  async verifyCertificate(dto: VerifyCertificateDto): Promise<{
    valid: boolean;
    certificate?: {
      id: string;
      eventName: string | null;
      recipientName: string | null;
      issuedAt: string | null;
      eventDate: string | null;
      organizerName: string | null;
      organizerLogoUrl: string | null;
      recipientRole: string | null;
      eventLocation: string | null;
    };
  }> {
    if (!dto.certificateId && !dto.code?.trim()) {
      throw new BadRequestException(
        'Укажите certificateId или code для верификации',
      );
    }

    const where = dto.certificateId
      ? { id: dto.certificateId }
      : { verificationCode: dto.code!.trim() };

    const certificate = await this.prisma.certificate.findFirst({
      where,
      select: {
        id: true,
        eventName: true,
        recipientName: true,
        generatedAt: true,
        eventDate: true,
        recipientRole: { select: { displayName: true } },
        event: {
          select: {
            venue: true,
            city: true,
            organization: { select: { companyName: true, logoUrl: true } },
          },
        },
      },
    });

    if (!certificate) {
      return { valid: false };
    }

    const eventLocation =
      [certificate.event?.venue, certificate.event?.city]
        .filter((part): part is string => Boolean(part && part.trim()))
        .join(', ') || null;

    return {
      valid: true,
      certificate: {
        id: certificate.id,
        eventName: certificate.eventName,
        recipientName: certificate.recipientName,
        issuedAt: certificate.generatedAt?.toISOString() ?? null,
        eventDate: certificate.eventDate
          ? new Date(certificate.eventDate).toISOString().slice(0, 10)
          : null,
        organizerName: certificate.event?.organization?.companyName ?? null,
        organizerLogoUrl: certificate.event?.organization?.logoUrl ?? null,
        recipientRole: certificate.recipientRole?.displayName ?? null,
        eventLocation,
      },
    };
  }

  /**
   * Получает сертификат по регистрации (для пользователя)
   */
  async getMyCertificate(
    registrationId: string,
    user: ICurrentUser,
  ): Promise<Certificate | null> {
    if (user.type !== UserType.USER) {
      throw new ForbiddenException('Доступно только для пользователей');
    }

    const registration = await this.prisma.registration.findUnique({
      where: { id: registrationId },
      include: { certificate: true },
    });

    if (!registration) {
      throw new NotFoundException('Регистрация не найдена');
    }

    if (registration.userId !== user.sub) {
      throw new ForbiddenException('Нет доступа к этой регистрации');
    }

    return registration.certificate;
  }

  // === Private methods ===
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
    throw new ForbiddenException(
      'Только организаторы могут управлять сертификатами',
    );
  }
}
