import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { BoardTaskAttachment, ActivityType } from '@prisma/client';
import { BoardsRepository } from '../boards.repository';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { FileStorageService } from '../../storage/application/file-storage.service';

@Injectable()
export class AttachmentsService {
  private readonly uploadDir = 'tasks';
  private readonly allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'application/zip',
  ];
  private readonly maxFileSize = 10 * 1024 * 1024; // 10MB

  constructor(
    private readonly prisma: PrismaService,
    private readonly boardsRepository: BoardsRepository,
    private readonly storage: FileStorageService,
  ) {
    this.ensureUploadDirExists();
  }

  private ensureUploadDirExists(): void {
    this.storage.ensureDirectory(this.uploadDir);
  }

  async upload(
    taskId: string,
    file: Express.Multer.File,
    memberId: string | null,
    orgId: string,
  ): Promise<BoardTaskAttachment> {
    const task = await this.prisma.boardTask.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new NotFoundException(`Задача с ID ${taskId} не найдена`);
    }

    await this.checkMemberAccess(task.boardId, memberId, orgId);

    if (!file) {
      throw new BadRequestException('Файл не предоставлен');
    }

    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Недопустимый тип файла. Разрешены: изображения, PDF, Word, Excel, TXT, ZIP',
      );
    }

    if (file.size > this.maxFileSize) {
      throw new BadRequestException('Размер файла превышает 10MB');
    }

    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `${uuidv4()}${ext}`;
    const storedFile = await this.storage.save({
      buffer: file.buffer,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      directory: this.uploadDir,
      fileName: filename,
    });

    const attachment = await this.prisma.$transaction(async (tx) => {
      const newAttachment = await tx.boardTaskAttachment.create({
        data: {
          taskId,
          fileName: file.originalname,
          fileUrl: storedFile.url,
          fileSize: file.size,
          mimeType: file.mimetype,
          uploadedById: memberId,
        },
      });

      await tx.boardTaskActivity.create({
        data: {
          taskId,
          memberId,
          type: ActivityType.ATTACHMENT_ADDED,
          details: {
            attachmentId: newAttachment.id,
            fileName: file.originalname,
          },
        },
      });

      return newAttachment;
    });

    return attachment;
  }

  async findByTaskId(
    taskId: string,
    memberId: string | null,
    orgId: string,
  ): Promise<BoardTaskAttachment[]> {
    const task = await this.prisma.boardTask.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new NotFoundException(`Задача с ID ${taskId} не найдена`);
    }

    await this.checkMemberAccess(task.boardId, memberId, orgId);

    return this.prisma.boardTaskAttachment.findMany({
      where: { taskId },
      orderBy: { createdAt: 'desc' },
      include: {
        uploadedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });
  }

  async delete(
    taskId: string,
    id: string,
    memberId: string | null,
    orgId: string,
  ): Promise<void> {
    const attachment = await this.prisma.boardTaskAttachment.findUnique({
      where: { id },
      include: { task: true },
    });

    if (!attachment) {
      throw new NotFoundException(`Вложение с ID ${id} не найдено`);
    }

    await this.checkMemberAccess(attachment.task.boardId, memberId, orgId);

    // Organization имеет полный доступ
    if (memberId) {
      // Проверяем права: автор или админ
      const isOwnerOrAdmin = await this.boardsRepository.isOwnerOrAdmin(
        attachment.task.boardId,
        memberId,
      );

      if (attachment.uploadedById !== memberId && !isOwnerOrAdmin) {
        throw new ForbiddenException('Недостаточно прав для удаления');
      }
    }

    // Удаляем файл
    if (attachment.fileUrl.startsWith('/uploads/')) {
      await this.storage.remove(attachment.fileUrl);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.boardTaskAttachment.delete({ where: { id } });

      await tx.boardTaskActivity.create({
        data: {
          taskId,
          memberId,
          type: ActivityType.ATTACHMENT_REMOVED,
          details: { fileName: attachment.fileName },
        },
      });
    });
  }

  /**
   * Проверяет доступ к доске
   * Organization (memberId = null) имеет полный доступ
   */
  private async checkMemberAccess(
    boardId: string,
    memberId: string | null,
    orgId: string,
  ): Promise<void> {
    const boardOrgId = await this.boardsRepository.getOrganizationId(boardId);
    if (!boardOrgId) {
      throw new NotFoundException('Доска не найдена');
    }
    if (boardOrgId !== orgId) {
      throw new ForbiddenException('У вас нет доступа к этой доске');
    }

    // Organization имеет полный доступ
    if (!memberId) return;

    const isMember = await this.boardsRepository.isMember(boardId, memberId);
    if (!isMember) {
      throw new ForbiddenException('У вас нет доступа к этой доске');
    }
  }
}
