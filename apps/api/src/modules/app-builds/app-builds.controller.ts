import {
  Body,
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
import { UserType } from '@prisma/client';
import { CurrentUser, Roles } from '../../common/decorators';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import type { ICurrentUser } from '../../common/interfaces';
import { AppBuildsService } from './app-builds.service';
import { CreateAppBuildDto } from './dto/create-app-build.dto';
import { AppBuildEntity } from './entities/app-build.entity';
import { MAX_APP_BUILD_SIZE_MB, MB } from './app-builds.constants';

/**
 * Internal distribution of mobile app builds (APK/IPA) for team testing.
 * SUPER_ADMIN only; files live in private storage (never served statically).
 */
@ApiTags('super-admin')
@Controller('super-admin/app-builds')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserType.SUPER_ADMIN)
@ApiBearerAuth()
export class AppBuildsController {
  constructor(private readonly appBuildsService: AppBuildsService) {}

  @Post()
  @ApiOperation({ summary: 'Загрузить сборку мобильного приложения' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        platform: { type: 'string', enum: ['ANDROID', 'IOS'] },
        version: { type: 'string' },
        notes: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 201, type: AppBuildEntity })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_APP_BUILD_SIZE_MB * MB, files: 1 },
    }),
  )
  async upload(
    @Body() dto: CreateAppBuildDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: ICurrentUser,
  ): Promise<AppBuildEntity> {
    return this.appBuildsService.upload(dto, file, user);
  }

  @Get()
  @ApiOperation({ summary: 'Список сборок мобильного приложения' })
  @ApiResponse({ status: 200, type: [AppBuildEntity] })
  async list(): Promise<AppBuildEntity[]> {
    return this.appBuildsService.list();
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Скачать сборку' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async download(
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { stream, originalName, mimeType, size } =
      await this.appBuildsService.getDownload(id);

    res.set({
      'Content-Type': mimeType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(originalName)}"`,
      'Content-Length': String(size),
    });

    return new StreamableFile(stream);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить сборку' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ message: string }> {
    await this.appBuildsService.remove(id);
    return { message: 'Сборка удалена' };
  }
}
