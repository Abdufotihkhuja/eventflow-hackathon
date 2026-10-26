import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import type { ICurrentUser } from '../../../common/interfaces';
import { Prisma, UserType } from '@prisma/client';
import { FileStorageService } from '../../storage/application/file-storage.service';
import { MaterialsRepository } from './materials.repository';
import type { MaterialTitleTranslations } from './dto/add-material-link.dto';

const ALLOWED_LOCALES: ReadonlyArray<keyof MaterialTitleTranslations> = [
  'ru',
  'uz',
  'en',
] as const;

function sanitizeTitleTranslations(
  input: MaterialTitleTranslations | undefined,
): Record<string, string> {
  const result: Record<string, string> = {};
  if (!input || typeof input !== 'object') return result;
  for (const locale of ALLOWED_LOCALES) {
    const value = input[locale];
    if (typeof value === 'string' && value.trim().length > 0) {
      result[locale] = value.trim();
    }
  }
  return result;
}

export interface IUploadedMaterial {
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  url: string;
}

@Injectable()
export class MaterialsService {
  private readonly uploadsDir = 'materials';

  // Разрешенные типы файлов для материалов
  private readonly allowedMimeTypes = [
    // Документы
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    // Презентации
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    // Таблицы
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    // Изображения
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    // Архивы
    'application/zip',
    'application/x-rar-compressed',
    // Текст
    'text/plain',
    'text/markdown',
  ];

  private readonly maxFileSize = 50 * 1024 * 1024; // 50MB

  constructor(
    private readonly materialsRepository: MaterialsRepository,
    private readonly storage: FileStorageService,
  ) {
    this.ensureUploadDirExists();
  }

  private ensureUploadDirExists(): void {
    this.storage.ensureDirectory(this.uploadsDir);
  }

