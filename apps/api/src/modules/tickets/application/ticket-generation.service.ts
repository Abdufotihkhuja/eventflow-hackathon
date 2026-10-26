import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AssetGenerationStatus,
  RegistrationStatus,
  TicketArtifactDesign,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import PDFDocument from 'pdfkit';
import * as QRCode from 'qrcode';
import archiver from 'archiver';
import { PassThrough } from 'stream';
import { FileStorageService } from '../../storage/application/file-storage.service';
import { QueueService } from '../../platform/queue/queue.service';
import {
  QUEUE_NAMES,
  TicketGenerationJobPayload,
  TicketsZipGenerationJobPayload,
} from '../../platform/queue/queue.types';
import { DownloadTicketsDto, TicketDesign } from '../dto';
import type { ICurrentUser } from '../../../common/interfaces';
import { TicketQrService } from './ticket-qr.service';
import { TicketNumberService } from './ticket-number.service';

interface ITicketData {
  registrationId: string;
  participantName: string;
  participantEmail: string;
  participantRole: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  eventVenue: string | null;
  eventCity: string | null;
  eventFormat: string;
  organizationName: string;
  organizationLogo: string | null;
  eventCover: string | null;
  qrPayload: string; // signed v2 payload
  ticketNumber: string;
  brandBg: string; // hex
  brandAccent: string; // hex
}

export interface IGeneratedTicket {
  path: string;
  filename: string;
  ticketUrl: string;
}

export type TicketGenerationResult =
  | {
      status: 'ready';
      file: IGeneratedTicket;
    }
  | {
      status: 'processing';
      jobId: string;
      message: string;
    };

@Injectable()
export class TicketGenerationService {
  private readonly ticketsDir = 'tickets';
  private readonly archivesDir = 'tickets/archives';
  private readonly syncWaitTimeoutMs: number;
  private readonly syncWaitMaxQueueDepth: number;
  private readonly syncWaitMaxZipRegistrations: number;
  private readonly maxZipRegistrations: number;
  private readonly queueBackpressureDepth: number;

  // 16:10 premium pass — wider canvas for better hierarchy.
  private readonly TICKET_WIDTH = 720;
  private readonly TICKET_HEIGHT = 450;

  // Font names registered on every PDFDocument we create. We use
  // @openfonts/inter_all because PDFKit cannot do glyph fallback across
  // multiple registered fonts, and @fontsource/inter ships subset-split
  // .woff files (latin-only / cyrillic-only) — neither subset alone covers
  // ru+en strings on the same ticket. inter-all-{400,700}.woff combine
  // Latin + Cyrillic in a single file PDFKit accepts.
  private readonly FONT_REGULAR = 'Inter';
  private readonly FONT_BOLD = 'Inter-Bold';
  private readonly fontRegularPath = require.resolve(
    '@openfonts/inter_all/files/inter-all-400.woff',
  );
  private readonly fontBoldPath = require.resolve(
    '@openfonts/inter_all/files/inter-all-700.woff',
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly storage: FileStorageService,
    private readonly queueService: QueueService,
    private readonly ticketQrService: TicketQrService,
    private readonly ticketNumberService: TicketNumberService,
  ) {
    this.storage.ensureDirectory(this.ticketsDir);
    this.storage.ensureDirectory(this.archivesDir);
    this.syncWaitTimeoutMs = this.getPositiveIntEnv(
      'TICKETS_SYNC_WAIT_TIMEOUT_MS',
      5000,
    );
    this.syncWaitMaxQueueDepth = this.getPositiveIntEnv(
      'TICKETS_SYNC_WAIT_MAX_QUEUE_DEPTH',
      2,
    );
    this.syncWaitMaxZipRegistrations = this.getPositiveIntEnv(
      'TICKETS_SYNC_WAIT_MAX_ZIP_REGISTRATIONS',
      10,
    );
    this.maxZipRegistrations = this.getPositiveIntEnv(
      'TICKETS_MAX_ZIP_REGISTRATIONS',
      250,
    );
    this.queueBackpressureDepth = this.getPositiveIntEnv(
      'TICKETS_QUEUE_BACKPRESSURE_MAX_DEPTH',
      50,
    );
  }

