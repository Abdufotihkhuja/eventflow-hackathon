import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { FileStorageService } from '../storage/application/file-storage.service';

export interface IUploadedFile {
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  url: string;
}

@Injectable()
export class UploadsService {
  private readonly allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
  ];
  // Каноническое расширение по проверенному MIME. Расширение хранимого файла
  // берётся ОТСЮДА, а не из имени файла клиента: иначе злоумышленник с валидным
  // MIME (image/png) и именем "x.html"/"x.svg" сохранял бы исполняемый на origin
  // файл (stored XSS). Ключи — единственно допустимые типы.
  private readonly imageExtByMime: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
  };
  private readonly maxFileSize = 5 * 1024 * 1024; // 5MB
  private readonly maxTemplateSize = 10 * 1024 * 1024; // 10MB для шаблонов сертификатов
  private readonly templateSubdir = 'certificate-templates';
  private readonly badgeTemplateSubdir = 'badge-templates';
  private readonly placesSubdir = 'places';
  private readonly svgMimeType = 'image/svg+xml';
  private readonly maxSvgSize = 512 * 1024; // 512KB для иконок

  constructor(private readonly storage: FileStorageService) {
    this.ensureUploadDirExists();
  }

  private ensureUploadDirExists(): void {
    this.storage.ensureDirectory();
    this.storage.ensureDirectory(this.templateSubdir);
    this.storage.ensureDirectory(this.badgeTemplateSubdir);
    this.storage.ensureDirectory(this.placesSubdir);
  }

  async uploadImage(file: Express.Multer.File): Promise<IUploadedFile> {
    return this.uploadImageToSubdir(file);
  }

  async uploadPlaceImage(file: Express.Multer.File): Promise<IUploadedFile> {
    return this.uploadImageToSubdir(file, this.placesSubdir);
  }

  private async uploadImageToSubdir(
    file: Express.Multer.File,
    subdir?: string,
  ): Promise<IUploadedFile> {
    if (!file) {
      throw new BadRequestException('Файл не предоставлен');
    }

    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Недопустимый тип файла. Разрешены: JPEG, PNG, GIF, WebP',
      );
    }

    if (file.size > this.maxFileSize) {
      throw new BadRequestException('Размер файла превышает 5MB');
    }

    // Клиентский mimetype — не доказательство содержимого. Проверяем magic-bytes.
    this.assertImageSignature(file.buffer, file.mimetype);

    // Расширение — из проверенного MIME, НЕ из имени файла клиента.
    const ext = this.imageExtByMime[file.mimetype];
    const filename = `${uuidv4()}${ext}`;
    const storedFile = await this.storage.save({
      buffer: file.buffer,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      directory: subdir,
      fileName: filename,
    });

    return {
      filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      url: storedFile.url,
    };
  }

  /**
   * Загрузка иконки в формате SVG (для категорий и т.п.).
   * Принимает только image/svg+xml, макс. 512KB.
   */
  async uploadSvgIcon(file: Express.Multer.File): Promise<IUploadedFile> {
    if (!file) {
      throw new BadRequestException('Файл не предоставлен');
    }

    if (file.mimetype !== this.svgMimeType) {
      throw new BadRequestException(
        'Недопустимый тип файла. Разрешён только SVG (image/svg+xml)',
      );
    }

    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.svg') {
      throw new BadRequestException('Расширение файла должно быть .svg');
    }

    if (file.size > this.maxSvgSize) {
      throw new BadRequestException(
        `Размер файла превышает ${this.maxSvgSize / 1024}KB`,
      );
    }

    // Санитизация SVG: отклоняем файлы с активным содержимым (script,
    // обработчики событий, foreignObject, javascript:/data:text-href).
    // Иконка — статичная графика; исполняемый SVG = stored-XSS при прямом
    // открытии. Дополняет nginx nosniff + Content-Disposition: attachment.
    this.assertSafeSvg(file.buffer);

    const filename = `${uuidv4()}.svg`;
    const storedFile = await this.storage.save({
      buffer: file.buffer,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      fileName: filename,
    });

    return {
      filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      url: storedFile.url,
    };
  }

  /**
   * Загрузка изображения шаблона сертификата (PNG/JPEG, до 10MB).
   * Сохраняет в uploads/certificate-templates/.
   */
  async uploadCertificateTemplateImage(
    file: Express.Multer.File,
  ): Promise<IUploadedFile> {
    return this.uploadTemplateImage(file, this.templateSubdir);
  }

  async uploadBadgeTemplateImage(
    file: Express.Multer.File,
  ): Promise<IUploadedFile> {
    return this.uploadTemplateImage(file, this.badgeTemplateSubdir);
  }

  private async uploadTemplateImage(
    file: Express.Multer.File,
    subdir: string,
  ): Promise<IUploadedFile> {
    if (!file) {
      throw new BadRequestException('Файл не предоставлен');
    }

    const allowedTemplateTypes = ['image/jpeg', 'image/png'];
    if (!allowedTemplateTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Недопустимый тип файла. Разрешены: PNG, JPEG',
      );
    }

    if (file.size > this.maxTemplateSize) {
      throw new BadRequestException('Размер файла превышает 10MB');
    }

    this.assertImageSignature(file.buffer, file.mimetype);

    // Расширение — из проверенного MIME (jpeg → .jpg, png → .png), не из имени клиента.
    const ext = this.imageExtByMime[file.mimetype];
    const filename = `${uuidv4()}${ext}`;
    const storedFile = await this.storage.save({
      buffer: file.buffer,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      directory: subdir,
      fileName: filename,
    });

    return {
      filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      url: storedFile.url,
    };
  }

  /**
   * Удаляет файл шаблона по URL (например /uploads/certificate-templates/uuid.png).
   */
  deleteTemplateFileByUrl(url: string): Promise<void> {
    if (!this.isKnownTemplateUrl(url)) {
      throw new BadRequestException('Недопустимый URL файла шаблона');
    }
    if (!this.storage.exists(url)) {
      return Promise.resolve();
    }
    return this.storage.remove(url);
  }

  getTemplateFilePath(url: string): string {
    if (!this.isKnownTemplateUrl(url)) {
      throw new BadRequestException('Недопустимый URL файла шаблона');
    }
    const filepath = this.storage.getAbsolutePath(url);
    if (!this.storage.exists(url)) {
      throw new NotFoundException('Файл шаблона не найден');
    }
    return filepath;
  }

  private isKnownTemplateUrl(url: string): boolean {
    return (
      url.startsWith(`/uploads/${this.templateSubdir}/`) ||
      url.startsWith(`/uploads/${this.badgeTemplateSubdir}/`)
    );
  }

  /**
   * Проверяет, что первые байты буфера соответствуют заявленному типу
   * изображения (magic-bytes). Отсекает файлы с подделанным Content-Type
   * (например HTML/SVG-полезная нагрузка под видом image/png).
   */
  private assertImageSignature(
    buffer: Buffer | undefined,
    mimetype: string,
  ): void {
    if (!buffer || buffer.length < 12) {
      throw new BadRequestException('Повреждённый или пустой файл');
    }

    const matches = ((): boolean => {
      switch (mimetype) {
        case 'image/jpeg':
          return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
        case 'image/png':
          return (
            buffer[0] === 0x89 &&
            buffer[1] === 0x50 &&
            buffer[2] === 0x4e &&
            buffer[3] === 0x47 &&
            buffer[4] === 0x0d &&
            buffer[5] === 0x0a &&
            buffer[6] === 0x1a &&
            buffer[7] === 0x0a
          );
        case 'image/gif':
          return (
            buffer.toString('ascii', 0, 6) === 'GIF87a' ||
            buffer.toString('ascii', 0, 6) === 'GIF89a'
          );
        case 'image/webp':
          return (
            buffer.toString('ascii', 0, 4) === 'RIFF' &&
            buffer.toString('ascii', 8, 12) === 'WEBP'
          );
        default:
          return false;
      }
    })();

    if (!matches) {
      throw new BadRequestException(
        'Содержимое файла не соответствует заявленному типу изображения',
      );
    }
  }

  /**
   * Отклоняет SVG с активным/опасным содержимым. Консервативная эвристика
   * (без тяжёлого парсера-санитайзера): достаточно в связке с serving-хардненингом
   * (nosniff + attachment), т.к. эндпоинт под SUPER_ADMIN.
   */
  private assertSafeSvg(buffer: Buffer | undefined): void {
    if (!buffer || buffer.length === 0) {
      throw new BadRequestException('Повреждённый или пустой файл');
    }
    const svg = buffer.toString('utf8');
    const dangerous = [
      /<script[\s/>]/i, // встроенный скрипт
      /\son\w+\s*=/i, // onload=, onclick= и прочие обработчики
      /<foreignObject[\s/>]/i, // произвольный HTML внутри SVG
      /<iframe[\s/>]/i,
      /<embed[\s/>]/i,
      /javascript:/i, // javascript:-URL
      /<!ENTITY/i, // внешние сущности (XXE/биллион-лаф)
    ];
    if (dangerous.some((re) => re.test(svg))) {
      throw new BadRequestException(
        'SVG содержит недопустимые активные элементы (скрипты/обработчики)',
      );
    }
  }

  async deleteFile(filename: string): Promise<void> {
    if (!this.storage.exists(filename)) {
      throw new NotFoundException('Файл не найден');
    }

    await this.storage.remove(filename);
  }

  getFilePath(filename: string): string {
    const filepath = this.storage.getAbsolutePath(filename);
    if (!this.storage.exists(filename)) {
      throw new NotFoundException('Файл не найден');
    }

    return filepath;
  }
}
