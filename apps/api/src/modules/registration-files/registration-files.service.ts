import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  QuestionType,
  RegistrationFileStatus,
  RegistrationQuestion,
  UserType,
} from '@prisma/client';
import type { ReadStream } from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ICurrentUser } from '../../common/interfaces';
import {
  ALLOWED_REGISTRATION_FILE_TYPES,
  DRAFT_SWEEP_BATCH_SIZE,
  DRAFT_TTL_HOURS,
  MB,
  resolveFileUploadConfig,
  ResolvedFileUploadConfig,
} from './registration-files.constants';
import { RegistrationFilesRepository } from './registration-files.repository';
import { RegistrationFilesStorage } from './registration-files.storage';
import { RegistrationFileEntity } from './entities/registration-file.entity';

/** Result of validating pre-uploaded files for one file-upload question. */
export interface PreparedFileAnswer {
  questionId: string;
  /** Comma-joined upload ids, stored in QuestionAnswer.answer. */
  answer: string;
  uploadIds: string[];
}

@Injectable()
export class RegistrationFilesService {
  private readonly logger = new Logger(RegistrationFilesService.name);

  constructor(
    private readonly repo: RegistrationFilesRepository,
    private readonly storage: RegistrationFilesStorage,
  ) {}

  // ===================== Participant: pre-upload =====================

  async uploadParticipantFile(
    eventId: string,
    questionId: string,
    file: Express.Multer.File,
    user: ICurrentUser,
  ): Promise<RegistrationFileEntity> {
    if (user.type !== UserType.USER) {
      throw new ForbiddenException(
        'Только пользователи могут загружать файлы для регистрации',
      );
    }
    if (!file) {
      throw new BadRequestException('Файл не предоставлен');
    }

    const question = await this.repo.findQuestion(eventId, questionId);
    if (!question) {
      throw new NotFoundException('Вопрос не найден');
    }
    if (question.type !== QuestionType.FILE_UPLOAD) {
      throw new BadRequestException('Этот вопрос не поддерживает загрузку файлов');
    }

    const config = resolveFileUploadConfig(question.fileUploadConfig);
    this.validateFile(file, config);

    // Enforce per-question count limit across already-pending files.
    const pendingCount = await this.repo.countPendingForUser(
      eventId,
      questionId,
      user.sub,
    );
    if (pendingCount >= config.maxFiles) {
      throw new BadRequestException(
        config.maxFiles === 1
          ? 'Можно загрузить только один файл'
          : `Можно загрузить не более ${config.maxFiles} файлов`,
      );
    }

    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `${uuidv4()}${ext}`;
    const relativeDir = path.posix.join('evt', eventId, 'q', questionId);
    const storedPath = await this.storage.save(relativeDir, safeName, file.buffer);

    const created = await this.repo.create({
      event: { connect: { id: eventId } },
      question: { connect: { id: questionId } },
      organizationId: question.event.organizationId,
      uploadedById: user.sub,
      originalName: this.sanitizeOriginalName(file.originalname),
      storedPath,
      mimeType: file.mimetype,
      size: file.size,
      status: RegistrationFileStatus.PENDING,
    });

    return new RegistrationFileEntity(created);
  }

  async deleteParticipantFile(
    eventId: string,
    fileId: string,
    user: ICurrentUser,
  ): Promise<void> {
    if (user.type !== UserType.USER) {
      throw new ForbiddenException('Доступно только для пользователей');
    }
    const file = await this.repo.findById(fileId);
    if (!file || file.eventId !== eventId) {
      throw new NotFoundException('Файл не найден');
    }
    if (file.uploadedById !== user.sub) {
      throw new ForbiddenException('Нет доступа к этому файлу');
    }
    if (file.status !== RegistrationFileStatus.PENDING) {
      throw new BadRequestException(
        'Нельзя удалить файл уже отправленной регистрации',
      );
    }
    await this.storage.remove(file.storedPath);
    await this.repo.deleteById(fileId);
  }