  async getOrScheduleSingleTicket(
    registrationId: string,
    design: TicketDesign,
    requestedBy?: ICurrentUser,
  ): Promise<TicketGenerationResult> {
    const registration = await this.getRegistrationWithDetails(registrationId);
    const artifact = await this.prisma.ticketArtifact.findUnique({
      where: {
        registrationId_design: {
          registrationId,
          design: this.toArtifactDesign(design),
        },
      },
    });

    if (artifact?.ticketUrl && this.storage.exists(artifact.ticketUrl)) {
      return {
        status: 'ready',
        file: this.toGeneratedTicket(
          registration.id,
          design,
          registration.user.firstName,
          registration.user.lastName,
          registration.user.email,
        ),
      };
    }

    await this.prisma.ticketArtifact.upsert({
      where: {
        registrationId_design: {
          registrationId,
          design: this.toArtifactDesign(design),
        },
      },
      create: {
        registrationId,
        design: this.toArtifactDesign(design),
        generationStatus: AssetGenerationStatus.PENDING,
        generationError: null,
      },
      update: {
        generationStatus: AssetGenerationStatus.PENDING,
        generationError: null,
      },
    });

    const payload: TicketGenerationJobPayload = {
      jobId: this.queueService.createJobId(['ticket', registrationId, design]),
      type: 'ticket.single',
      entityId: registrationId,
      registrationId,
      design,
      requestedBy: requestedBy
        ? {
            userId: requestedBy.sub,
            actorType: requestedBy.type,
            organizationId: requestedBy.organizationId,
          }
        : undefined,
    };

    const handle = await this.queueService.enqueueTicketGeneration(payload);

    if (!(await this.shouldWaitForCompletion())) {
      return {
        status: 'processing',
        jobId: handle.jobId,
        message: 'Билет поставлен в очередь на генерацию. Повторите запрос чуть позже.',
      };
    }

    const completion = await this.queueService.waitForJob<IGeneratedTicket>(
      handle,
      this.syncWaitTimeoutMs,
    );

    if (completion.status === 'completed' && completion.result) {
      return {
        status: 'ready',
        file: completion.result,
      };
    }

    return {
      status: 'processing',
      jobId: handle.jobId,
      message: 'Билет поставлен в очередь на генерацию. Повторите запрос чуть позже.',
    };
  }

  async getOrScheduleTicketsZip(
    eventId: string,
    dto: DownloadTicketsDto,
    requestedBy?: ICurrentUser,
  ): Promise<TicketGenerationResult> {
    const registrationsCount = await this.countRegistrationsForZip(eventId, dto);

    if (registrationsCount === 0) {
      throw new NotFoundException('Нет регистраций для скачивания');
    }

    if (registrationsCount > this.maxZipRegistrations) {
      throw new BadRequestException(
        `Слишком большой batch для ZIP. Максимум ${this.maxZipRegistrations} регистраций за один запрос.`,
      );
    }

    await this.assertQueueIsNotOverloaded();

    const jobId = this.queueService.createJobId([
      'tickets-zip',
      eventId,
      dto.design ?? TicketDesign.BRANDED,
      dto.status ?? RegistrationStatus.APPROVED,
      ...(dto.registrationIds ?? []).sort(),
    ]);
    const relativePath = `${this.archivesDir}/${jobId}.zip`;
    const ticketUrl = this.storage.getPublicUrl(relativePath);

    if (this.storage.exists(relativePath)) {
      return {
        status: 'ready',
        file: {
          path: relativePath,
          filename: `${jobId}.zip`,
          ticketUrl,
        },
      };
    }

    const payload: TicketsZipGenerationJobPayload = {
      jobId,
      type: 'ticket.zip',
      entityId: eventId,
      eventId,
      download: dto,
      requestedBy: requestedBy
        ? {
            userId: requestedBy.sub,
            actorType: requestedBy.type,
            organizationId: requestedBy.organizationId,
          }
        : undefined,
    };

    const handle = await this.queueService.enqueueTicketsZipGeneration(payload);

    if (
      registrationsCount > this.syncWaitMaxZipRegistrations ||
      !(await this.shouldWaitForCompletion())
    ) {
      return {
        status: 'processing',
        jobId: handle.jobId,
        message: 'ZIP-архив поставлен в очередь на генерацию. Повторите запрос чуть позже.',
      };
    }

    const completion = await this.queueService.waitForJob<IGeneratedTicket>(
      handle,
      this.syncWaitTimeoutMs,
    );

    if (completion.status === 'completed' && completion.result) {
      return {
        status: 'ready',
        file: completion.result,
      };
    }

    return {
      status: 'processing',
      jobId: handle.jobId,
      message: 'ZIP-архив поставлен в очередь на генерацию. Повторите запрос чуть позже.',
    };
  }