  /**
   * Загружает файл материала для элемента агенды
   */
  async uploadMaterial(
    eventId: string,
    agendaItemId: string,
    file: Express.Multer.File,
    user: ICurrentUser,
  ): Promise<IUploadedMaterial> {
    // Проверка прав доступа
    await this.checkAccess(eventId, user);

    // Проверка существования элемента агенды
    const agendaItem = await this.materialsRepository.findAgendaItemInEvent(
      eventId,
      agendaItemId,
    );

    if (!agendaItem) {
      throw new NotFoundException('Элемент агенды не найден');
    }

    // Валидация файла
    if (!file) {
      throw new BadRequestException('Файл не предоставлен');
    }

    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Недопустимый тип файла. Разрешены: PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, изображения, архивы`,
      );
    }

    if (file.size > this.maxFileSize) {
      throw new BadRequestException('Размер файла превышает 50MB');
    }

    // Сохранение файла
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `${uuidv4()}${ext}`;
    const storedFile = await this.storage.save({
      buffer: file.buffer,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      directory: this.uploadsDir,
      fileName: filename,
    });
    const fileUrl = storedFile.url;

    // Обновление массива materials в агенде
    await this.materialsRepository.appendMaterial(agendaItemId, fileUrl);

    return {
      filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      url: fileUrl,
    };
  }

  /**
   * Загружает несколько файлов материалов
   */
  async uploadMultipleMaterials(
    eventId: string,
    agendaItemId: string,
    files: Express.Multer.File[],
    user: ICurrentUser,
  ): Promise<IUploadedMaterial[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException('Файлы не предоставлены');
    }

    if (files.length > 10) {
      throw new BadRequestException('Максимум 10 файлов за один раз');
    }

    const uploadedFiles: IUploadedMaterial[] = [];

    for (const file of files) {
      const uploaded = await this.uploadMaterial(
        eventId,
        agendaItemId,
        file,
        user,
      );
      uploadedFiles.push(uploaded);
    }

    return uploadedFiles;
  }

  /**
   * Добавляет внешнюю ссылку (URL) в материалы элемента агенды
   */
  async addLink(
    eventId: string,
    agendaItemId: string,
    url: string,
    user: ICurrentUser,
    titleTranslations?: MaterialTitleTranslations,
  ): Promise<{ url: string; titleTranslations: Record<string, string> }> {
    await this.checkAccess(eventId, user);

    const agendaItem = await this.materialsRepository.findAgendaItemInEvent(
      eventId,
      agendaItemId,
    );

    if (!agendaItem) {
      throw new NotFoundException('Элемент агенды не найден');
    }

    const normalizedUrl = url.trim();
    if (agendaItem.materials.includes(normalizedUrl)) {
      throw new BadRequestException('Эта ссылка уже добавлена в материалы');
    }

    const sanitizedLabels = sanitizeTitleTranslations(titleTranslations);
    await this.materialsRepository.appendMaterialWithLabels(
      agendaItemId,
      normalizedUrl,
      sanitizedLabels,
      agendaItem.materialLabels,
    );

    return { url: normalizedUrl, titleTranslations: sanitizedLabels };
  }

  /**
   * Удаляет материал из элемента агенды
   */
  async deleteMaterial(
    eventId: string,
    agendaItemId: string,
    fileUrl: string,
    user: ICurrentUser,
  ): Promise<void> {
    // Проверка прав доступа
    await this.checkAccess(eventId, user);

    // Проверка существования элемента агенды
    const agendaItem = await this.materialsRepository.findAgendaItemInEvent(
      eventId,
      agendaItemId,
    );

    if (!agendaItem) {
      throw new NotFoundException('Элемент агенды не найден');
    }

    // Проверка, что файл есть в массиве materials
    if (!agendaItem.materials.includes(fileUrl)) {
      throw new NotFoundException('Материал не найден в элементе агенды');
    }

    // Удаление файла из файловой системы
    if (fileUrl.startsWith('/uploads/')) {
      await this.storage.remove(fileUrl);
    }

    // Удаление URL из массива materials и из map labels.
    const updatedMaterials = agendaItem.materials.filter((m) => m !== fileUrl);
    const labelsObject =
      typeof agendaItem.materialLabels === 'object' &&
      agendaItem.materialLabels !== null &&
      !Array.isArray(agendaItem.materialLabels)
        ? (agendaItem.materialLabels as Prisma.JsonObject)
        : {};
    const nextLabels: Prisma.JsonObject = { ...labelsObject };
    delete nextLabels[fileUrl];

    await this.materialsRepository.replaceMaterialsAndLabels(
      agendaItemId,
      updatedMaterials,
      nextLabels,
    );
  }

  /**
   * Публичный путь к файлу материала. Не требует авторизации, но:
   *  - событие должно быть PUBLISHED (черновики и pending-review не светим);
   *  - fileUrl должен быть в списке materials конкретного agenda-item
   *    (никакого path traversal — только зарегистрированные в БД ссылки);
   *  - принимаются только относительные /uploads/* пути (внешние https://
   *    линки скачиваются клиентом напрямую, не через нас).
   *
   * Это решает 404 на проде, где nginx режет /uploads/materials/ для
   * прямого статического доступа, но публичный листинг агенды уже
   * раздаёт эти URL'ы без авторизации.
   */
  async getPublicMaterialPath(
    eventId: string,
    agendaItemId: string,
    fileUrl: string,
  ): Promise<{ filepath: string; originalName: string }> {
    if (!fileUrl || !fileUrl.startsWith('/uploads/')) {
      throw new BadRequestException(
        'fileUrl должен быть относительной /uploads/ ссылкой',
      );
    }

    const event = await this.materialsRepository.findEventStatus(eventId);
    if (!event) {
      throw new NotFoundException('Мероприятие не найдено');
    }
    if (event.status !== 'PUBLISHED') {
      throw new NotFoundException('Материалы недоступны');
    }

    const agendaItem = await this.materialsRepository.findAgendaItemInEvent(
      eventId,
      agendaItemId,
    );
    if (!agendaItem) {
      throw new NotFoundException('Элемент агенды не найден');
    }

    if (!agendaItem.materials.includes(fileUrl)) {
      throw new NotFoundException('Материал не найден в элементе агенды');
    }

    const filepath = this.storage.getAbsolutePath(fileUrl);
    if (!this.storage.exists(fileUrl)) {
      throw new NotFoundException('Файл не найден на сервере');
    }

    return { filepath, originalName: path.basename(filepath) };
  }

  /**
   * Получает путь к файлу для скачивания
   */
  async getMaterialPath(
    eventId: string,
    agendaItemId: string,
    fileUrl: string,
    user: ICurrentUser,
  ): Promise<{ filepath: string; originalName: string }> {
    await this.checkAccess(eventId, user);

    // Проверка существования элемента агенды
    const agendaItem = await this.materialsRepository.findAgendaItemInEvent(
      eventId,
      agendaItemId,
    );

    if (!agendaItem) {
      throw new NotFoundException('Элемент агенды не найден');
    }

    // Проверка, что файл есть в массиве materials
    if (!agendaItem.materials.includes(fileUrl)) {
      throw new NotFoundException('Материал не найден в элементе агенды');
    }

    // Получение пути к файлу
    const filepath = this.storage.getAbsolutePath(fileUrl);

    if (!this.storage.exists(fileUrl)) {
      throw new NotFoundException('Файл не найден на сервере');
    }

    return {
      filepath,
      originalName: path.basename(filepath),
    };
  }

  /**
   * Получает список всех материалов элемента агенды.
   * Возвращает URL + локализованные подписи (если есть).
   */
  async getMaterials(
    eventId: string,
    agendaItemId: string,
    user: ICurrentUser,
  ): Promise<{
    items: Array<{ url: string; titleTranslations: Record<string, string> }>;
  }> {
    await this.checkAccess(eventId, user);

    // Проверка существования элемента агенды
    const agendaItem = await this.materialsRepository.findAgendaItemInEvent(
      eventId,
      agendaItemId,
    );

    if (!agendaItem) {
      throw new NotFoundException('Элемент агенды не найден');
    }

    const labelsObject =
      typeof agendaItem.materialLabels === 'object' &&
      agendaItem.materialLabels !== null &&
      !Array.isArray(agendaItem.materialLabels)
        ? (agendaItem.materialLabels as Prisma.JsonObject)
        : {};

    return {
      items: agendaItem.materials.map((url) => {
        const raw = labelsObject[url];
        const titleTranslations: Record<string, string> = {};
        if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
          for (const locale of ALLOWED_LOCALES) {
            const value = (raw as Record<string, unknown>)[locale];
            if (typeof value === 'string' && value.trim().length > 0) {
              titleTranslations[locale] = value.trim();
            }
          }
        }
        return { url, titleTranslations };
      }),
    };
  }

  /**
   * Проверяет права доступа пользователя к событию (только организаторы)
   */
  private async checkAccess(
    eventId: string,
    user: ICurrentUser,
  ): Promise<void> {
    const organizationId = this.getOrganizationId(user);

    const event = await this.materialsRepository.findEventAccess(eventId);

    if (!event) {
      throw new NotFoundException('Мероприятие не найдено');
    }

    if (organizationId !== event.organizationId) {
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
      'Только организаторы могут управлять материалами',
    );
  }
}
