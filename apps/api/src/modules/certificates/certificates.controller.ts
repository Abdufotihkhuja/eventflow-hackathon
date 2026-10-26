import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  Res,
  ParseUUIDPipe,
  UseGuards,
  UseInterceptors,
  HttpCode,
  HttpStatus,
  StreamableFile,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import type { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import { CertificatesService } from './certificates.service';
import {
  GenerateCertificatesDto,
  CertificateQueryDto,
  VerifyCertificateDto,
} from './dto';
import { JwtAuthGuard, PermissionsGuard } from '../../common/guards';
import {
  CurrentUser,
  Public,
  RequirePermissions,
} from '../../common/decorators';
import type { ICurrentUser } from '../../common/interfaces';
import { PERMISSIONS } from '../../common/constants/permissions.constant';
import { FileStorageService } from '../storage/application/file-storage.service';
import { CERTIFICATE_SIZE_PRESETS } from '../shared/artifact-size-presets';

const certificateTemplateSchema: SchemaObject = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    eventId: { type: 'string', format: 'uuid' },
    name: { type: 'string' },
    recipientRoleId: { type: 'string', format: 'uuid', nullable: true },
    recipientRole: {
      type: 'string',
      enum: ['PARTICIPANT', 'SPEAKER', 'MENTOR'],
      nullable: true,
    },
    roleCode: { type: 'string' },
    roleDisplayName: { type: 'string' },
    sizePreset: { type: 'string' },
    widthPx: { type: 'number' },
    heightPx: { type: 'number' },
    templateUrl: { type: 'string' },
    thumbnailUrl: { type: 'string', nullable: true },
    namePosition: { type: 'object', additionalProperties: true },
    nameFont: { type: 'string', nullable: true },
    nameFontSize: { type: 'number', nullable: true },
    nameColor: { type: 'string', nullable: true },
    datePosition: { type: 'object', nullable: true, additionalProperties: true },
    eventNamePosition: {
      type: 'object',
      nullable: true,
      additionalProperties: true,
    },
    firstNamePosition: {
      type: 'object',
      nullable: true,
      additionalProperties: true,
    },
    lastNamePosition: {
      type: 'object',
      nullable: true,
      additionalProperties: true,
    },
    qrPosition: { type: 'object', nullable: true, additionalProperties: true },
    isDefault: { type: 'boolean' },
    isActive: { type: 'boolean' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
  required: [
    'id',
    'eventId',
    'name',
    'recipientRoleId',
    'recipientRole',
    'roleCode',
    'roleDisplayName',
    'sizePreset',
    'widthPx',
    'heightPx',
    'templateUrl',
    'isDefault',
    'isActive',
    'createdAt',
    'updatedAt',
  ],
};

// Контроллер для организаторов (событие + шаблоны + список + скачивание по eventId)
@ApiTags('certificates')
@Controller('events/:eventId/certificates')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class EventCertificatesController {
  constructor(
    private readonly certificatesService: CertificatesService,
    private readonly storage: FileStorageService,
  ) {}

  @Get('templates')
  @RequirePermissions(PERMISSIONS.CERTIFICATES_READ)
  @ApiOperation({ summary: 'Список шаблонов сертификатов события' })
  @ApiResponse({
    status: 200,
    schema: {
      type: 'object',
      properties: {
        templates: { type: 'array', items: certificateTemplateSchema },
      },
      required: ['templates'],
    },
  })
  async getTemplates(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.certificatesService.findTemplatesByEvent(eventId, user);
  }

  @Post('templates')
  @RequirePermissions(PERMISSIONS.CERTIFICATES_GENERATE)
  @ApiOperation({ summary: 'Создать шаблон сертификата' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        template: { type: 'string', format: 'binary' },
        name: { type: 'string' },
        recipientRole: {
          type: 'string',
          enum: ['PARTICIPANT', 'SPEAKER', 'MENTOR'],
        },
        recipientRoleId: { type: 'string', format: 'uuid' },
        roleId: {
          type: 'string',
          format: 'uuid',
          description: 'Alias for recipientRoleId',
        },
        sizePreset: {
          type: 'string',
          enum: Object.keys(CERTIFICATE_SIZE_PRESETS),
        },
        widthPx: { type: 'string' },
        heightPx: { type: 'string' },
        namePosition: {
          type: 'string',
          description: 'JSON {"x": number, "y": number}',
        },
        firstNamePosition: { type: 'string' },
        lastNamePosition: { type: 'string' },
        qrPosition: { type: 'string' },
        nameFont: { type: 'string' },
        nameFontSize: { type: 'string' },
        nameColor: { type: 'string' },
        datePosition: { type: 'string' },
        eventNamePosition: { type: 'string' },
        isDefault: { type: 'string', enum: ['true', 'false'] },
        isActive: { type: 'string', enum: ['true', 'false'] },
      },
    },
  })
  @ApiResponse({ status: 201, schema: certificateTemplateSchema })
  @UseInterceptors(FileInterceptor('template'))
  async createTemplate(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Req() req: Request,
    @CurrentUser() user: ICurrentUser,
  ) {
    const body = (req.body as Record<string, string>) || {};
    const file = req.file;
    return this.certificatesService.createTemplate(eventId, body, file, user);
  }

  @Patch('templates/:templateId')
  @RequirePermissions(PERMISSIONS.CERTIFICATES_GENERATE)
  @ApiOperation({ summary: 'Обновить шаблон сертификата' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 200, schema: certificateTemplateSchema })
  @UseInterceptors(FileInterceptor('template'))
  async updateTemplate(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('templateId', ParseUUIDPipe) templateId: string,
    @Req() req: Request,
    @CurrentUser() user: ICurrentUser,
  ) {
    const body = (req.body as Record<string, string>) || {};
    const file = req.file;
    return this.certificatesService.updateTemplate(
      eventId,
      templateId,
      body,
      file,
      user,
    );
  }

  @Delete('templates/:templateId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(PERMISSIONS.CERTIFICATES_GENERATE)
  @ApiOperation({ summary: 'Удалить шаблон' })
  async deleteTemplate(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('templateId', ParseUUIDPipe) templateId: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    await this.certificatesService.deleteTemplate(eventId, templateId, user);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.CERTIFICATES_READ)
  @ApiOperation({ summary: 'Список выданных сертификатов события' })
  async getCertificates(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Query() query: CertificateQueryDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.certificatesService.findCertificatesByEvent(
      eventId,
      query,
      user,
    );
  }

  @Get('generation-status/:jobId')
  @RequirePermissions(PERMISSIONS.CERTIFICATES_READ)
  @ApiOperation({
    summary: 'Статус асинхронной генерации сертификатов (для прогресс-бара)',
  })
  async getGenerationStatus(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('jobId') jobId: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.certificatesService.getGenerationStatus(eventId, jobId, user);
  }

  @Get(':certificateId/download')
  @RequirePermissions(PERMISSIONS.CERTIFICATES_EXPORT)
  @ApiOperation({ summary: 'Скачать сертификат по ID (увеличивает счётчик)' })
  async downloadByEvent(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('certificateId', ParseUUIDPipe) certificateId: string,
    @CurrentUser() user: ICurrentUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { path, filename } =
      await this.certificatesService.downloadCertificateByEvent(
        eventId,
        certificateId,
        user,
      );
    const fileStream = this.storage.createReadStream(path);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
    });

    return new StreamableFile(fileStream);
  }

  @Post('generate')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.CERTIFICATES_GENERATE)
  @ApiOperation({ summary: 'Сгенерировать сертификаты для участников' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Генерация завершена синхронно',
    schema: {
      type: 'object',
      required: ['status', 'generated', 'failed', 'skipped', 'forceRegenerate'],
      properties: {
        status: { type: 'string', enum: ['completed'] },
        generated: { type: 'number' },
        failed: { type: 'number' },
        skipped: { type: 'number' },
        forceRegenerate: { type: 'boolean' },
        errors: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              registrationId: { type: 'string' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.ACCEPTED,
    description: 'Генерация поставлена в очередь',
    schema: {
      type: 'object',
      required: ['status', 'jobId', 'message', 'forceRegenerate'],
      properties: {
        status: { type: 'string', enum: ['processing'] },
        jobId: { type: 'string' },
        message: { type: 'string' },
        forceRegenerate: { type: 'boolean' },
      },
    },
  })
  async generate(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() dto: GenerateCertificatesDto,
    @CurrentUser() user: ICurrentUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.certificatesService.generateCertificates(
      eventId,
      dto,
      user,
    );

    if (result.status === 'processing') {
      res.status(HttpStatus.ACCEPTED);
    }

    return result;
  }
}

// Контроллер для скачивания и верификации сертификатов
@ApiTags('certificates')
@Controller('certificates')
export class CertificatesController {
  constructor(
    private readonly certificatesService: CertificatesService,
    private readonly storage: FileStorageService,
  ) {}

  @Post('verify')
  @Public()
  @ApiOperation({ summary: 'Верификация сертификата (публичный)' })
  async verify(@Body() dto: VerifyCertificateDto) {
    return this.certificatesService.verifyCertificate(dto);
  }

  @Get(':id/download')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Скачать сертификат' })
  async download(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { path, filename } =
      await this.certificatesService.downloadCertificate(id, user);

    const fileStream = this.storage.createReadStream(path);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
    });

    return new StreamableFile(fileStream);
  }
}

// Контроллер для пользователей
@ApiTags('my-certificates')
@Controller('registrations/:registrationId/certificate')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UserCertificatesController {
  constructor(private readonly certificatesService: CertificatesService) {}

  @Get()
  @ApiOperation({ summary: 'Получить мой сертификат' })
  async getMyCertificate(
    @Param('registrationId', ParseUUIDPipe) registrationId: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.certificatesService.getMyCertificate(registrationId, user);
  }
}
