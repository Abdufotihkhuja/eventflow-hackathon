import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AppBuild } from '@prisma/client';
import type { ReadStream } from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../prisma/prisma.service';
import type { ICurrentUser } from '../../common/interfaces';
import { AppBuildsStorage } from './app-builds.storage';
import { CreateAppBuildDto } from './dto/create-app-build.dto';
import { AppBuildEntity } from './entities/app-build.entity';
import {
  ALLOWED_APP_BUILD_TYPES,
  MAX_APP_BUILD_SIZE_MB,
  MB,
  PLATFORM_EXTENSIONS,
} from './app-builds.constants';

@Injectable()
export class AppBuildsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: AppBuildsStorage,
  ) {}

  async upload(
    dto: CreateAppBuildDto,
    file: Express.Multer.File | undefined,
    user: ICurrentUser,
  ): Promise<AppBuildEntity> {
    if (!file) {
      throw new BadRequestException('Файл не передан');
    }

    const ext = path.extname(file.originalname).toLowerCase();
    const allowedMimes = ALLOWED_APP_BUILD_TYPES[ext];
    if (!allowedMimes) {
      throw new BadRequestException(
        `Недопустимый тип файла. Разрешены: ${Object.keys(ALLOWED_APP_BUILD_TYPES).join(', ')}`,
      );
    }
    if (!PLATFORM_EXTENSIONS[dto.platform].includes(ext)) {
      throw new BadRequestException(
        `Файл ${ext} не соответствует платформе ${dto.platform}`,
      );
    }
    if (file.mimetype && !allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException('MIME-тип файла не соответствует расширению');
    }
    if (file.size > MAX_APP_BUILD_SIZE_MB * MB) {
      throw new BadRequestException(
        `Файл слишком большой (максимум ${MAX_APP_BUILD_SIZE_MB} МБ)`,
      );
    }

    const safeName = `${uuidv4()}${ext}`;
    const relativeDir = path.posix.join(dto.platform.toLowerCase());
    const storedPath = await this.storage.save(relativeDir, safeName, file.buffer);

    const created = await this.prisma.appBuild.create({
      data: {
        platform: dto.platform,
        version: dto.version.trim(),
        notes: dto.notes?.trim() || null,
        originalName: this.sanitizeOriginalName(file.originalname),
        storedPath,
        mimeType: file.mimetype || 'application/octet-stream',
        size: file.size,
        uploadedById: user.sub,
        uploadedByEmail: user.email,
      },
    });

    return new AppBuildEntity(created);
  }

  async list(): Promise<AppBuildEntity[]> {
    const builds = await this.prisma.appBuild.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return builds.map((b) => new AppBuildEntity(b));
  }

  async getDownload(id: string): Promise<{
    stream: ReadStream;
    originalName: string;
    mimeType: string;
    size: number;
  }> {
    const build = await this.findByIdOrThrow(id);
    return {
      stream: this.storage.createReadStream(build.storedPath),
      originalName: build.originalName,
      mimeType: build.mimeType,
      size: build.size,
    };
  }

  async remove(id: string): Promise<void> {
    const build = await this.findByIdOrThrow(id);
    await this.prisma.appBuild.delete({ where: { id: build.id } });
    // Файл удаляем после записи: осиротевший файл безобиден, а битая запись
    // (запись есть, файла нет) ломала бы скачивание.
    await this.storage.remove(build.storedPath);
  }

  private async findByIdOrThrow(id: string): Promise<AppBuild> {
    const build = await this.prisma.appBuild.findUnique({ where: { id } });
    if (!build) {
      throw new NotFoundException('Сборка не найдена');
    }
    return build;
  }

  /** Client filename is untrusted: keep basename only, cap the length. */
  private sanitizeOriginalName(originalName: string): string {
    const base = path.basename(originalName).replace(/[\r\n"\\]/g, '_');
    return base.length > 200 ? base.slice(-200) : base;
  }
}