  async processSingleTicketJob(
    payload: TicketGenerationJobPayload,
  ): Promise<IGeneratedTicket> {
    const registration = await this.getRegistrationWithDetails(payload.registrationId);

    await this.prisma.ticketArtifact.upsert({
      where: {
        registrationId_design: {
          registrationId: payload.registrationId,
          design: this.toArtifactDesign(payload.design),
        },
      },
      create: {
        registrationId: payload.registrationId,
        design: this.toArtifactDesign(payload.design),
        generationStatus: AssetGenerationStatus.PROCESSING,
      },
      update: {
        generationStatus: AssetGenerationStatus.PROCESSING,
        generationError: null,
      },
    });

    try {
      const ticket = await this.generateTicketPdf(registration, payload.design);

      await this.prisma.ticketArtifact.update({
        where: {
          registrationId_design: {
            registrationId: payload.registrationId,
            design: this.toArtifactDesign(payload.design),
          },
        },
        data: {
          ticketUrl: ticket.ticketUrl,
          generatedAt: new Date(),
          generationStatus: AssetGenerationStatus.READY,
          generationError: null,
        },
      });

      return ticket;
    } catch (error) {
      await this.prisma.ticketArtifact.update({
        where: {
          registrationId_design: {
            registrationId: payload.registrationId,
            design: this.toArtifactDesign(payload.design),
          },
        },
        data: {
          generationStatus: AssetGenerationStatus.FAILED,
          generationError:
            error instanceof Error ? error.message : 'Ticket generation failed',
        },
      });
      throw error;
    }
  }

  async processTicketsZipJob(
    payload: TicketsZipGenerationJobPayload,
  ): Promise<IGeneratedTicket> {
    const design = payload.download.design || TicketDesign.BRANDED;
    const status = payload.download.status || RegistrationStatus.APPROVED;

    const whereCondition: {
      eventId: string;
      status: RegistrationStatus;
      id?: { in: string[] };
    } = {
      eventId: payload.eventId,
      status,
    };

    if (payload.download.registrationIds?.length) {
      whereCondition.id = { in: payload.download.registrationIds };
    }

    const registrations = await this.prisma.registration.findMany({
      where: whereCondition,
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        event: {
          include: {
            organization: {
              select: {
                companyName: true,
                logoUrl: true,
                brandColor: true,
                accentColor: true,
              },
            },
          },
        },
      },
    });

    if (registrations.length === 0) {
      throw new NotFoundException('Нет регистраций для скачивания');
    }

    const ticketEntries: Array<{ name: string; buffer: Buffer }> = [];

    for (const registration of registrations) {
      // Backfill ticket number lazily so ZIP entries always have a stable identifier.
      if (!registration.ticketNumber) {
        registration.ticketNumber =
          await this.ticketNumberService.ensureTicketNumber(registration.id);
      }
      const ticketData = this.prepareTicketData(registration);
      const fileName = `ticket-${registration.user.lastName || registration.user.email.split('@')[0]}-${registration.id.substring(0, 8)}.pdf`;
      const buffer = await this.createTicketPdf(ticketData, design);

      ticketEntries.push({ name: fileName, buffer });
    }