  /**
   * Черновик незавершённой регистрации: файлы, загруженные участником, но ещё
   * не отправленные вместе с формой.
   *
   * Зачем: ответы на вопросы живут только в состоянии страницы и теряются при
   * уходе с неё, а файлы оставались на сервере. Вернувшись, участник видел
   * пустую форму, но upload упирался в лимит maxFiles, уже «занятый» невидимым
   * файлом — регистрация становилась невозможной. Теперь клиент читает
   * черновик и предлагает продолжить прошлую попытку или начать заново.
   */
  async listDraft(
    eventId: string,
    user: ICurrentUser,
  ): Promise<RegistrationFileEntity[]> {
    if (user.type !== UserType.USER) {
      throw new ForbiddenException('Доступно только для пользователей');
    }
    const pending = await this.repo.findPendingDraftForUser(eventId, user.sub);
    return pending.map((f) => new RegistrationFileEntity(f));
  }

  /**
   * Сбрасывает черновик: удаляет ВСЕ PENDING-файлы этого пользователя по
   * событию (storage + БД). Вызывается, когда участник выбрал «начать заново».
   *
   * Уже отправленные (ATTACHED) файлы не трогаем — они принадлежат созданной
   * регистрации, а не черновику.
   */
  async resetDraft(
    eventId: string,
    user: ICurrentUser,
  ): Promise<{ removed: number }> {
    if (user.type !== UserType.USER) {
      throw new ForbiddenException('Доступно только для пользователей');
    }

    const pending = await this.repo.findPendingDraftForUser(eventId, user.sub);
    if (pending.length === 0) {
      return { removed: 0 };
    }

    await Promise.all(pending.map((f) => this.safeRemove(f.storedPath)));
    await this.repo.deleteByIds(pending.map((f) => f.id));

    return { removed: pending.length };
  }

  /**
   * Фоновая уборка брошенных черновиков (repeatable-задание, раз в сутки):
   * удаляет неотправленные файлы старше DRAFT_TTL_HOURS.
   *
   * Сброс черновика по кнопке чистит только за вернувшимся участником — те,
   * кто не вернулся, иначе оставляли бы файлы в сторадже навсегда. Батч
   * ограничен, чтобы один прогон не тянул всю таблицу; остаток уедет
   * в следующий прогон.
   */
  async sweepStaleDrafts(): Promise<{ removed: number }> {
    const cutoff = new Date(Date.now() - DRAFT_TTL_HOURS * 60 * 60 * 1000);
    const stale = await this.repo.findStaleDrafts(cutoff, DRAFT_SWEEP_BATCH_SIZE);
    if (stale.length === 0) {
      return { removed: 0 };
    }

    await Promise.all(stale.map((f) => this.safeRemove(f.storedPath)));
    await this.repo.deleteByIds(stale.map((f) => f.id));

    this.logger.log(
      `Registration draft sweep: removed ${stale.length} abandoned file(s) older than ${DRAFT_TTL_HOURS}h`,
    );
    return { removed: stale.length };
  }

  // ===================== Submit integration =====================

  /**
   * Validate the participant's pre-uploaded files for every FILE_UPLOAD
   * question of the event and produce the answer rows to persist. Source of
   * truth is the DB (files owned by this user), never client-sent ids.
   */
  async prepareForSubmit(
    eventId: string,
    questions: RegistrationQuestion[],
    user: ICurrentUser,
  ): Promise<PreparedFileAnswer[]> {
    const fileQuestions = questions.filter(
      (q) => q.type === QuestionType.FILE_UPLOAD,
    );
    const prepared: PreparedFileAnswer[] = [];

    for (const question of fileQuestions) {
      const config = resolveFileUploadConfig(question.fileUploadConfig);
      const pending = await this.repo.findPendingForUser(
        eventId,
        question.id,
        user.sub,
      );

      if (pending.length === 0) {
        if (question.isRequired) {
          throw new BadRequestException(
            `Загрузите файл, чтобы продолжить: ${question.question}`,
          );
        }
        continue;
      }

      if (pending.length > config.maxFiles) {
        throw new BadRequestException(
          config.maxFiles === 1
            ? `Можно отправить только один файл: ${question.question}`
            : `Можно отправить не более ${config.maxFiles} файлов: ${question.question}`,
        );
      }

      const uploadIds = pending.map((p) => p.id);
      prepared.push({
        questionId: question.id,
        answer: uploadIds.join(','),
        uploadIds,
      });
    }

    return prepared;
  }

