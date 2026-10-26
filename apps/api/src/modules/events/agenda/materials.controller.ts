import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  Body,
  Query,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  ParseUUIDPipe,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { MaterialsService, IUploadedMaterial } from './materials.service';
import { AddMaterialLinkDto } from './dto/add-material-link.dto';
import { JwtAuthGuard } from '../../../common/guards';
import { CurrentUser } from '../../../common/decorators';
import type { ICurrentUser } from '../../../common/interfaces';
import { FileStorageService } from '../../storage/application/file-storage.service';

@ApiTags('agenda-materials')
@Controller('events/:eventId/agenda/:agendaItemId/materials')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MaterialsController {
  constructor(
    private readonly materialsService: MaterialsService,
    private readonly storage: FileStorageService,
  ) {}

  @Post('link')
  @ApiOperation({
    summary: 'Добавить ссылку на материал',
    description:
      'Добавляет внешнюю ссылку (Google Drive, облако и т.д.) в материалы элемента агенды. Только для организаторов.',
  })
  @ApiResponse({
    status: 201,
    description: 'Ссылка успешно добавлена',
    schema: {
      type: 'object',
      properties: { url: { type: 'string', example: 'https://example.com/doc.pdf' } },
    },
  })
  @ApiParam({ name: 'eventId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'agendaItemId', type: 'string', format: 'uuid' })
  async addLink(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('agendaItemId', ParseUUIDPipe) agendaItemId: string,
    @Body() dto: AddMaterialLinkDto,
    @CurrentUser() user: ICurrentUser,
  ): Promise<{ url: string; titleTranslations: Record<string, string> }> {
    // Совместимость с легаси-клиентами: scalar `title` сохраняем в ru-локали,
    // если phраза titleTranslations не передана.
    const fallbackTranslations =
      dto.titleTranslations ??
      (dto.title || dto.name
        ? { ru: (dto.title ?? dto.name)!.trim() }
        : undefined);
    return this.materialsService.addLink(
      eventId,
      agendaItemId,
      dto.url,
      user,
      fallbackTranslations,
    );
  }

  @Post('upload')
  @ApiOperation({
    summary: 'Загрузить материал для элемента агенды',
    description:
      'Загружает один файл материала (PDF, DOC, PPT, изображения, архивы). Только для организаторов.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Файл материала (макс. 50MB)',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Материал успешно загружен',
    schema: {
      type: 'object',
      properties: {
        filename: { type: 'string', example: 'uuid.pdf' },
        originalName: { type: 'string', example: 'presentation.pdf' },
        mimetype: { type: 'string', example: 'application/pdf' },
        size: { type: 'number', example: 1024000 },
        url: { type: 'string', example: '/uploads/materials/uuid.pdf' },
      },
    },
  })
  @ApiParam({ name: 'eventId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'agendaItemId', type: 'string', format: 'uuid' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadMaterial(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('agendaItemId', ParseUUIDPipe) agendaItemId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: ICurrentUser,
  ): Promise<IUploadedMaterial> {
    return this.materialsService.uploadMaterial(
      eventId,
      agendaItemId,
      file,
      user,
    );
  }

  @Post('upload-multiple')
  @ApiOperation({
    summary: 'Загрузить несколько материалов',
    description:
      'Загружает до 10 файлов за один раз. Только для организаторов.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description: 'Массив файлов (макс. 10 файлов)',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Материалы успешно загружены',
    type: [Object],
  })
  @ApiParam({ name: 'eventId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'agendaItemId', type: 'string', format: 'uuid' })
  @UseInterceptors(FilesInterceptor('files', 10))
  async uploadMultipleMaterials(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('agendaItemId', ParseUUIDPipe) agendaItemId: string,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() user: ICurrentUser,
  ): Promise<IUploadedMaterial[]> {
    return this.materialsService.uploadMultipleMaterials(
      eventId,
      agendaItemId,
      files,
      user,
    );
  }

  @Get()
  @ApiOperation({
    summary: 'Получить список материалов элемента агенды',
    description:
      'Возвращает массив URL материалов. Доступно авторизованным пользователям.',
  })
  @ApiResponse({
    status: 200,
    description: 'Список материалов с локализованными подписями',
    schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              url: { type: 'string', example: '/uploads/materials/uuid.pdf' },
              titleTranslations: {
                type: 'object',
                additionalProperties: { type: 'string' },
                example: { ru: 'Доклад', en: 'Talk' },
              },
            },
          },
        },
      },
    },
  })
  @ApiParam({ name: 'eventId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'agendaItemId', type: 'string', format: 'uuid' })
  async getMaterials(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('agendaItemId', ParseUUIDPipe) agendaItemId: string,
    @CurrentUser() user: ICurrentUser,
  ): Promise<{
    items: Array<{ url: string; titleTranslations: Record<string, string> }>;
  }> {
    return this.materialsService.getMaterials(eventId, agendaItemId, user);
  }

  @Get('download')
  @ApiOperation({
    summary: 'Скачать материал',
    description:
      'Скачивает файл материала по URL. Доступно авторизованным пользователям.',
  })
  @ApiResponse({
    status: 200,
    description: 'Файл для скачивания',
    content: {
      'application/octet-stream': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiParam({ name: 'eventId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'agendaItemId', type: 'string', format: 'uuid' })
  async downloadMaterial(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('agendaItemId', ParseUUIDPipe) agendaItemId: string,
    @Query('fileUrl') fileUrl: string,
    @CurrentUser() user: ICurrentUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    if (!fileUrl) {
      throw new Error('Параметр fileUrl обязателен');
    }

    const { filepath, originalName } =
      await this.materialsService.getMaterialPath(
        eventId,
        agendaItemId,
        fileUrl,
        user,
      );

    const file = this.storage.createReadStream(filepath);

    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(originalName)}"`,
    });

    return new StreamableFile(file);
  }

  @Delete()
  @ApiOperation({
    summary: 'Удалить материал',
    description:
      'Удаляет файл материала из агенды и файловой системы. Только для организаторов.',
  })
  @ApiResponse({
    status: 200,
    description: 'Материал успешно удален',
  })
  @ApiParam({ name: 'eventId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'agendaItemId', type: 'string', format: 'uuid' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        fileUrl: {
          type: 'string',
          example: '/uploads/materials/uuid.pdf',
          description: 'URL материала для удаления',
        },
      },
      required: ['fileUrl'],
    },
  })
  async deleteMaterial(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('agendaItemId', ParseUUIDPipe) agendaItemId: string,
    @Body('fileUrl') fileUrl: string,
    @CurrentUser() user: ICurrentUser,
  ): Promise<{ message: string }> {
    await this.materialsService.deleteMaterial(
      eventId,
      agendaItemId,
      fileUrl,
      user,
    );
    return { message: 'Материал успешно удален' };
  }
}