    const archiveBuffer = await this.createZipArchive(ticketEntries);
    const savedArchive = await this.storage.save({
      buffer: archiveBuffer,
      originalName: `${payload.jobId}.zip`,
      mimetype: 'application/zip',
      size: archiveBuffer.byteLength,
      directory: this.archivesDir,
      fileName: `${payload.jobId}.zip`,
    });

    return {
      path: savedArchive.relativePath,
      filename: savedArchive.fileName,
      ticketUrl: savedArchive.url,
    };
  }

  private async getRegistrationWithDetails(registrationId: string) {
    const registration = await this.prisma.registration.findUnique({
      where: { id: registrationId },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        event: {
          include: {
            organization: {
              select: {
                companyName: true,
                logoUrl: true,
                brandColor: true,
                accentColor: true,
              },
            },
          },
        },
      },
    });

    if (!registration) {
      throw new NotFoundException('Регистрация не найдена');
    }

    return registration;
  }

  private toArtifactDesign(design: TicketDesign): TicketArtifactDesign {
    return design === TicketDesign.SIMPLE
      ? TicketArtifactDesign.SIMPLE
      : TicketArtifactDesign.BRANDED;
  }

  private toGeneratedTicket(
    registrationId: string,
    design: TicketDesign,
    firstName: string | null,
    lastName: string | null,
    email: string,
  ): IGeneratedTicket {
    const relativePath = `${this.ticketsDir}/ticket-${registrationId}-${design}.pdf`;
    const participantName =
      `${firstName || ''} ${lastName || ''}`.trim() || email;

    return {
      path: relativePath,
      filename: `ticket-${participantName.replace(/[^a-zA-Zа-яА-Я0-9]/g, '_')}.pdf`,
      ticketUrl: this.storage.getPublicUrl(relativePath),
    };
  }

  private prepareTicketData(registration: {
    id: string;
    role: string;
    qrCode: string | null;
    qrPayloadVersion: number;
    ticketNumber: string | null;
    user: {
      firstName: string | null;
      lastName: string | null;
      email: string;
    };
    event: {
      title: string;
      startDate: Date;
      endDate: Date;
      venue: string | null;
      city: string | null;
      format: string;
      coverImage: string | null;
      organization: {
        companyName: string;
        logoUrl: string | null;
        brandColor: string | null;
        accentColor: string | null;
      };
    };
  }): ITicketData {
    const participantName =
      `${registration.user.firstName || ''} ${registration.user.lastName || ''}`.trim() ||
      registration.user.email;

    const dateOptions: Intl.DateTimeFormatOptions = {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    };
    const startStr = registration.event.startDate.toLocaleDateString(
      'ru-RU',
      dateOptions,
    );
    const endStr = registration.event.endDate.toLocaleDateString(
      'ru-RU',
      dateOptions,
    );
    const eventDate =
      startStr === endStr ? startStr : `${startStr} – ${endStr}`;

    const timeFmt: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    };
    const startTime = registration.event.startDate.toLocaleTimeString(
      'ru-RU',
      timeFmt,
    );
    const endTime = registration.event.endDate.toLocaleTimeString(
      'ru-RU',
      timeFmt,
    );
    const eventTime =
      startTime === endTime ? startTime : `${startTime} – ${endTime}`;

    const roleMap: Record<string, string> = {
      PARTICIPANT: 'Участник',
      SPEAKER: 'Спикер',
      MENTOR: 'Ментор',
    };

    const qrPayload = this.ticketQrService.encodeQrPayload({
      id: registration.id,
      qrCode: registration.qrCode,
      qrPayloadVersion: registration.qrPayloadVersion,
    });

    return {
      registrationId: registration.id,
      participantName,
      participantEmail: registration.user.email,
      participantRole: roleMap[registration.role] || registration.role,
      eventTitle: registration.event.title,
      eventDate,
      eventTime,
      eventVenue: registration.event.venue,
      eventCity: registration.event.city,
      eventFormat: registration.event.format,
      organizationName: registration.event.organization.companyName,
      organizationLogo: registration.event.organization.logoUrl,
      eventCover: registration.event.coverImage,
      qrPayload,
      ticketNumber:
        registration.ticketNumber ??
        `EVF-TEMP-${registration.id.substring(0, 6).toUpperCase()}`,
      brandBg:
        registration.event.organization.brandColor &&
        /^#[0-9a-fA-F]{6}$/.test(registration.event.organization.brandColor)
          ? registration.event.organization.brandColor
          : '#0B1020',
      brandAccent:
        registration.event.organization.accentColor &&
        /^#[0-9a-fA-F]{6}$/.test(registration.event.organization.accentColor)
          ? registration.event.organization.accentColor
          : '#00E5FF',
    };
  }

  private async generateTicketPdf(
    registration: {
      id: string;
      role: string;
      qrCode: string | null;
      qrPayloadVersion: number;
      ticketNumber: string | null;
      user: {
        firstName: string | null;
        lastName: string | null;
        email: string;
      };
      event: {
        title: string;
        startDate: Date;
        endDate: Date;
        venue: string | null;
        city: string | null;
        format: string;
        coverImage: string | null;
        organization: {
          companyName: string;
          logoUrl: string | null;
          brandColor: string | null;
          accentColor: string | null;
        };
      };
    },
    design: TicketDesign,
  ): Promise<IGeneratedTicket> {
    // Backfill ticket number if missing (legacy registrations).
    if (!registration.ticketNumber) {
      registration.ticketNumber =
        await this.ticketNumberService.ensureTicketNumber(registration.id);
    }
    const ticketData = this.prepareTicketData(registration);
    const relativePath = `${this.ticketsDir}/ticket-${registration.id}-${design}.pdf`;

    if (this.storage.exists(relativePath)) {
      return this.toGeneratedTicket(
        registration.id,
        design,
        registration.user.firstName,
        registration.user.lastName,
        registration.user.email,
      );
    }

    const pdfBuffer = await this.createTicketPdf(ticketData, design);
    await this.storage.save({
      buffer: pdfBuffer,
      originalName: `ticket-${registration.id}.pdf`,
      mimetype: 'application/pdf',
      size: pdfBuffer.byteLength,
      directory: this.ticketsDir,
      fileName: `ticket-${registration.id}-${design}.pdf`,
    });

    return this.toGeneratedTicket(
      registration.id,
      design,
      registration.user.firstName,
      registration.user.lastName,
      registration.user.email,
    );
  }

  private async createTicketPdf(
    data: ITicketData,
    design: TicketDesign,
  ): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      const doc = new PDFDocument({
        size: [this.TICKET_WIDTH, this.TICKET_HEIGHT],
        // Zero margins — every draw call uses absolute coordinates, and any
        // non-zero margin makes PDFKit auto-paginate when text near the
        // footer "overflows" into the bottom margin band, producing extra
        // blank pages. Single-page ticket is the only intended output.
        margin: 0,
        autoFirstPage: true,
      });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer | string) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      });
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      try {
        // Register Cyrillic-capable fonts BEFORE any draw call. We rely on
        // these — Helvetica's Latin-1-only glyph table garbled all Russian
        // text in production. Fallback to PDFKit's built-in Helvetica only if
        // registration throws (treated as a hard error, not silent).
        try {
          doc.registerFont(this.FONT_REGULAR, this.fontRegularPath);
          doc.registerFont(this.FONT_BOLD, this.fontBoldPath);
        } catch (error) {
          throw new Error(
            `Failed to register Inter fonts for PDF — Cyrillic would not render. ` +
              `Verify @openfonts/inter_all is installed. Cause: ${
                error instanceof Error ? error.message : String(error)
              }`,
          );
        }

        const appUrl = this.configService.get<string>('frontend.appUrl');
        const qrUrl = `${appUrl}/check-in?code=${encodeURIComponent(data.qrPayload)}`;

        const qrBuffer = await QRCode.toBuffer(qrUrl, {
          width: 320,
          margin: 1,
          errorCorrectionLevel: 'H',
          color: {
            dark: '#000000',
            light: '#ffffff',
          },
        });

        if (design === TicketDesign.BRANDED) {
          await this.drawBrandedTicket(doc, data, qrBuffer);
        } else {
          await this.drawSimpleTicket(doc, data, qrBuffer);
        }

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  private async drawBrandedTicket(
    doc: PDFKit.PDFDocument,
    data: ITicketData,
    qrBuffer: Buffer,
  ): Promise<void> {
    const W = this.TICKET_WIDTH;
    const H = this.TICKET_HEIGHT;
    const accent = data.brandAccent;
    const violet = '#8B5CF6';

    // Background — deep navy gradient
    const bg = doc.linearGradient(0, 0, W, H);
    bg.stop(0, data.brandBg).stop(1, '#131A36');
    doc.rect(0, 0, W, H).fill(bg);

    // Decorative glows (top-right + bottom-left)
    doc.save();
    doc.fillColor(accent, 0.06);
    doc.circle(W - 40, 0, 180).fill();
    doc.fillColor(violet, 0.05);
    doc.circle(-20, H, 140).fill();
    doc.restore();

    // === Header: organization logo + brand name + E-ticket label ===
    const logoSize = 40;
    const headerY = 32;
    let cursorX = 32;

    if (
      data.organizationLogo?.startsWith('/uploads/') &&
      this.storage.exists(data.organizationLogo)
    ) {
      try {
        const logoPath = this.storage.getAbsolutePath(data.organizationLogo);
        doc.image(logoPath, cursorX, headerY, {
          fit: [logoSize, logoSize],
        });
        cursorX += logoSize + 14;
      } catch {
        // ignore broken logo, fall through to initials
      }
    } else {
      // Initials fallback in accent circle
      const initials = data.organizationName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0].toUpperCase())
        .join('');
      doc.save();
      doc.fillColor(accent, 0.18);
      doc.circle(cursorX + logoSize / 2, headerY + logoSize / 2, logoSize / 2).fill();
      doc.fillColor('#F5F7FB');
      doc.font('Inter-Bold').fontSize(16);
      doc.text(initials, cursorX, headerY + 11, {
        width: logoSize,
        align: 'center',
      });
      doc.restore();
      cursorX += logoSize + 14;
    }

    doc
      .fillColor('#F5F7FB')
      .font('Inter-Bold')
      .fontSize(20)
      .text(data.organizationName, cursorX, headerY + 8, {
        width: 280,
        ellipsis: true,
        lineBreak: false,
      });

    // Divider + "E-ticket" pill
    const pillX = cursorX + Math.min(280, doc.widthOfString(data.organizationName)) + 14;
    doc
      .strokeColor('#FFFFFF', 0.18)
      .lineWidth(1)
      .moveTo(pillX, headerY + 6)
      .lineTo(pillX, headerY + logoSize - 6)
      .stroke();
    doc
      .fillColor(accent)
      .font('Inter-Bold')
      .fontSize(13)
      .text('E-ticket', pillX + 12, headerY + 14);

    // === Event title ===
    doc
      .fillColor('#F5F7FB')
      .font('Inter-Bold')
      .fontSize(28)
      .text(data.eventTitle, 32, 110, {
        width: W - 280,
        lineGap: 2,
        ellipsis: true,
      });

    // Underline accent under title
    doc
      .strokeColor(accent)
      .lineWidth(2)
      .moveTo(32, 162)
      .lineTo(72, 162)
      .stroke();

    // === Section label "ИНФОРМАЦИЯ О СОБЫТИИ" ===
    doc
      .fillColor(violet)
      .font('Inter-Bold')
      .fontSize(9)
      .text('ИНФОРМАЦИЯ О СОБЫТИИ', 32, 184, {
        characterSpacing: 1.2,
      });
    doc
      .strokeColor('#FFFFFF', 0.12)
      .lineWidth(1)
      .moveTo(32, 200)
      .lineTo(W - 280, 200)
      .stroke();

    // === Info rows ===
    const formatMap: Record<string, string> = {
      ONLINE: 'Онлайн',
      OFFLINE: 'Офлайн',
      HYBRID: 'Гибрид',
    };
    const venueLine = [data.eventVenue, data.eventCity].filter(Boolean).join(', ');

    const rows: Array<{ label: string; value: string }> = [
      { label: 'ДАТА', value: data.eventDate },
      { label: 'ВРЕМЯ', value: data.eventTime },
      { label: 'МЕСТО', value: venueLine || '—' },
      {
        label: 'ФОРМАТ',
        value: formatMap[data.eventFormat] ?? data.eventFormat,
      },
      { label: 'УЧАСТНИК', value: data.participantName },
      { label: 'БИЛЕТ №', value: data.ticketNumber },
    ];

    let rowY = 218;
    const labelX = 64;
    const valueX = 188;
    const rowH = 28;

    for (const row of rows) {
      // tiny accent dot as icon
      doc.fillColor(accent, 0.7);
      doc.circle(38, rowY + 7, 3).fill();

      doc
        .fillColor('#A8B0CF')
        .font('Inter-Bold')
        .fontSize(9)
        .text(row.label, labelX, rowY + 4, { characterSpacing: 0.6 });

      doc
        .fillColor('#F5F7FB')
        .font('Inter-Bold')
        .fontSize(11)
        .text(row.value, valueX, rowY + 2, {
          width: W - valueX - 280,
          ellipsis: true,
          lineBreak: false,
        });

      rowY += rowH;
    }

    // === QR card on the right ===
    const qrCardW = 220;
    const qrCardH = 240;
    const qrCardX = W - qrCardW - 32;
    const qrCardY = 110;

    doc.save();
    // Outer accent border
    this.roundedRect(doc, qrCardX, qrCardY, qrCardW, qrCardH, 18);
    doc.lineWidth(2).strokeColor(accent).stroke();
    // Inner white background
    this.roundedRect(doc, qrCardX + 8, qrCardY + 8, qrCardW - 16, qrCardW - 16, 14);
    doc.fillColor('#FFFFFF').fill();
    doc.restore();

    // QR caption
    doc
      .fillColor(accent)
      .font('Inter-Bold')
      .fontSize(11)
      .text('QR ДЛЯ ВХОДА', qrCardX, qrCardY - 22, {
        width: qrCardW,
        align: 'center',
        characterSpacing: 1.2,
      });

    // QR image
    const qrSize = qrCardW - 32;
    doc.image(qrBuffer, qrCardX + 16, qrCardY + 16, {
      width: qrSize,
      height: qrSize,
    });

    // QR instruction
    doc
      .fillColor('#F5F7FB')
      .font('Inter')
      .fontSize(10)
      .text('Покажите QR-код на входе', qrCardX, qrCardY + qrCardH + 8, {
        width: qrCardW,
        align: 'center',
      });

    // === Footer ===
    const footerY = H - 30;
    doc
      .fillColor(accent, 0.7)
      .font('Inter-Bold')
      .fontSize(9)
      .text('●', 32, footerY);
    doc
      .fillColor('#A8B0CF')
      .font('Inter')
      .fontSize(9)
      .text(
        'Безопасно · Уникальный билет · Передача невозможна',
        46,
        footerY + 1,
      );
    doc
      .fillColor('#A8B0CF')
      .font('Inter')
      .fontSize(9)
      .text('Организовано через', W - 200, footerY + 1, {
        width: 110,
        align: 'right',
      });
    doc
      .fillColor(accent)
      .font('Inter-Bold')
      .fontSize(10)
      .text('Eventflow', W - 80, footerY, { width: 60, align: 'left' });
  }

  private roundedRect(
    doc: PDFKit.PDFDocument,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
  ): void {
    doc.moveTo(x + r, y);
    doc.lineTo(x + w - r, y);
    doc.quadraticCurveTo(x + w, y, x + w, y + r);
    doc.lineTo(x + w, y + h - r);
    doc.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    doc.lineTo(x + r, y + h);
    doc.quadraticCurveTo(x, y + h, x, y + h - r);
    doc.lineTo(x, y + r);
    doc.quadraticCurveTo(x, y, x + r, y);
    doc.closePath();
  }

  private async drawSimpleTicket(
    doc: PDFKit.PDFDocument,
    data: ITicketData,
    qrBuffer: Buffer,
  ): Promise<void> {
    doc.rect(0, 0, this.TICKET_WIDTH, this.TICKET_HEIGHT).fill('#ffffff');

    doc
      .rect(10, 10, this.TICKET_WIDTH - 20, this.TICKET_HEIGHT - 20)
      .lineWidth(1)
      .stroke('#e5e7eb');

    doc
      .fillColor('#6b7280')
      .fontSize(8)
      .font('Inter')
      .text(data.organizationName, 20, 25);

    doc
      .fillColor('#111827')
      .fontSize(14)
      .font('Inter-Bold')
      .text(data.eventTitle, 20, 45, {
        width: this.TICKET_WIDTH - 140,
        lineGap: 2,
      });

    doc
      .fillColor('#374151')
      .fontSize(9)
      .font('Inter')
      .text(data.eventDate, 20, 90);

    const location = [data.eventVenue, data.eventCity].filter(Boolean).join(', ');
    if (location) {
      doc.fillColor('#6b7280').fontSize(8).text(location, 20, 105);
    }

    doc
      .strokeColor('#e5e7eb')
      .lineWidth(1)
      .moveTo(20, 130)
      .lineTo(this.TICKET_WIDTH - 120, 130)
      .stroke();

    doc
      .fillColor('#059669')
      .fontSize(9)
      .font('Inter-Bold')
      .text(data.participantRole, 20, 145);

    doc
      .fillColor('#111827')
      .fontSize(14)
      .font('Inter-Bold')
      .text(data.participantName, 20, 165, {
        width: this.TICKET_WIDTH - 140,
      });

    doc
      .fillColor('#6b7280')
      .fontSize(8)
      .font('Inter')
      .text(data.participantEmail, 20, 190);

    doc
      .fillColor('#9ca3af')
      .fontSize(6)
      .text(`ID: ${data.registrationId.substring(0, 8)}`, 20, this.TICKET_HEIGHT - 25);

    const qrSize = 85;
    const qrX = this.TICKET_WIDTH - qrSize - 20;
    const qrY = (this.TICKET_HEIGHT - qrSize) / 2;

    doc.rect(qrX - 5, qrY - 5, qrSize + 10, qrSize + 10).stroke('#e5e7eb');
    doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });

    doc
      .fillColor('#9ca3af')
      .fontSize(6)
      .text('Сканируйте для входа', qrX - 5, qrY + qrSize + 8, {
        width: qrSize + 10,
        align: 'center',
      });
  }

  private async createZipArchive(
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
      archive.on('error', (err) => reject(err));

      archive.pipe(output);
      for (const file of files) {
        archive.append(file.buffer, { name: file.name });
      }
      void archive.finalize();
    });
  }

  private async countRegistrationsForZip(
    eventId: string,
    dto: DownloadTicketsDto,
  ): Promise<number> {
    return this.prisma.registration.count({
      where: {
        eventId,
        status: dto.status || RegistrationStatus.APPROVED,
        ...(dto.registrationIds?.length
          ? { id: { in: dto.registrationIds } }
          : {}),
      },
    });
  }

  private async shouldWaitForCompletion(): Promise<boolean> {
    const queueDepth = await this.queueService.getQueueDepth(QUEUE_NAMES.TICKETS);
    return queueDepth <= this.syncWaitMaxQueueDepth;
  }

  private async assertQueueIsNotOverloaded(): Promise<void> {
    const queueDepth = await this.queueService.getQueueDepth(QUEUE_NAMES.TICKETS);

    if (queueDepth >= this.queueBackpressureDepth) {
      throw new ServiceUnavailableException(
        'Очередь генерации билетов перегружена. Повторите запрос чуть позже.',
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