  /**
   * Attach prepared files to a freshly created/recreated registration. When
   * `resetPrevious` is set (re-registration), previously attached files are
   * deleted from storage + DB first.
   */
  async attachToRegistration(
    registrationId: string,
    prepared: PreparedFileAnswer[],
    options?: { resetPrevious?: boolean },
  ): Promise<void> {
    if (options?.resetPrevious) {
      const previous = await this.repo.findAttachedByRegistration(registrationId);
      await Promise.all(
        previous.map((f) => this.safeRemove(f.storedPath)),
      );
      await this.repo.deleteByRegistration(registrationId);
    }

    const ids = prepared.flatMap((p) => p.uploadIds);
    await this.repo.claim(ids, registrationId);
  }

  // ===================== Organizer: read / download =====================

  async listForRegistration(
    eventId: string,
    registrationId: string,
    user: ICurrentUser,
  ): Promise<RegistrationFileEntity[]> {
    await this.assertOrganizerEventAccess(eventId, user);
    const files = await this.repo.findAttachedForEventRegistration(
      eventId,
      registrationId,
    );
    return files.map((f) => new RegistrationFileEntity(f));
  }

  async getDownloadForOrganizer(
    eventId: string,
    fileId: string,
    user: ICurrentUser,
  ): Promise<{ stream: ReadStream; originalName: string; mimeType: string }> {
    const organizationId = await this.assertOrganizerEventAccess(eventId, user);

    const file = await this.repo.findById(fileId);
    if (
      !file ||
      file.eventId !== eventId ||
      file.organizationId !== organizationId ||
      file.status !== RegistrationFileStatus.ATTACHED
    ) {
      throw new NotFoundException('Файл не найден');
    }

    return {
      stream: this.storage.createReadStream(file.storedPath),
      originalName: file.originalName,
      mimeType: file.mimeType,
    };
  }

  // ===================== Helpers =====================

  private validateFile(
    file: Express.Multer.File,
    config: ResolvedFileUploadConfig,
  ): void {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ext || !config.allowedFileTypes.includes(ext)) {
      throw new BadRequestException(
        `Недопустимый формат файла. Разрешены: ${config.allowedFileTypes.join(', ')}`,
      );
    }

    // Defence-in-depth: client MIME must be plausible for the extension.
    const acceptableMimes = ALLOWED_REGISTRATION_FILE_TYPES[ext] ?? [];
    if (
      acceptableMimes.length > 0 &&
      file.mimetype &&
      !acceptableMimes.includes(file.mimetype) &&
      file.mimetype !== 'application/octet-stream'
    ) {
      throw new BadRequestException('Недопустимый формат файла');
    }

    const maxBytes = config.maxFileSizeMb * MB;
    if (file.size > maxBytes) {
      throw new BadRequestException(
        `Файл слишком большой. Максимум ${config.maxFileSizeMb} МБ`,
      );
    }
  }

  /** Never trust client filename as a path; keep only a display-safe basename. */
  private sanitizeOriginalName(name: string): string {
    const base = path.basename(name || 'file').replace(/[\r\n\t]/g, '');
    return base.slice(0, 255) || 'file';
  }

  private async safeRemove(storedPath: string): Promise<void> {
    try {
      await this.storage.remove(storedPath);
    } catch {
      // Best-effort cleanup; a missing file must not block re-registration.
    }
  }

  private async assertOrganizerEventAccess(
    eventId: string,
    user: ICurrentUser,
  ): Promise<string> {
    const organizationId = this.getOrganizationId(user);
    const event = await this.repo.findEventOrganization(eventId);
    if (!event) {
      throw new NotFoundException('Мероприятие не найдено');
    }
    if (event.organizationId !== organizationId) {
      throw new ForbiddenException('Нет доступа к этому мероприятию');
    }
    return organizationId;
  }

  private getOrganizationId(user: ICurrentUser): string {
    if (user.type === UserType.ORGANIZATION) {
      return user.sub;
    }
    if (user.type === UserType.MEMBER && user.organizationId) {
      return user.organizationId;
    }
    throw new ForbiddenException('Только организаторы могут управлять файлами');
  }
}
