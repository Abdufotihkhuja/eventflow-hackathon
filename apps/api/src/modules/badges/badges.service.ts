import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { QuotaService } from '../billing/quota/quota.service';
import { ConfigService } from '@nestjs/config';
import archiver from 'archiver';
import { promises as fs } from 'fs';
import * as path from 'path';
import PDFDocument from 'pdfkit';
import * as QRCode from 'qrcode';
import { PassThrough } from 'stream';
import {
  ParticipantRole,
  Prisma,
  RegistrationStatus,
  UserType,
  CoinMetric,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';
import { TicketQrService } from '../tickets/application/ticket-qr.service';
import {
  DEFAULT_CERTIFICATE_FONT_ID,
  parseCertificateNameFont,
  resolveCertificateFontFile,
} from '../certificates/application/certificate-fonts';
import type { ICurrentUser } from '../../common/interfaces';
import { DownloadBadgesDto } from './dto';
import {
  BusinessTranslations,
  pickFallbackTranslation,
} from '../translations/dto/business-translation.dto';
import {
  BADGE_SIZE_PRESETS,
  DEFAULT_BADGE_SIZE_PRESET,
  resolveBadgeSizePreset,
} from '../shared/artifact-size-presets';
import {
  artifactRecipientIdentityHash,
  artifactRecipientName,
  badgeTemplateVersionHash,
} from '../shared/artifact-identity';
import {
  ArtifactRecipientResolverService,
  ArtifactRecipientTarget,
  roleCodeToLegacyRecipientRole,
} from '../events/artifact-recipients/artifact-recipient-resolver.service';
import { ArtifactTemplateRoleResolverService } from '../events/artifact-recipients/artifact-template-role-resolver.service';
import { FileStorageService } from '../storage/application/file-storage.service';
import { QueueService } from '../platform/queue/queue.service';
import { QUEUE_NAMES } from '../platform/queue/queue.types';
import type { BadgesZipGenerationJobPayload } from '../platform/queue/queue.types';
import { BadgeZipProgressService } from './application/badge-zip-progress.service';

export const BADGE_TEMPLATE_TRANSLATION_FIELDS = ['name'] as const;

/** Сколько живёт собранный архив, прежде чем его уберут. */
const ARCHIVE_TTL_MS = 24 * 60 * 60 * 1000;

/** Ответ на запрос выгрузки: архив уже готов либо собирается в фоне. */
export type BadgesZipRequestResult = {
  status: 'ready' | 'processing';
  jobId: string;
  total: number;
};

export type BadgesZipStatus =
  | { status: 'ready'; jobId: string }
  | { status: 'processing'; jobId: string; done?: number; total?: number }
  | { status: 'failed'; jobId: string; failedReason?: string }
  /** Job'а нет, файла нет: Redis вычистил задание — нужно запросить заново. */
  | { status: 'expired'; jobId: string };

export type BadgeTemplateResponse = {
  id: string;
  eventId: string;
  name: string;
  translations: Prisma.JsonValue;
  recipientRole: ParticipantRole | null;
  recipientRoleId: string | null;
  roleCode: string;
  roleDisplayName: string;
  sizePreset: string;
  widthPx: number;
  heightPx: number;
  templateUrl: string;
  thumbnailUrl: string | null;
  namePosition: Prisma.JsonValue | null;
  nameFont: string | null;
  nameFontSize: number | null;
  nameColor: string | null;
  firstNamePosition: Prisma.JsonValue | null;
  lastNamePosition: Prisma.JsonValue | null;
  rolePosition: Prisma.JsonValue | null;
  eventNamePosition: Prisma.JsonValue | null;
  qrPosition: Prisma.JsonValue | null;
  roleLabel: string | null;
  roleFontSize: number | null;
  roleColor: string | null;
  eventLabel: string | null;
  eventFontSize: number | null;
  eventColor: string | null;
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

/** Ограничения текстов роли и названия события на бейдже. */
const BADGE_LABEL_MAX_LENGTH = 120;
const BADGE_SECONDARY_FONT_SIZE_MIN = 4;
const BADGE_SECONDARY_FONT_SIZE_MAX = 120;
const HEX_COLOR_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/** Fallback typography of the role / event name texts (pre-dates per-template settings). */
const BADGE_ROLE_TEXT_DEFAULTS = { fontPt: 8, color: '#4b5563' } as const;
const BADGE_EVENT_TEXT_DEFAULTS = { fontPt: 7, color: '#374151' } as const;

type BadgeTemplateWithRole = Prisma.BadgeTemplateGetPayload<{
  include: { normalizedRecipientRole: true };
}>;

type BadgePageConfig = {
  width: number;
  height: number;
};

@Injectable()
export class BadgesService {
  private readonly logger = new Logger(BadgesService.name);
  /**
   * Архивы лежат под UPLOADS_DIR, но каталог закрыт в nginx (см.
   * `location ^~ /uploads/badges/`): ZIP отдаётся только через эндпоинт с
   * проверкой прав — внутри имена участников и их QR.
   */
  private readonly archivesDir = 'badges/archives';

  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadsService: UploadsService,
    private readonly artifactRecipientResolver: ArtifactRecipientResolverService,
    private readonly templateRoleResolver: ArtifactTemplateRoleResolverService,
    private readonly configService: ConfigService,
    private readonly ticketQrService: TicketQrService,
    private readonly quotaService: QuotaService,
    private readonly storage: FileStorageService,
    private readonly queueService: QueueService,
    private readonly progress: BadgeZipProgressService,
  ) {}

  async findTemplatesByEvent(
    eventId: string,
    user: ICurrentUser,
  ): Promise<{ templates: BadgeTemplateResponse[] }> {
    await this.checkEventAccess(eventId, user);
    const templates = await this.prisma.badgeTemplate.findMany({
      where: { eventId },
      include: { normalizedRecipientRole: true },
      orderBy: [{ recipientRole: 'asc' }, { createdAt: 'asc' }],
    });
    return { templates: templates.map((template) => this.toTemplateResponse(template)) };
  }

  async createTemplate(
    eventId: string,
    body: Record<string, string | undefined>,
    file: Express.Multer.File | undefined,
    user: ICurrentUser,
  ): Promise<BadgeTemplateResponse> {
    await this.checkEventAccess(eventId, user);

    if (!file) {
      throw new BadRequestException('Файл шаблона бейджа обязателен');
    }

    const translations = this.parseTranslationsField(body.translations);
    const scalarName =
      pickFallbackTranslation(translations, 'name', body.name) ||
      body.name?.trim();
    if (!scalarName) {
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
        'Default badge template must be active. Set isActive=true or isDefault=false.',
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

    const uploaded = await this.uploadsService.uploadBadgeTemplateImage(file);

    return this.createBadgeTemplate({
      eventId,
      name: scalarName,
      translations,
      recipientRole,
      recipientRoleId: roleResolution.recipientRoleId,
      roleCode: roleResolution.roleCode,
      size,
      uploadedUrl: uploaded.url,
      body,
      isDefault,
      isActive,
    });
  }

  async updateTemplate(
    eventId: string,
    templateId: string,
    body: Record<string, string | undefined>,
    file: Express.Multer.File | undefined,
    user: ICurrentUser,
  ): Promise<BadgeTemplateResponse> {
    await this.checkEventAccess(eventId, user);

    const existing = await this.prisma.badgeTemplate.findFirst({
      where: { id: templateId, eventId },
    });
    if (!existing) {
      throw new NotFoundException('Шаблон бейджа не найден');
    }

    let templateUrl = existing.templateUrl;
    if (file) {
      const uploaded = await this.uploadsService.uploadBadgeTemplateImage(file);
      templateUrl = uploaded.url;
      await this.deleteTemplateFileQuietly(existing.templateUrl);
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
        'Default badge template must be active. Set isActive=true or isDefault=false.',
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

    const updateData: Prisma.BadgeTemplateUpdateInput = {
      name: computedName,
      recipientRole,
      normalizedRecipientRole: { connect: { id: roleResolution.recipientRoleId } },
      sizePreset: size.preset,
      widthPx: size.widthPx,
      heightPx: size.heightPx,
      templateUrl,
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

    this.assignJsonUpdate(updateData, body, 'namePosition');
    this.assignJsonUpdate(updateData, body, 'firstNamePosition');
    this.assignJsonUpdate(updateData, body, 'lastNamePosition');
    this.assignJsonUpdate(updateData, body, 'rolePosition');
    this.assignJsonUpdate(updateData, body, 'eventNamePosition');
    this.assignJsonUpdate(updateData, body, 'qrPosition');
    Object.assign(updateData, this.parseSecondaryTextFields(body));

    return this.updateBadgeTemplate({
      eventId,
      templateId,
      data: updateData,
      recipientRoleId: roleResolution.recipientRoleId,
      roleCode: roleResolution.roleCode,
      isDefault,
      isActive,
    });
  }

  async deleteTemplate(
    eventId: string,
    templateId: string,
    user: ICurrentUser,
  ): Promise<void> {
    await this.checkEventAccess(eventId, user);

    const template = await this.prisma.badgeTemplate.findFirst({
      where: { id: templateId, eventId },
    });
    if (!template) {
      throw new NotFoundException('Шаблон бейджа не найден');
    }

    await this.deleteTemplateFileQuietly(template.templateUrl);
    await this.prisma.badgeTemplate.delete({ where: { id: templateId } });
  }

  /**
   * Ставит выгрузку бейджей в очередь (или отдаёт уже готовый архив).
   *
   * Синхронной выгрузки здесь нет намеренно: бейджи не персистятся, каждый PDF
   * рендерится заново, и полсотни получателей не укладываются в HTTP-таймаут
   * браузера — организатор видел «Не удалось подключиться к серверу» на
   * работающем сервере. Инлайн остаётся только запасным путём, когда очередь
   * недоступна: лучше долгий запрос, чем неработающая кнопка.
   */
  async requestBadgesZip(
    eventId: string,
    dto: DownloadBadgesDto,
    user: ICurrentUser,
  ): Promise<BadgesZipRequestResult> {
    await this.checkEventAccess(eventId, user);
    await this.pruneStaleArchives();

    const targets = await this.resolveDownloadTargets(eventId, dto);
    const templates = await this.resolveTemplates(eventId, dto, targets);
    const jobId = this.buildZipJobId(eventId, dto, targets, templates);
    const relativePath = this.archivePath(jobId);

    // Повторный клик по той же выборке не пересобирает архив. Версия шаблонов
    // и имена получателей входят в ключ, так что правка дизайна или ФИО даёт
    // новый архив, а не вчерашний.
    if (this.storage.exists(relativePath)) {
      return { status: 'ready', jobId, total: targets.length };
    }

    const payload: BadgesZipGenerationJobPayload = {
      jobId,
      type: 'badge.zip',
      entityId: eventId,
      eventId,
      download: dto,
      requestedBy: {
        userId: user.sub,
        actorType: user.type,
        organizationId: user.organizationId,
      },
    };

    try {
      // jobId детерминирован от выборки, а BullMQ молча проглатывает повторную
      // постановку с тем же id. Файла нет, значит прошлый прогон либо упал,
      // либо его архив уже удалён — снимаем старое задание, иначе выгрузка
      // никогда не пересоберётся.
      const previous = await this.queueService.getJobStatus(
        QUEUE_NAMES.BADGES,
        jobId,
      );
      if (previous.state === 'completed' || previous.state === 'failed') {
        await this.queueService.removeJob(QUEUE_NAMES.BADGES, jobId);
      }

      await this.progress.start(jobId, targets.length);
      await this.queueService.enqueueBadgesZipGeneration(payload);
      return { status: 'processing', jobId, total: targets.length };
    } catch (error) {
      this.logger.warn(
        `Badge ZIP queue unavailable, falling back to inline render: ${
          error instanceof Error ? error.message : 'unknown'
        }`,
      );
      await this.renderAndStoreBadgesZip(eventId, dto, jobId);
      return { status: 'ready', jobId, total: targets.length };
    }
  }

  /** Обработчик job'а из очереди (worker → internal endpoint → сюда). */
  async processBadgesZipJob(
    payload: BadgesZipGenerationJobPayload,
  ): Promise<{ jobId: string; path: string }> {
    const path = await this.renderAndStoreBadgesZip(
      payload.eventId,
      payload.download,
      payload.jobId,
    );
    return { jobId: payload.jobId, path };
  }

  /**
   * Статус выгрузки для прогресс-бара. Готовность определяет наличие файла, а
   * не состояние job'а: архив переживает вычистку выполненных job'ов из Redis.
   */
  async getBadgesZipStatus(
    eventId: string,
    jobId: string,
    user: ICurrentUser,
  ): Promise<BadgesZipStatus> {
    await this.checkEventAccess(eventId, user);

    if (this.storage.exists(this.archivePath(jobId))) {
      return { status: 'ready', jobId };
    }

    const [job, progress] = await Promise.all([
      this.queueService.getJobStatus(QUEUE_NAMES.BADGES, jobId),
      this.progress.read(jobId),
    ]);

    if (job.state === 'failed') {
      return {
        status: 'failed',
        jobId,
        failedReason: job.failedReason,
      };
    }

    // completed без файла — архив успели вычистить: пусть фронт запросит заново.
    if (job.state === 'unknown' || job.state === 'completed') {
      return { status: 'expired', jobId };
    }

    return {
      status: 'processing',
      jobId,
      ...(progress ? { done: progress.done, total: progress.total } : {}),
    };
  }

  /** Готовый архив для скачивания. */
  async openBadgesZip(
    eventId: string,
    jobId: string,
    user: ICurrentUser,
  ): Promise<{ path: string; filename: string }> {
    await this.checkEventAccess(eventId, user);
    const relativePath = this.archivePath(jobId);
    if (!this.storage.exists(relativePath)) {
      throw new NotFoundException('Архив бейджей не найден или устарел');
    }
    return { path: relativePath, filename: `${jobId}.zip` };
  }

  private async renderAndStoreBadgesZip(
    eventId: string,
    dto: DownloadBadgesDto,
    jobId: string,
  ): Promise<string> {
    const relativePath = this.archivePath(jobId);
    if (this.storage.exists(relativePath)) {
      return relativePath;
    }

    const { buffer } = await this.renderBadgesZip(eventId, dto, jobId);
    this.storage.ensureDirectory(this.archivesDir);
    await this.storage.save({
      buffer,
      originalName: `${jobId}.zip`,
      mimetype: 'application/zip',
      size: buffer.byteLength,
      directory: this.archivesDir,
      fileName: `${jobId}.zip`,
    });
    await this.progress.clear(jobId);
    return relativePath;
  }

  private async resolveDownloadTargets(
    eventId: string,
    dto: DownloadBadgesDto,
  ): Promise<ArtifactRecipientTarget[]> {
    const onlyApproved = dto.onlyApproved !== false;
    const isManualSelection = Boolean(
      dto.recipientIds?.length || dto.registrationIds?.length,
    );

    // Ручная выборка не должна падать целиком из-за неподходящих получателей.
    // Организатор отмечает людей списком, и среди них попадаются заявки в
    // ожидании: предпросмотр показывает их как «исключено», а выгрузка отвечала
    // 400 со списком id — кнопка просто не работала. Резолвер жёстко проверяет
    // совпадение только когда сам применяет фильтр статуса, поэтому для ручной
    // выборки статус проверяем после (как в сертификатах).
    const resolved = await this.artifactRecipientResolver.resolveTargets({
      eventId,
      recipientIds: dto.recipientIds,
      registrationIds: dto.registrationIds,
      recipientRoleId: dto.recipientRoleId,
      recipientRoleIds: dto.recipientRoleIds,
      roleId: dto.roleId,
      roleCode: dto.roleCode,
      recipientRole: dto.recipientRole,
      scope: dto.scope,
      requireApprovedRegistration: onlyApproved && !isManualSelection,
    });

    const eligible =
      isManualSelection && onlyApproved
        ? await this.filterApprovedTargets(eventId, resolved)
        : resolved;

    if (eligible.length === 0) {
      throw new NotFoundException('Нет получателей для скачивания бейджей');
    }

    return this.filterTargetsWithTemplates(eventId, dto, eligible);
  }

  /**
   * Оставляет только получателей с подтверждённой регистрацией. Получатели без
   * регистрации (спикеры, добавленные вручную) под это правило не попадают.
   */
  private async filterApprovedTargets(
    eventId: string,
    targets: ArtifactRecipientTarget[],
  ): Promise<ArtifactRecipientTarget[]> {
    const registrationIds = targets
      .map((target) => target.registrationId)
      .filter((id): id is string => !!id);
    if (registrationIds.length === 0) return targets;

    const { approved } =
      await this.artifactRecipientResolver.classifyRegistrationEligibility(
        eventId,
        registrationIds,
      );

    return targets.filter(
      (target) =>
        !target.registrationId || approved.has(target.registrationId),
    );
  }

  /**
   * Роли без активного шаблона по умолчанию пропускаются, а не рушат выгрузку:
   * предпросмотр так и обещает («будет пропущено — нет шаблона»), и из-за
   * одного Staff без шаблона организатор не должен терять бейджи полутора сотен
   * участников. Если шаблона нет ни у одной роли — это уже ошибка.
   */
  private async filterTargetsWithTemplates(
    eventId: string,
    dto: DownloadBadgesDto,
    targets: ArtifactRecipientTarget[],
  ): Promise<ArtifactRecipientTarget[]> {
    if (dto.templateId) return targets;

    const withTemplate = new Set<string>();
    const missing: string[] = [];
    for (const roleId of [
      ...new Set(targets.map((target) => target.recipientRoleId)),
    ]) {
      const target = targets.find((item) => item.recipientRoleId === roleId);
      if (!target) continue;
      const template = await this.findDefaultBadgeTemplateForTarget(
        eventId,
        target,
      );
      if (template) {
        withTemplate.add(roleId);
      } else {
        missing.push(target.roleCode);
      }
    }

    if (withTemplate.size === 0) {
      throw new BadRequestException(
        `Нет шаблона бейджа для ролей: ${missing.join(', ')}. Загрузите активные шаблоны по умолчанию.`,
      );
    }
    if (missing.length > 0) {
      this.logger.log(
        `Badge ZIP for event ${eventId}: skipping roles without a default template: ${missing.join(', ')}`,
      );
    }

    return targets.filter((target) =>
      withTemplate.has(target.recipientRoleId),
    );
  }

  /**
   * Один и тот же набор получателей + те же шаблоны → один job и один файл.
   * В ключ входит всё, что печатается: версия каждого шаблона и идентичность
   * (ФИО, email, роль) каждого получателя. Изменилось хоть что-то — архив
   * собирается заново.
   */
  private buildZipJobId(
    eventId: string,
    dto: DownloadBadgesDto,
    targets: ArtifactRecipientTarget[],
    templates: Map<string, BadgeTemplateResponse>,
  ): string {
    const templateVersions = [...templates.entries()]
      .map(
        ([roleId, template]) =>
          `${roleId}=${template.id}:${badgeTemplateVersionHash(template)}`,
      )
      .sort();
    return this.queueService.createJobId([
      'badges-zip',
      eventId,
      dto.templateId,
      String(dto.onlyApproved !== false),
      ...templateVersions,
      ...targets.map((target) => artifactRecipientIdentityHash(target)).sort(),
    ]);
  }

  private archivePath(jobId: string): string {
    return `${this.archivesDir}/${jobId}.zip`;
  }

  /**
   * Удаляет архивы старше суток.
   *
   * Внутри ZIP — имена участников и их QR, и копиться бессрочно они не должны.
   * Уборка идёт прямо в запросе выгрузки, а не отдельным свипом: каталог
   * наполняется только этой ручкой, так что момент подходящий, а лишнего
   * планировщика не появляется. Сбой уборки не должен ломать выгрузку.
   */
  private async pruneStaleArchives(): Promise<void> {
    const cutoff = Date.now() - ARCHIVE_TTL_MS;
    try {
      const dir = this.storage.getAbsolutePath(this.archivesDir);
      const entries = await fs.readdir(dir).catch(() => [] as string[]);
      await Promise.all(
        entries
          .filter((name) => name.endsWith('.zip'))
          .map(async (name) => {
            const file = path.join(dir, name);
            const stat = await fs.stat(file);
            if (stat.mtimeMs < cutoff) {
              await fs.unlink(file);
            }
          }),
      );
    } catch (error) {
      this.logger.warn(
        `Failed to prune badge archives: ${
          error instanceof Error ? error.message : 'unknown'
        }`,
      );
    }
  }

  /**
   * Синхронный рендер архива. Публичный, потому что это и есть единица работы
   * задания: очередь и инлайн-фолбэк зовут его же.
   */
  async renderBadgesZip(
    eventId: string,
    dto: DownloadBadgesDto,
    jobId?: string,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const targets = await this.resolveDownloadTargets(eventId, dto);

    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { title: true, organizationId: true },
    });
    const eventTitle = event?.title ?? 'event';
    const files: Array<{ name: string; buffer: Buffer }> = [];
    const templates = await this.resolveTemplates(eventId, dto, targets);
    const registrationQrUrls = await this.resolveRegistrationQrUrls(
      eventId,
      targets,
    );
    const templateImagePaths = new Map(
      [...templates.entries()].map(([roleId, template]) => [
        roleId,
        this.uploadsService.getTemplateFilePath(template.templateUrl),
      ]),
    );

    for (const target of targets) {
      const template = templates.get(target.recipientRoleId);
      const templateImagePath = templateImagePaths.get(target.recipientRoleId);
      if (!template || !templateImagePath) {
        throw new BadRequestException(
          `Нет шаблона бейджа для роли "${target.roleCode}". Загрузите активный шаблон по умолчанию.`,
        );
      }
      const fullName = artifactRecipientName(target);
      // E-6/PC-8: бейдж не персистится — единица квоты определяется естественным
      // ключом ПЕРВОГО рендера (event, получатель, шаблон); повторное скачивание
      // с тем же ключом бесплатно (идемпотентность E-10).
      await this.quotaService.consume({
        organizationId: event?.organizationId ?? '',
        metric: CoinMetric.GENERATION_UNITS,
        quantity: 1,
        idempotencyKey: `badge:${eventId}:${target.recipientId}:${template.id}`,
        eventId,
      });
      const pdf = await this.buildBadgePdf(template, templateImagePath, {
        fullName,
        firstName: target.firstName ?? '',
        lastName: target.lastName ?? '',
        email: target.email ?? '',
        eventTitle,
        roleCode: target.roleCode,
        roleDisplayName: target.roleDisplayName,
        qrCode: target.registrationId
          ? (registrationQrUrls.get(target.registrationId) ?? null)
          : null,
      });
      files.push({
        name: `${this.safeFilename(fullName)}-${this.safeFilename(target.roleCode)}-${target.recipientId.slice(0, 8)}.pdf`,
        buffer: pdf,
      });
      if (jobId) {
        await this.progress.advance(jobId, files.length, targets.length);
      }
    }

    return {
      buffer: await this.createZipArchive(files),
      filename: `badges-${this.safeFilename(eventTitle)}-${this.safeFilename(this.downloadRoleLabel(dto, targets))}.zip`,
    };
  }

  private async resolveTemplates(
    eventId: string,
    dto: DownloadBadgesDto,
    targets: ArtifactRecipientTarget[],
  ): Promise<Map<string, BadgeTemplateResponse>> {
    if (dto.templateId) {
      const template = await this.prisma.badgeTemplate.findFirst({
        where: { id: dto.templateId, eventId, isActive: true },
        include: { normalizedRecipientRole: true },
        orderBy: [{ createdAt: 'asc' }],
      });
      if (!template) {
        throw new BadRequestException(
          'Шаблон бейджа не найден для этого мероприятия или неактивен.',
        );
      }
      for (const target of targets) {
        if (!this.templateMatchesTarget(template, target)) {
          throw new BadRequestException(
            `Шаблон бейджа не соответствует роли "${target.roleCode}". Выберите шаблон для этой роли.`,
          );
        }
      }
      return new Map(
        targets.map((target) => [
          target.recipientRoleId,
          this.toTemplateResponse(template),
        ]),
      );
    }

    const byRole = new Map<string, BadgeTemplateResponse>();
    const missing: string[] = [];
    for (const roleId of [
      ...new Set(targets.map((target) => target.recipientRoleId)),
    ]) {
      const target = targets.find((item) => item.recipientRoleId === roleId);
      if (!target) continue;
      const template = await this.findDefaultBadgeTemplateForTarget(
        eventId,
        target,
      );
      if (template) {
        byRole.set(roleId, template);
      } else {
        missing.push(target.roleCode);
      }
    }
    if (missing.length > 0) {
      throw new BadRequestException(
        `Нет шаблона бейджа для ролей: ${missing.join(', ')}. Загрузите активные шаблоны по умолчанию.`,
      );
    }
    return byRole;
  }

  private async findDefaultBadgeTemplateForTarget(
    eventId: string,
    target: ArtifactRecipientTarget,
  ): Promise<BadgeTemplateResponse | null> {
    const normalizedTemplates = await this.prisma.badgeTemplate.findMany({
      where: {
        eventId,
        isActive: true,
        isDefault: true,
        recipientRoleId: target.recipientRoleId,
      },
      include: { normalizedRecipientRole: true },
      orderBy: [{ createdAt: 'asc' }],
      take: 2,
    });
    if (normalizedTemplates.length > 1) {
      throw new BadRequestException(
        `Duplicate active default badge templates for role "${target.roleCode}". Deactivate duplicates first.`,
      );
    }
    if (normalizedTemplates[0]) {
      return this.toTemplateResponse(normalizedTemplates[0]);
    }

    const recipientRole = roleCodeToLegacyRecipientRole(target.roleCode);
    if (!recipientRole) {
      return this.findSoleActiveBadgeTemplateForRole(
        eventId,
        target.recipientRoleId,
      );
    }
    const legacyTemplates = await this.prisma.badgeTemplate.findMany({
      where: {
        eventId,
        isActive: true,
        isDefault: true,
        recipientRoleId: null,
        recipientRole,
      },
      include: { normalizedRecipientRole: true },
      orderBy: [{ createdAt: 'asc' }],
      take: 2,
    });
    if (legacyTemplates.length > 1) {
      throw new BadRequestException(
        `Duplicate active default badge templates for legacy role "${recipientRole}". Deactivate duplicates first.`,
      );
    }
    return legacyTemplates[0]
      ? this.toTemplateResponse(legacyTemplates[0])
      : this.findSoleActiveBadgeTemplateForRole(
          eventId,
          target.recipientRoleId,
        );
  }

  /**
   * Единственный активный шаблон роли, если основной не отмечен.
   *
   * Отвечать «нет шаблона для роли staff», когда шаблон загружен и он там один,
   * — неправда: выбирать не из чего. Двусмысленность (несколько шаблонов без
   * основного) по-прежнему требует явного выбора организатора.
   */
  private async findSoleActiveBadgeTemplateForRole(
    eventId: string,
    recipientRoleId: string,
  ): Promise<BadgeTemplateResponse | null> {
    const templates = await this.prisma.badgeTemplate.findMany({
      where: { eventId, isActive: true, recipientRoleId },
      include: { normalizedRecipientRole: true },
      orderBy: [{ createdAt: 'asc' }],
      take: 2,
    });
    return templates.length === 1 ? this.toTemplateResponse(templates[0]) : null;
  }

  private templateMatchesTarget(
    template: Pick<BadgeTemplateWithRole, 'recipientRoleId' | 'recipientRole'>,
    target: ArtifactRecipientTarget,
  ): boolean {
    if (template.recipientRoleId) {
      return template.recipientRoleId === target.recipientRoleId;
    }
    return (
      roleCodeToLegacyRecipientRole(target.roleCode) === template.recipientRole
    );
  }

  private async buildBadgePdf(
    template: BadgeTemplateResponse,
    templateImagePath: string,
    data: {
      fullName: string;
      firstName: string;
      lastName: string;
      email: string;
      eventTitle: string;
      roleCode: string;
      roleDisplayName: string;
      qrCode: string | null;
    },
  ): Promise<Buffer> {
    const page = this.resolvePdfPage(template.sizePreset);
    const fullNameRect = this.rectPx(template.namePosition, page, {
      x: 8,
      y: 42,
      width: 58,
      height: 12,
    });
    const firstNameRect = this.rectPx(template.firstNamePosition, page, {
      x: 8,
      y: 38,
      width: 58,
      height: 10,
    });
    const lastNameRect = this.rectPx(template.lastNamePosition, page, {
      x: 8,
      y: 50,
      width: 58,
      height: 10,
    });
    const roleRect = this.rectPx(template.rolePosition, page, {
      x: 8,
      y: 65,
      width: 45,
      height: 8,
    });
    const eventRect = this.rectPx(template.eventNamePosition, page, {
      x: 8,
      y: 18,
      width: 62,
      height: 8,
    });
    const qrRect = this.rectPx(template.qrPosition, page, {
      x: 74,
      y: 44,
      width: 18,
      height: 28,
    });

    // A QR code must stay square: the selected area can be non-square (width% is
    // taken against the page width, height% against the page height, and the
    // default badge QR area is intentionally non-square), so we render a square
    // sized to the smaller side, anchored at the area's top-left. Stretching to
    // the full box distorts the code and overflows its frame.
    const qrSize = Math.min(qrRect.width, qrRect.height);
    const qrBuffer = data.qrCode
      ? await QRCode.toBuffer(data.qrCode, {
          width: Math.round(qrSize),
          margin: 0,
        })
      : null;

    // Типографика имени настраивается в шаблоне (как у сертификатов); null —
    // прежние захардкоженные значения, чтобы старые шаблоны рендерились как раньше.
    // Явно выбранный организатором размер применяется как есть (без clamp) —
    // редактор показывает ровно его, и PDF должен совпадать с предпросмотром.
    const { fontId, bold: nameBold } = parseCertificateNameFont(
      template.nameFont,
    );
    const nameColor = template.nameColor ?? '#111827';
    // Выравнивание хранится внутри JSON позиции имени (без отдельной колонки).
    const nameAlign = this.readNameAlign(
      template.firstNamePosition ?? template.lastNamePosition,
    );

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: [page.width, page.height],
        margins: { top: 0, right: 0, bottom: 0, left: 0 },
      });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer | string) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      });
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      try {
        doc.image(templateImagePath, 0, 0, {
          width: page.width,
          height: page.height,
        });

        // Регистрируем кириллический шрифт до отрисовки: встроенная Helvetica
        // в PDFKit покрывает только Latin-1 и ломает кириллицу (та же схема,
        // что у сертификатов). Каскад отказов: выбранный шрифт → Inter → Helvetica.
        const NAME_FONT = 'BadgeNameFont';
        const TEXT_FONT = 'BadgeTextFont';
        let nameDrawFont = NAME_FONT;
        let textDrawFont = TEXT_FONT;
        try {
          doc.registerFont(
            NAME_FONT,
            resolveCertificateFontFile(fontId, nameBold),
          );
        } catch {
          try {
            doc.registerFont(
              NAME_FONT,
              resolveCertificateFontFile(DEFAULT_CERTIFICATE_FONT_ID, nameBold),
            );
          } catch {
            nameDrawFont = nameBold ? 'Helvetica-Bold' : 'Helvetica';
          }
        }
        try {
          // Роль и название события — то же семейство, но regular 400.
          doc.registerFont(TEXT_FONT, resolveCertificateFontFile(fontId, false));
        } catch {
          try {
            doc.registerFont(
              TEXT_FONT,
              resolveCertificateFontFile(DEFAULT_CERTIFICATE_FONT_ID, false),
            );
          } catch {
            textDrawFont = 'Helvetica';
          }
        }

        doc.fillColor(nameColor).font(nameDrawFont);
        if (template.firstNamePosition || template.lastNamePosition) {
          doc.fontSize(template.nameFontSize ?? this.fontSize(page, 17));
          doc.text(data.firstName, firstNameRect.x, firstNameRect.y, {
            width: firstNameRect.width,
            height: firstNameRect.height,
            align: nameAlign,
          });
          doc.text(data.lastName, lastNameRect.x, lastNameRect.y, {
            width: lastNameRect.width,
            height: lastNameRect.height,
            align: nameAlign,
          });
        } else {
          doc.fontSize(template.nameFontSize ?? this.fontSize(page, 18));
          doc.text(data.fullName, fullNameRect.x, fullNameRect.y, {
            width: fullNameRect.width,
            height: fullNameRect.height,
            align: nameAlign,
          });
        }

        // Роль и название события: текст, кегль и цвет задаются в шаблоне по
        // отдельности; null — прежние значения. Явный кегль, как и у имени,
        // применяется без clamp, чтобы PDF совпадал с превью редактора.
        doc
          .font(textDrawFont)
          .fontSize(
            template.roleFontSize ??
              this.fontSize(page, BADGE_ROLE_TEXT_DEFAULTS.fontPt),
          )
          .fillColor(template.roleColor ?? BADGE_ROLE_TEXT_DEFAULTS.color)
          .text(
            template.roleLabel ?? this.roleLabel(data),
            roleRect.x,
            roleRect.y,
            {
              width: roleRect.width,
              height: roleRect.height,
            },
          );

        doc
          .fontSize(
            template.eventFontSize ??
              this.fontSize(page, BADGE_EVENT_TEXT_DEFAULTS.fontPt),
          )
          .fillColor(template.eventColor ?? BADGE_EVENT_TEXT_DEFAULTS.color)
          .text(
            template.eventLabel ?? data.eventTitle,
            eventRect.x,
            eventRect.y,
            {
              width: eventRect.width,
              height: eventRect.height,
            },
          );

        if (qrBuffer) {
          doc.image(qrBuffer, qrRect.x, qrRect.y, {
            width: qrSize,
            height: qrSize,
          });
        }

        doc.end();
      } catch (error) {
        doc.end();
        reject(error);
      }
    });
  }

  private async resolveRegistrationQrUrls(
    eventId: string,
    targets: ArtifactRecipientTarget[],
  ): Promise<Map<string, string>> {
    const registrationIds = [
      ...new Set(
        targets
          .map((target) => target.registrationId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];

    if (registrationIds.length === 0) {
      return new Map();
    }

    const registrations = await this.prisma.registration.findMany({
      where: {
        eventId,
        id: { in: registrationIds },
        status: RegistrationStatus.APPROVED,
        qrCode: { not: null },
      },
      select: { id: true, qrCode: true, qrPayloadVersion: true },
    });
    const appUrl = this.configService
      .get<string>('frontend.appUrl')
      ?.replace(/\/$/, '');

    // QR бейджа = QR билета: подписанный v2-payload (защита от подделки,
    // отзыв через qrPayloadVersion), завёрнутый в URL страницы check-in.
    return new Map(
      registrations.flatMap((registration) =>
        appUrl && registration.qrCode
          ? [
              [
                registration.id,
                `${appUrl}/check-in?code=${encodeURIComponent(
                  this.ticketQrService.encodeQrPayload({
                    id: registration.id,
                    qrCode: registration.qrCode,
                    qrPayloadVersion: registration.qrPayloadVersion,
                  }),
                )}`,
              ] as const,
            ]
          : [],
      ),
    );
  }

  private createZipArchive(
    files: Array<{ name: string; buffer: Buffer }>,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const output = new PassThrough();
      const archive = archiver('zip', { zlib: { level: 9 } });
      const chunks: Buffer[] = [];

      output.on('data', (chunk: Buffer | string) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      });
      output.on('end', () => resolve(Buffer.concat(chunks)));
      output.on('error', reject);
      archive.on('error', reject);

      archive.pipe(output);
      for (const file of files) {
        archive.append(file.buffer, { name: file.name });
      }
      void archive.finalize();
    });
  }

  private rectPx(
    value: Prisma.JsonValue | null,
    page: BadgePageConfig,
    fallback: { x: number; y: number; width: number; height: number },
  ): { x: number; y: number; width: number; height: number } {
    const rect = this.asRect(value);
    return {
      x: ((rect?.x ?? fallback.x) / 100) * page.width,
      y: ((rect?.y ?? fallback.y) / 100) * page.height,
      width: ((rect?.width ?? fallback.width) / 100) * page.width,
      height: ((rect?.height ?? fallback.height) / 100) * page.height,
    };
  }

  /** Читает выравнивание имени, сохранённое внутри JSON позиции имени. */
  private readNameAlign(
    value: Prisma.JsonValue | null | undefined,
  ): 'left' | 'center' | 'right' {
    const align = (value as { align?: unknown } | null)?.align;
    return align === 'center' || align === 'right' ? align : 'left';
  }

  private asRect(
    value: Prisma.JsonValue | null,
  ): { x?: number; y?: number; width?: number; height?: number } | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }
    const record = value as Record<string, unknown>;
    return {
      x: typeof record.x === 'number' ? record.x : undefined,
      y: typeof record.y === 'number' ? record.y : undefined,
      width: typeof record.width === 'number' ? record.width : undefined,
      height: typeof record.height === 'number' ? record.height : undefined,
    };
  }

  private resolvePdfPage(sizePreset: string | null): BadgePageConfig {
    const preset =
      sizePreset && sizePreset in BADGE_SIZE_PRESETS
        ? BADGE_SIZE_PRESETS[sizePreset as keyof typeof BADGE_SIZE_PRESETS]
        : BADGE_SIZE_PRESETS[DEFAULT_BADGE_SIZE_PRESET];
    return {
      width: this.mmToPt(preset.widthMm),
      height: this.mmToPt(preset.heightMm),
    };
  }

  private parseTemplateSize(body: Record<string, string | undefined>): {
    preset: string;
    widthPx: number;
    heightPx: number;
  } {
    const { preset, size } = resolveBadgeSizePreset(body.sizePreset);
    const widthPx = this.parsePositiveInt(body.widthPx, size.widthPx);
    const heightPx = this.parsePositiveInt(body.heightPx, size.heightPx);

    if (widthPx < 300 || heightPx < 300 || widthPx > 3000 || heightPx > 3000) {
      throw new BadRequestException(
        'Размер бейджа должен быть в диапазоне 300–3000 px по каждой стороне',
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

  private async assertNoActiveDefaultTemplate(
    eventId: string,
    recipientRoleId: string,
    roleCode: string,
    exceptId: string | undefined,
    isDefault: boolean,
    isActive: boolean,
  ): Promise<void> {
    if (!isDefault || !isActive) return;
    const legacyRole = roleCodeToLegacyRecipientRole(roleCode);
    const existing = await this.prisma.badgeTemplate.findFirst({
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
        `Active default badge template already exists for role ${roleCode}: ${existing.name} (${existing.id}). Deactivate it or unset it as default first.`,
      );
    }
  }

  private async createBadgeTemplate(args: {
    eventId: string;
    name: string;
    translations: BusinessTranslations | undefined;
    recipientRole: ParticipantRole;
    recipientRoleId: string;
    roleCode: string;
    size: { preset: string; widthPx: number; heightPx: number };
    uploadedUrl: string;
    body: Record<string, string | undefined>;
    isDefault: boolean;
    isActive: boolean;
  }): Promise<BadgeTemplateResponse> {
    try {
      const template = await this.prisma.badgeTemplate.create({
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
          namePosition: this.parseJsonField(
            args.body.namePosition,
            'namePosition',
          ),
          nameFont: args.body.nameFont?.trim() || undefined,
          nameFontSize: args.body.nameFontSize
            ? parseInt(args.body.nameFontSize, 10)
            : undefined,
          nameColor: args.body.nameColor?.trim() || undefined,
          firstNamePosition: this.parseJsonField(
            args.body.firstNamePosition,
            'firstNamePosition',
          ),
          lastNamePosition: this.parseJsonField(
            args.body.lastNamePosition,
            'lastNamePosition',
          ),
          rolePosition: this.parseJsonField(
            args.body.rolePosition,
            'rolePosition',
          ),
          eventNamePosition: this.parseJsonField(
            args.body.eventNamePosition,
            'eventNamePosition',
          ),
          qrPosition: this.parseJsonField(args.body.qrPosition, 'qrPosition'),
          ...this.parseSecondaryTextFields(args.body),
          isDefault: args.isDefault,
          isActive: args.isActive,
        },
        include: { normalizedRecipientRole: true },
      });
      return this.toTemplateResponse(template);
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new BadRequestException(
          `Active default badge template already exists for role ${args.roleCode}. Deactivate it or unset it as default first.`,
        );
      }
      throw error;
    }
  }

  /**
   * Обновление шаблона. Назначение основным — это переключение: прежний
   * основной шаблон роли разжалуется в той же транзакции, иначе частичный
   * уникальный индекс (один активный основной на роль) отклонял бы запись —
   * из-за этого кнопка «Сделать основным» падала с 400.
   */
  private async updateBadgeTemplate(args: {
    eventId: string;
    templateId: string;
    data: Prisma.BadgeTemplateUpdateInput;
    recipientRoleId: string;
    roleCode: string;
    isDefault: boolean;
    isActive: boolean;
  }): Promise<BadgeTemplateResponse> {
    try {
      const template = await this.prisma.$transaction(async (tx) => {
        if (args.isDefault && args.isActive) {
          await this.demoteOtherDefaultTemplates(tx, {
            eventId: args.eventId,
            recipientRoleId: args.recipientRoleId,
            roleCode: args.roleCode,
            exceptId: args.templateId,
          });
        }
        return tx.badgeTemplate.update({
          where: { id: args.templateId },
          data: args.data,
          include: { normalizedRecipientRole: true },
        });
      });
      return this.toTemplateResponse(template);
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new BadRequestException(
          `Active default badge template already exists for role ${args.roleCode}. Deactivate it or unset it as default first.`,
        );
      }
      throw error;
    }
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
    const legacyRole = roleCodeToLegacyRecipientRole(args.roleCode);
    await tx.badgeTemplate.updateMany({
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
      throw new BadRequestException('Размер бейджа должен быть положительным');
    }
    return parsed;
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
    const allowedFields = new Set<string>(BADGE_TEMPLATE_TRANSLATION_FIELDS);
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
  ): Prisma.InputJsonValue | undefined {
    if (value === undefined || value === '') return undefined;
    try {
      const parsed = JSON.parse(value) as unknown;
      if (
        parsed !== null &&
        typeof parsed === 'object' &&
        !Array.isArray(parsed)
      ) {
        return parsed as Prisma.InputJsonObject;
      }
      throw new Error('invalid');
    } catch {
      throw new BadRequestException(`Неверный формат JSON в поле ${fieldName}`);
    }
  }

  private assignJsonUpdate(
    updateData: Prisma.BadgeTemplateUpdateInput,
    body: Record<string, string | undefined>,
    key:
      | 'namePosition'
      | 'firstNamePosition'
      | 'lastNamePosition'
      | 'rolePosition'
      | 'eventNamePosition'
      | 'qrPosition',
  ): void {
    if (body[key] === undefined) return;
    updateData[key] =
      this.parseJsonField(body[key], key) ?? (Prisma.JsonNull as never);
  }

  private toTemplateResponse(
    template: BadgeTemplateWithRole,
  ): BadgeTemplateResponse {
    const { normalizedRecipientRole, ...data } = template;
    return {
      ...data,
      recipientRole: normalizedRecipientRole
        ? roleCodeToLegacyRecipientRole(normalizedRecipientRole.code)
        : data.recipientRole,
      roleCode:
        normalizedRecipientRole?.code ?? data.recipientRole.toLowerCase(),
      roleDisplayName:
        normalizedRecipientRole?.displayName ?? data.recipientRole,
    };
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
    throw new ForbiddenException(
      'Только организаторы могут управлять бейджами',
    );
  }

  private async deleteTemplateFileQuietly(url: string): Promise<void> {
    try {
      await this.uploadsService.deleteTemplateFileByUrl(url);
    } catch {
      // Удаление записи не должно падать из-за отсутствующего файла.
    }
  }

  private mmToPt(mm: number): number {
    return (mm / 25.4) * 72;
  }

  private fontSize(page: BadgePageConfig, size: number): number {
    return Math.max(6, Math.min(size, page.height * 0.11));
  }

  /**
   * Текст роли по умолчанию (когда в шаблоне не задан свой): встроенные роли
   * печатаются как Participant/Speaker/Mentor, кастомные — по displayName
   * роли, который организатор задаёт в списке ролей. Фронт зеркалит это в
   * badgeRolePdfLabel (event-badges-tab.tsx).
   */
  private roleLabel(role: {
    roleCode: string;
    roleDisplayName: string;
  }): string {
    const legacyRole = roleCodeToLegacyRecipientRole(role.roleCode);
    if (legacyRole === ParticipantRole.SPEAKER) return 'Speaker';
    if (legacyRole === ParticipantRole.MENTOR) return 'Mentor';
    if (legacyRole === ParticipantRole.PARTICIPANT) return 'Participant';
    const displayName = role.roleDisplayName.trim();
    if (displayName) return displayName;
    return role.roleCode
      .split(/[-_\s]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  /**
   * Тексты роли и названия события из multipart-тела. Отсутствующее поле не
   * трогает значение, пустая строка сбрасывает в null (дефолт), иначе
   * значение проверяется и сохраняется.
   */
  private parseSecondaryTextFields(
    body: Record<string, string | undefined>,
  ): Pick<
    Prisma.BadgeTemplateUncheckedCreateInput,
    | 'roleLabel'
    | 'roleFontSize'
    | 'roleColor'
    | 'eventLabel'
    | 'eventFontSize'
    | 'eventColor'
  > {
    const label = (key: 'roleLabel' | 'eventLabel') => {
      const raw = body[key];
      if (raw === undefined) return undefined;
      const value = raw.trim();
      if (!value) return null;
      if (value.length > BADGE_LABEL_MAX_LENGTH) {
        throw new BadRequestException(
          `${key} must be at most ${BADGE_LABEL_MAX_LENGTH} characters`,
        );
      }
      return value;
    };
    const fontSize = (key: 'roleFontSize' | 'eventFontSize') => {
      const raw = body[key];
      if (raw === undefined) return undefined;
      if (raw.trim() === '') return null;
      const value = Number.parseInt(raw, 10);
      if (
        !Number.isFinite(value) ||
        value < BADGE_SECONDARY_FONT_SIZE_MIN ||
        value > BADGE_SECONDARY_FONT_SIZE_MAX
      ) {
        throw new BadRequestException(
          `${key} must be an integer between ${BADGE_SECONDARY_FONT_SIZE_MIN} and ${BADGE_SECONDARY_FONT_SIZE_MAX}`,
        );
      }
      return value;
    };
    const color = (key: 'roleColor' | 'eventColor') => {
      const raw = body[key];
      if (raw === undefined) return undefined;
      const value = raw.trim();
      if (!value) return null;
      if (!HEX_COLOR_RE.test(value)) {
        throw new BadRequestException(
          `${key} must be a hex color like #4b5563`,
        );
      }
      return value;
    };
    return {
      roleLabel: label('roleLabel'),
      roleFontSize: fontSize('roleFontSize'),
      roleColor: color('roleColor'),
      eventLabel: label('eventLabel'),
      eventFontSize: fontSize('eventFontSize'),
      eventColor: color('eventColor'),
    };
  }

  private downloadRoleLabel(
    dto: DownloadBadgesDto,
    targets: ArtifactRecipientTarget[],
  ): string {
    if (dto.scope === 'ALL_ELIGIBLE') return 'all-eligible';
    if (dto.roleCode) return dto.roleCode;
    if (dto.recipientRole) return dto.recipientRole.toLowerCase();
    const roleCodes = [...new Set(targets.map((target) => target.roleCode))];
    return roleCodes.length === 1 ? roleCodes[0] : 'selected';
  }

  private safeFilename(value: string): string {
    return (
      value
        .trim()
        .replace(/[^\p{L}\p{N}._-]+/gu, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60) || 'badges'
    );
  }
}
