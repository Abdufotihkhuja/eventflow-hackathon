import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  Res,
  StreamableFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiProduces,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import { JwtAuthGuard, PermissionsGuard } from '../../common/guards';
import { CurrentUser, RequirePermissions } from '../../common/decorators';
import type { ICurrentUser } from '../../common/interfaces';
import { PERMISSIONS } from '../../common/constants/permissions.constant';
import { BADGE_SIZE_PRESETS } from '../shared/artifact-size-presets';
import { BadgesService } from './badges.service';
import { FileStorageService } from '../storage/application/file-storage.service';
import { DownloadBadgesDto } from './dto';

const badgeTemplateSchema: SchemaObject = {
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
    namePosition: { type: 'object', nullable: true, additionalProperties: true },
    nameFont: { type: 'string', nullable: true },
    nameFontSize: { type: 'number', nullable: true },
    nameColor: { type: 'string', nullable: true },
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
    rolePosition: { type: 'object', nullable: true, additionalProperties: true },
    eventNamePosition: {
      type: 'object',
      nullable: true,
      additionalProperties: true,
    },
    qrPosition: { type: 'object', nullable: true, additionalProperties: true },
    roleLabel: { type: 'string', nullable: true },
    roleFontSize: { type: 'number', nullable: true },
    roleColor: { type: 'string', nullable: true },
    eventLabel: { type: 'string', nullable: true },
    eventFontSize: { type: 'number', nullable: true },
    eventColor: { type: 'string', nullable: true },
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

@ApiTags('badges')
@Controller('events/:eventId/badges')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class BadgesController {
  constructor(
    private readonly badgesService: BadgesService,
    private readonly storage: FileStorageService,
  ) {}

  @Get('templates')
  @RequirePermissions(PERMISSIONS.CERTIFICATES_READ)
  @ApiOperation({ summary: 'Список шаблонов бейджей события' })
  @ApiResponse({
    status: 200,
    schema: {
      type: 'object',
      properties: {
        templates: { type: 'array', items: badgeTemplateSchema },
      },
      required: ['templates'],
    },
  })
  getTemplates(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.badgesService.findTemplatesByEvent(eventId, user);
  }

  @Post('templates')
  @RequirePermissions(PERMISSIONS.CERTIFICATES_GENERATE)
  @ApiOperation({ summary: 'Создать шаблон бейджа' })
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
          enum: Object.keys(BADGE_SIZE_PRESETS),
        },
        widthPx: { type: 'string' },
        heightPx: { type: 'string' },
        namePosition: { type: 'string' },
        nameFont: { type: 'string' },
        nameFontSize: { type: 'string' },
        nameColor: { type: 'string' },
        firstNamePosition: { type: 'string' },
        lastNamePosition: { type: 'string' },
        rolePosition: { type: 'string' },
        eventNamePosition: { type: 'string' },
        qrPosition: { type: 'string' },
        roleLabel: {
          type: 'string',
          description:
            'Role text override; empty string resets to the role name',
        },
        roleFontSize: { type: 'string', description: 'Points, 4–120' },
        roleColor: { type: 'string', description: 'Hex color, e.g. #4b5563' },
        eventLabel: {
          type: 'string',
          description:
            'Event name override; empty string resets to the event title',
        },
        eventFontSize: { type: 'string', description: 'Points, 4–120' },
        eventColor: { type: 'string', description: 'Hex color, e.g. #374151' },
        isDefault: { type: 'string', enum: ['true', 'false'] },
        isActive: { type: 'string', enum: ['true', 'false'] },
      },
      required: ['template', 'name'],
    },
  })
  @ApiResponse({ status: 201, schema: badgeTemplateSchema })
  @UseInterceptors(FileInterceptor('template'))
  createTemplate(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Req() req: Request,
    @CurrentUser() user: ICurrentUser,
  ) {
    const body = (req.body as Record<string, string>) || {};
    return this.badgesService.createTemplate(eventId, body, req.file, user);
  }

  @Patch('templates/:templateId')
  @RequirePermissions(PERMISSIONS.CERTIFICATES_GENERATE)
  @ApiOperation({ summary: 'Обновить шаблон бейджа' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 200, schema: badgeTemplateSchema })
  @UseInterceptors(FileInterceptor('template'))
  updateTemplate(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('templateId', ParseUUIDPipe) templateId: string,
    @Req() req: Request,
    @CurrentUser() user: ICurrentUser,
  ) {
    const body = (req.body as Record<string, string>) || {};
    return this.badgesService.updateTemplate(
      eventId,
      templateId,
      body,
      req.file,
      user,
    );
  }

  @Delete('templates/:templateId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(PERMISSIONS.CERTIFICATES_GENERATE)
  @ApiOperation({ summary: 'Удалить шаблон бейджа' })
  async deleteTemplate(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('templateId', ParseUUIDPipe) templateId: string,
    @CurrentUser() user: ICurrentUser,
  ): Promise<void> {
    await this.badgesService.deleteTemplate(eventId, templateId, user);
  }

  @Post('download')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.CERTIFICATES_EXPORT)
  @ApiOperation({
    summary: 'Запросить ZIP бейджей',
    description:
      'Бейджи рендерятся заново на каждую выгрузку, поэтому сборка уходит в очередь. ' +
      '200 — архив уже готов (та же выборка выгружалась раньше), 202 — собирается: ' +
      'следите за прогрессом через download-status/:jobId и забирайте download/:jobId/file.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Архив готов',
    schema: {
      type: 'object',
      required: ['status', 'jobId', 'total'],
      properties: {
        status: { type: 'string', enum: ['ready'] },
        jobId: { type: 'string' },
        total: { type: 'number' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.ACCEPTED,
    description: 'Сборка поставлена в очередь',
    schema: {
      type: 'object',
      required: ['status', 'jobId', 'total'],
      properties: {
        status: { type: 'string', enum: ['processing'] },
        jobId: { type: 'string' },
        total: { type: 'number' },
      },
    },
  })
  async downloadBadges(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() dto: DownloadBadgesDto,
    @CurrentUser() user: ICurrentUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.badgesService.requestBadgesZip(
      eventId,
      dto,
      user,
    );

    if (result.status === 'processing') {
      res.status(HttpStatus.ACCEPTED);
    }

    return result;
  }

  @Get('download-status/:jobId')
  @RequirePermissions(PERMISSIONS.CERTIFICATES_EXPORT)
  @ApiOperation({ summary: 'Статус сборки ZIP бейджей (для прогресс-бара)' })
  async downloadStatus(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('jobId') jobId: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.badgesService.getBadgesZipStatus(eventId, jobId, user);
  }

  @Get('download/:jobId/file')
  @RequirePermissions(PERMISSIONS.CERTIFICATES_EXPORT)
  @ApiOperation({ summary: 'Скачать готовый ZIP бейджей' })
  @ApiProduces('application/zip')
  async downloadFile(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('jobId') jobId: string,
    @CurrentUser() user: ICurrentUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { path, filename } = await this.badgesService.openBadgesZip(
      eventId,
      jobId,
      user,
    );

    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
    });

    return new StreamableFile(this.storage.createReadStream(path));
  }
}
