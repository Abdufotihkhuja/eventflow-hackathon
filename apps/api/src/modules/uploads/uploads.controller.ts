import {
  Controller,
  Post,
  Delete,
  ForbiddenException,
  Param,
  UseInterceptors,
  UploadedFile,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UploadsService, IUploadedFile } from './uploads.service';
import { JwtAuthGuard } from '../../common/guards';

@ApiTags('uploads')
@Controller('uploads')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('image')
  @ApiOperation({ summary: 'Загрузить изображение' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  // limits: Multer обрывает поток, как только превышен размер, ДО буферизации
  // всего тела в память (иначе злоумышленник заливает до nginx-лимита в RAM
  // ещё до пост-проверки размера в сервисе). 5MB — как maxFileSize сервиса.
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    }),
  )
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<IUploadedFile> {
    return this.uploadsService.uploadImage(file);
  }

  @Delete(':filename')
  @ApiOperation({ summary: 'Удалить файл' })
  async deleteFile(@Param('filename') _filename: string): Promise<never> {
    void _filename;
    throw new ForbiddenException(
      'Generic upload deletion endpoint is disabled in production hardening mode',
    );
  }
}
