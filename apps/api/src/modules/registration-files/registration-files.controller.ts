import {
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard, PermissionsGuard } from '../../common/guards';
import { CurrentUser, RequirePermissions } from '../../common/decorators';
import type { ICurrentUser } from '../../common/interfaces';
import { PERMISSIONS } from '../../common/constants/permissions.constant';
import { RegistrationFilesService } from './registration-files.service';
import { RegistrationFileEntity } from './entities/registration-file.entity';
import { HARD_MAX_FILE_SIZE_MB, MB } from './registration-files.constants';

/**
 * Participant-facing file endpoints (pre-upload before registration submit).
 */
@ApiTags('registration-files')
@Controller('events/:eventId/registration-files')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RegistrationFilesController {
  constructor(
    private readonly registrationFilesService: RegistrationFilesService,
  ) {}

  @Post(':questionId')
  @ApiOperation({
    summary: 'Загрузить файл-ответ на вопрос (до отправки регистрации)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiParam({ name: 'eventId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'questionId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 201, type: RegistrationFileEntity })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: HARD_MAX_FILE_SIZE_MB * MB, files: 1 },
    }),
  )
  async upload(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('questionId', ParseUUIDPipe) questionId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: ICurrentUser,
  ): Promise<RegistrationFileEntity> {
    return this.registrationFilesService.uploadParticipantFile(
      eventId,
      questionId,
      file,
      user,
    );
  }

  @Get('draft')
  @ApiOperation({
    summary: 'Свои неотправленные файлы (черновик незавершённой регистрации)',
    description:
      'Форма опроса читает черновик на входе, чтобы предложить продолжить ' +
      'прошлую попытку или начать заново.',
  })
  @ApiParam({ name: 'eventId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: [RegistrationFileEntity] })
  async listDraft(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: ICurrentUser,
  ): Promise<RegistrationFileEntity[]> {
    return this.registrationFilesService.listDraft(eventId, user);
  }

  /**
   * ВАЖНО: маршрут объявлен ДО `@Delete(':fileId')` — Nest сопоставляет пути в
   * порядке объявления, иначе `draft` ушёл бы в параметрический маршрут и
   * упал бы на ParseUUIDPipe.
   */
  @Delete('draft')
  @ApiOperation({
    summary: 'Сбросить черновик регистрации: удалить свои неотправленные файлы',
    description:
      'Вызывается, когда участник выбрал «начать заново». Отправленные ' +
      '(ATTACHED) файлы не затрагиваются.',
  })
  @ApiParam({ name: 'eventId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Черновик сброшен' })
  async resetDraft(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: ICurrentUser,
  ): Promise<{ message: string; removed: number }> {
    const { removed } = await this.registrationFilesService.resetDraft(
      eventId,
      user,
    );
    return { message: 'Черновик регистрации сброшен', removed };
  }

  @Delete(':fileId')
  @ApiOperation({ summary: 'Удалить свой загруженный файл (до отправки)' })
  @ApiParam({ name: 'eventId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'fileId', type: 'string', format: 'uuid' })
  async remove(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('fileId', ParseUUIDPipe) fileId: string,
    @CurrentUser() user: ICurrentUser,
  ): Promise<{ message: string }> {
    await this.registrationFilesService.deleteParticipantFile(
      eventId,
      fileId,
      user,
    );
    return { message: 'Файл удалён' };
  }
}

/**
 * Organizer-facing endpoints to list/download participant answer files.
 * Tenant isolation is enforced in the service via the event's organizationId.
 */
@ApiTags('registration-files')
@Controller('events/:eventId/registrations/:registrationId/files')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class OrganizerRegistrationFilesController {
  constructor(
    private readonly registrationFilesService: RegistrationFilesService,
  ) {}

  @Get()
  @RequirePermissions(PERMISSIONS.EVENTS_READ)
  @ApiOperation({ summary: 'Файлы-ответы участника (для организатора)' })
  @ApiResponse({ status: 200, type: [RegistrationFileEntity] })
  async list(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('registrationId', ParseUUIDPipe) registrationId: string,
    @CurrentUser() user: ICurrentUser,
  ): Promise<RegistrationFileEntity[]> {
    return this.registrationFilesService.listForRegistration(
      eventId,
      registrationId,
      user,
    );
  }

  @Get(':fileId/download')
  @RequirePermissions(PERMISSIONS.EVENTS_READ)
  @ApiOperation({ summary: 'Скачать файл-ответ участника (для организатора)' })
  @ApiParam({ name: 'fileId', type: 'string', format: 'uuid' })
  async download(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('fileId', ParseUUIDPipe) fileId: string,
    @CurrentUser() user: ICurrentUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { stream, originalName, mimeType } =
      await this.registrationFilesService.getDownloadForOrganizer(
        eventId,
        fileId,
        user,
      );

    res.set({
      'Content-Type': mimeType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(originalName)}"`,
    });

    return new StreamableFile(stream);
  }
}
