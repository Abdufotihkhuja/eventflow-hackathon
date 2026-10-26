import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { CreateQuestionDto, UpdateQuestionDto } from './dto';
import { QuestionEntity, QuestionAdminEntity } from './entities';
import {
  Prisma,
  UserType,
  RegistrationMode,
  QuestionCategory,
  QuestionType,
} from '@prisma/client';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ICurrentUser } from '../../../common/interfaces';
import { QuestionsRepository } from './questions.repository';
import { pickFallbackTranslation } from '../../translations/dto/business-translation.dto';
import { resolveLocalizedBusinessField } from '../../translations/localized-business-field.util';
import type { QuestionOptionsTranslations } from './dto/create-question.dto';
import {
  ALLOWED_REGISTRATION_FILE_EXTENSIONS,
  ALLOWED_REGISTRATION_FILE_TYPES,
  HARD_MAX_FILE_SIZE_MB,
  MB,
  resolveFileUploadConfig,
} from '../../registration-files/registration-files.constants';
import { FileStorageService } from '../../storage/application/file-storage.service';

const REGISTRATION_TEMPLATE_SUBDIR = 'registration-templates';

export interface UploadedTemplateResult {
  url: string;
  name: string;
  size: number;
  mimeType: string;
}

const ALLOWED_OPTIONS_LOCALES: ReadonlyArray<keyof QuestionOptionsTranslations> = [
  'ru',
  'uz',
  'en',
] as const;

/**
 * Sanitize per-locale options arrays: drop empty entries, ensure string[].
 * Returns plain object suitable for Prisma.InputJsonValue.
 */
function sanitizeOptionsTranslations(
  input: QuestionOptionsTranslations | undefined,
): Record<string, string[]> {
  if (!input || typeof input !== 'object') return {};
  const result: Record<string, string[]> = {};
  for (const locale of ALLOWED_OPTIONS_LOCALES) {
    const arr = input[locale];
    if (Array.isArray(arr)) {
      result[locale] = arr
        .map(v => (typeof v === 'string' ? v.trim() : ''))
        .filter(v => v.length > 0);
    }
  }
  return result;
}

/**
 * Pick scalar options[] from per-locale translations (first non-empty locale).
 * Used when DTO sends only optionsTranslations without scalar options.
 */
function pickScalarOptionsFallback(
  optionsTranslations: QuestionOptionsTranslations | undefined,
  fallback: string[] | undefined,
): string[] {
  if (fallback && fallback.length > 0) return fallback;
  if (!optionsTranslations) return [];
  for (const locale of ALLOWED_OPTIONS_LOCALES) {
    const arr = optionsTranslations[locale];
    if (Array.isArray(arr) && arr.length > 0) {
      const cleaned = arr
        .map(v => (typeof v === 'string' ? v.trim() : ''))
        .filter(v => v.length > 0);
      if (cleaned.length > 0) return cleaned;
    }
  }
  return [];
}

@Injectable()
export class QuestionsService {
  constructor(
    private readonly questionsRepository: QuestionsRepository,
    private readonly storage: FileStorageService,
  ) {}

  /**
   * Загружает файл-шаблон для вопроса FILE_UPLOAD (доступен участникам для
   * скачивания). Хранится в публичном /uploads/registration-templates.
   */
  async uploadTemplate(
    eventId: string,
    file: Express.Multer.File,
    user: ICurrentUser,
  ): Promise<UploadedTemplateResult> {
    await this.checkEventAccess(eventId, user);

    if (!file) {
      throw new BadRequestException('Файл не предоставлен');
    }
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ext || !ALLOWED_REGISTRATION_FILE_EXTENSIONS.includes(ext)) {
      throw new BadRequestException(
        `Недопустимый формат файла. Разрешены: ${ALLOWED_REGISTRATION_FILE_EXTENSIONS.join(', ')}`,
      );
    }
    const acceptableMimes = ALLOWED_REGISTRATION_FILE_TYPES[ext] ?? [];
    if (
      acceptableMimes.length > 0 &&
      file.mimetype &&
      !acceptableMimes.includes(file.mimetype) &&
      file.mimetype !== 'application/octet-stream'
    ) {
      throw new BadRequestException('Недопустимый формат файла');
    }
    if (file.size > HARD_MAX_FILE_SIZE_MB * MB) {
      throw new BadRequestException(
        `Файл слишком большой. Максимум ${HARD_MAX_FILE_SIZE_MB} МБ`,
      );
    }

    const filename = `${uuidv4()}${ext}`;
    const stored = await this.storage.save({
      buffer: file.buffer,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      directory: REGISTRATION_TEMPLATE_SUBDIR,
      fileName: filename,
    });

    return {
      url: stored.url,
      name: path.basename(file.originalname).slice(0, 255) || 'template',
      size: file.size,
      mimeType: file.mimetype,
    };
  }

  /**
   * Удаляет ранее загруженный файл-шаблон по его публичному URL.
   */
  async deleteTemplate(
    eventId: string,
    url: string,
    user: ICurrentUser,
  ): Promise<void> {
    await this.checkEventAccess(eventId, user);
    if (!url || !url.startsWith(`/uploads/${REGISTRATION_TEMPLATE_SUBDIR}/`)) {
      throw new BadRequestException('Недопустимый URL файла шаблона');
    }
    if (this.storage.exists(url)) {
      await this.storage.remove(url);
    }
  }

  /**
   * Создаёт вопрос регистрации
   */
  async create(
    eventId: string,
    dto: CreateQuestionDto,
    user: ICurrentUser,
  ): Promise<QuestionAdminEntity> {
    await this.checkEventAccess(eventId, user);

    // Получаем событие для проверки режима
    const event = await this.questionsRepository.findEventRegistrationMode(eventId);

    if (!event) {
      throw new NotFoundException('Мероприятие не найдено');
    }

    // Валидация для режима теста (FILE_UPLOAD не скорится — пропускаем)
    if (
      event.registrationMode === RegistrationMode.TEST &&
      dto.type !== QuestionType.FILE_UPLOAD
    ) {
      this.validateQuestionForTest(dto);
    }

    // Resolve scalars из translations (если фронт прислал только переводы).
    const scalarQuestion =
      pickFallbackTranslation(dto.translations, 'question', dto.question) || dto.question;
    const scalarInfo = pickFallbackTranslation(
      dto.translations,
      'informationalText',
      dto.informationalText,
    );
    const scalarCorrectAnswer = pickFallbackTranslation(
      dto.translations,
      'correctAnswer',
      dto.correctAnswer,
    );
    const sanitizedOptionsTranslations = sanitizeOptionsTranslations(
      dto.optionsTranslations,
    );
    const scalarOptions = pickScalarOptionsFallback(
      dto.optionsTranslations,
      dto.options,
    );

    // Валидация options для SELECT/CHECKBOX (на уже резолвленных скалярах)
    const dtoForValidation: CreateQuestionDto = {
      ...dto,
      options: scalarOptions,
    };
    this.validateOptions(dtoForValidation);

    // Получаем максимальный sortOrder
    const nextSortOrder = await this.questionsRepository.getNextSortOrder(eventId);

    const {
      translations,
      translationMeta,
      optionsTranslations,
      fileUploadConfig,
      ...rest
    } = dto;
    const isFileUpload = dto.type === QuestionType.FILE_UPLOAD;
    const question = await this.questionsRepository.create({
      ...rest,
      question: scalarQuestion,
      ...(scalarInfo !== undefined && { informationalText: scalarInfo || null }),
      ...(scalarCorrectAnswer !== undefined && {
        correctAnswer: scalarCorrectAnswer || null,
      }),
      options: scalarOptions,
      correctOptions: dto.correctOptions ?? [],
      sortOrder: dto.sortOrder ?? nextSortOrder,
      translations: (translations ?? {}) as Prisma.InputJsonValue,
      translationMeta: (translationMeta ?? {}) as Prisma.InputJsonValue,
      optionsTranslations: sanitizedOptionsTranslations as Prisma.InputJsonValue,
      ...(isFileUpload && {
        fileUploadConfig: resolveFileUploadConfig(
          fileUploadConfig ?? {},
        ) as unknown as Prisma.InputJsonValue,
      }),
      event: { connect: { id: eventId } },
    });

    // Пересчитываем максимальный балл события
    if (event.registrationMode === RegistrationMode.TEST) {
      await this.updateEventMaxScore(eventId);
    }

    return new QuestionAdminEntity(question as never);
  }

  /**
   * Получает вопросы события (для организаторов - с правильными ответами)
   */
  async findByEvent(eventId: string): Promise<QuestionAdminEntity[]> {
    const questions = await this.questionsRepository.findByEvent(eventId);

    return questions.map((q) => new QuestionAdminEntity(q as never));
  }

  /**
   * Получает вопросы события БЕЗ правильных ответов (для участников).
   * Если передан locale — резолвит question/informationalText/options
   * по нему через resolveLocalizedBusinessField; иначе scalar.
   */
  async findByEventPublic(
    eventId: string,
    locale?: string,
  ): Promise<QuestionEntity[]> {
    const questions = await this.questionsRepository.findByEvent(eventId);

    return questions.map((q) => {
      // BUG-FIX: previously this called `pickFallbackTranslation`, which
      // iterates `['ru', 'uz', 'en']` and returns the FIRST non-empty
      // value — ignoring the requested locale entirely. That made
      // /events/:id/questions/public?locale=en always return Russian
      // whenever a Russian translation existed, even when EN/UZ were
      // filled. `resolveLocalizedBusinessField` is the correct resolver
      // (requested locale FIRST, then ru → uz → en → scalar).
      const localizedQuestion = locale
        ? resolveLocalizedBusinessField(
            q.translations,
            'question',
            locale,
            q.question,
          ) || q.question
        : q.question;
      const localizedInfo = locale
        ? resolveLocalizedBusinessField(
            q.translations,
            'informationalText',
            locale,
            q.informationalText ?? null,
          ) || q.informationalText
        : q.informationalText;

      // Resolve options array per locale: locale → ru → uz → en → scalar.
      let localizedOptions = q.options;
      const optsObj =
        q.optionsTranslations &&
        typeof q.optionsTranslations === 'object' &&
        !Array.isArray(q.optionsTranslations)
          ? (q.optionsTranslations as Record<string, unknown>)
          : null;
      if (optsObj) {
        const tryLocale = (l: string): string[] | null => {
          const arr = optsObj[l];
          if (Array.isArray(arr) && arr.length > 0) {
            return arr.map((v) => (typeof v === 'string' ? v : ''));
          }
          return null;
        };
        if (locale && (locale === 'ru' || locale === 'uz' || locale === 'en')) {
          const direct = tryLocale(locale);
          if (direct) localizedOptions = direct;
        }
      }

      return new QuestionEntity({
        id: q.id,
        eventId: q.eventId,
        question: localizedQuestion,
        type: q.type,
        category: q.category,
        isRequired: q.isRequired,
        options: localizedOptions,
        informationalText: localizedInfo,
        sortOrder: q.sortOrder,
        createdAt: q.createdAt,
        updatedAt: q.updatedAt,
        translations: q.translations as Record<
          string,
          Partial<Record<'ru' | 'uz' | 'en', string>>
        > | null,
        optionsTranslations: q.optionsTranslations as Partial<
          Record<'ru' | 'uz' | 'en', string[]>
        > | null,
        fileUploadConfig:
          q.type === QuestionType.FILE_UPLOAD
            ? resolveFileUploadConfig(q.fileUploadConfig)
            : null,
      });
    });
  }

  /**
   * Получает вопрос по ID (для организаторов - с правильными ответами)
   */
  async findById(id: string): Promise<QuestionAdminEntity> {
    const question = await this.questionsRepository.findById(id);

    if (!question) {
      throw new NotFoundException('Вопрос не найден');
    }

    return new QuestionAdminEntity(question as never);
  }

  /**
   * Получает вопрос по ID БЕЗ правильных ответов (для участников)
   */
  async findByIdPublic(id: string): Promise<QuestionEntity> {
    const question = await this.questionsRepository.findById(id);

    if (!question) {
      throw new NotFoundException('Вопрос не найден');
    }

    return new QuestionEntity({
      id: question.id,
      eventId: question.eventId,
      question: question.question,
      type: question.type,
      category: question.category,
      isRequired: question.isRequired,
      options: question.options,
      informationalText: question.informationalText,
      sortOrder: question.sortOrder,
      createdAt: question.createdAt,
      updatedAt: question.updatedAt,
      translations: question.translations as Record<
        string,
        Partial<Record<'ru' | 'uz' | 'en', string>>
      > | null,
      optionsTranslations: question.optionsTranslations as Partial<
        Record<'ru' | 'uz' | 'en', string[]>
      > | null,
      fileUploadConfig:
        question.type === QuestionType.FILE_UPLOAD
          ? resolveFileUploadConfig(question.fileUploadConfig)
          : null,
    });
  }

  /**
   * Обновляет вопрос
   */
  async update(
    eventId: string,
    questionId: string,
    dto: UpdateQuestionDto,
    user: ICurrentUser,
  ): Promise<QuestionAdminEntity> {
    await this.checkEventAccess(eventId, user);

    const question = await this.findById(questionId);
    if (question.eventId !== eventId) {
      throw new NotFoundException('Вопрос не найден в этом событии');
    }

    // Получаем событие для проверки режима
    const event = await this.questionsRepository.findEventRegistrationMode(eventId);

    // Валидация для режима теста
    if (
      event?.registrationMode === RegistrationMode.TEST &&
      dto.points !== undefined
    ) {
      this.validateQuestionForTest({
        ...question,
        ...dto,
      } as CreateQuestionDto);
    }

    // Translations + options resolution.
    const {
      translations,
      translationMeta,
      optionsTranslations,
      fileUploadConfig,
      ...rest
    } = dto;
    const sanitizedOptionsTranslations =
      optionsTranslations !== undefined
        ? sanitizeOptionsTranslations(optionsTranslations)
        : undefined;

    // FILE_UPLOAD config: пересобираем при изменении типа/настроек,
    // очищаем при смене типа с FILE_UPLOAD на другой.
    const effectiveType = dto.type ?? question.type;
    let fileUploadConfigUpdate:
      | Prisma.InputJsonValue
      | typeof Prisma.DbNull
      | undefined;
    if (effectiveType === QuestionType.FILE_UPLOAD) {
      if (
        fileUploadConfig !== undefined ||
        question.type !== QuestionType.FILE_UPLOAD
      ) {
        fileUploadConfigUpdate = resolveFileUploadConfig(
          fileUploadConfig ?? {},
        ) as unknown as Prisma.InputJsonValue;
      }
    } else if (question.type === QuestionType.FILE_UPLOAD) {
      fileUploadConfigUpdate = Prisma.DbNull;
    }

    // Если options не пришли явно, но обновлены optionsTranslations — пересчитать scalar.
    let resolvedOptions = rest.options;
    if (resolvedOptions === undefined && optionsTranslations !== undefined) {
      resolvedOptions = pickScalarOptionsFallback(optionsTranslations, undefined);
    }

    // Resolve scalar question/info/correctAnswer fallbacks при наличии translations.
    if (translations !== undefined) {
      if (rest.question === undefined) {
        const v = pickFallbackTranslation(translations, 'question', question.question);
        if (v) rest.question = v;
      }
      if (rest.informationalText === undefined) {
        const v = pickFallbackTranslation(
          translations,
          'informationalText',
          question.informationalText ?? undefined,
        );
        if (v) rest.informationalText = v;
      }
      if (rest.correctAnswer === undefined) {
        const v = pickFallbackTranslation(
          translations,
          'correctAnswer',
          question.correctAnswer ?? undefined,
        );
        if (v) rest.correctAnswer = v;
      }
    }

    // Валидация options если они обновляются
    if (resolvedOptions !== undefined || rest.type !== undefined) {
      this.validateOptions({
        ...question,
        ...rest,
        options: resolvedOptions ?? question.options,
      } as CreateQuestionDto);
    }

    const updateData: Prisma.RegistrationQuestionUpdateInput = {
      ...rest,
      ...(resolvedOptions !== undefined && { options: resolvedOptions }),
      ...(translations !== undefined && {
        translations: translations as Prisma.InputJsonValue,
      }),
      ...(translationMeta !== undefined && {
        translationMeta: translationMeta as Prisma.InputJsonValue,
      }),
      ...(sanitizedOptionsTranslations !== undefined && {
        optionsTranslations: sanitizedOptionsTranslations as Prisma.InputJsonValue,
      }),
      ...(fileUploadConfigUpdate !== undefined && {
        fileUploadConfig: fileUploadConfigUpdate,
      }),
    };
    const updated = await this.questionsRepository.update(questionId, updateData);

    // Пересчитываем максимальный балл события если изменились points
    if (
      event?.registrationMode === RegistrationMode.TEST &&
      dto.points !== undefined
    ) {
      await this.updateEventMaxScore(eventId);
    }

    return new QuestionAdminEntity(updated as never);
  }

  /**
   * Удаляет вопрос
   */
  async delete(
    eventId: string,
    questionId: string,
    user: ICurrentUser,
  ): Promise<void> {
    await this.checkEventAccess(eventId, user);

    const question = await this.findById(questionId);
    if (question.eventId !== eventId) {
      throw new NotFoundException('Вопрос не найден в этом событии');
    }

    await this.questionsRepository.delete(questionId);

    // Пересчитываем максимальный балл события
    const event = await this.questionsRepository.findEventRegistrationMode(eventId);

    if (event?.registrationMode === RegistrationMode.TEST) {
      await this.updateEventMaxScore(eventId);
    }
  }

  /**
   * Изменяет порядок вопросов
   */
  async reorder(
    eventId: string,
    questionIds: string[],
    user: ICurrentUser,
  ): Promise<QuestionAdminEntity[]> {
    await this.checkEventAccess(eventId, user);

    await this.questionsRepository.reorder(questionIds);

    return this.findByEvent(eventId);
  }

  // === Private methods ===

  private async checkEventAccess(
    eventId: string,
    user: ICurrentUser,
  ): Promise<void> {
    const organizationId = this.getOrganizationId(user);

    const event = await this.questionsRepository.findEventAccess(eventId);

    if (!event) {
      throw new NotFoundException('Мероприятие не найдено');
    }

    if (event.organizationId !== organizationId) {
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
      'Только организаторы могут управлять вопросами',
    );
  }

  /**
   * Валидация вопроса для режима теста
   */
  private validateQuestionForTest(dto: CreateQuestionDto): void {
    // Проверяем наличие points для теста
    if (!dto.points || dto.points === 0) {
      throw new BadRequestException(
        'Для вопросов в режиме теста необходимо указать баллы (points > 0)',
      );
    }

    // Проверяем наличие правильных ответов для альтернативных вопросов
    if (dto.category === QuestionCategory.ALTERNATIVE) {
      if (!dto.correctOptions || dto.correctOptions.length === 0) {
        throw new BadRequestException(
          'Для альтернативных вопросов необходимо указать правильные варианты (correctOptions)',
        );
      }

      // Проверяем, что правильные варианты есть в списке options
      const optionsSet = new Set(dto.options || []);
      const invalidCorrect = dto.correctOptions.filter(
        (opt) => !optionsSet.has(opt),
      );
      if (invalidCorrect.length > 0) {
        throw new BadRequestException(
          `Правильные варианты должны быть из списка options: ${invalidCorrect.join(', ')}`,
        );
      }
    }

    // Проверяем наличие правильного ответа для закрытых вопросов
    if (dto.category === QuestionCategory.CLOSED) {
      if (!dto.correctAnswer || dto.correctAnswer.trim() === '') {
        throw new BadRequestException(
          'Для закрытых вопросов необходимо указать правильный ответ (correctAnswer)',
        );
      }
    }

    // Для открытых вопросов correctAnswer опционален (можно проверять вручную)
  }

  /**
   * Валидация options для SELECT/CHECKBOX
   */
  private validateOptions(dto: CreateQuestionDto | UpdateQuestionDto): void {
    const type = (dto as any).type;
    const category = (dto as any).category;
    const options = dto.options;

    // Для SELECT и CHECKBOX options обязательны
    if (
      type === 'SELECT' ||
      type === 'CHECKBOX' ||
      category === QuestionCategory.ALTERNATIVE ||
      category === QuestionCategory.CLOSED
    ) {
      if (!options || options.length === 0) {
        throw new BadRequestException(
          'Для типов SELECT и CHECKBOX необходимо указать минимум 1 вариант ответа (options)',
        );
      }

      // Проверяем, что варианты не пустые
      const validOptions = options.filter((o) => o && o.trim());
      if (validOptions.length === 0) {
        throw new BadRequestException(
          'Варианты ответов не могут быть пустыми строками',
        );
      }

      // Проверяем дубликаты
      const uniqueOptions = new Set(validOptions);
      if (uniqueOptions.size !== validOptions.length) {
        throw new BadRequestException('Варианты ответов не должны повторяться');
      }
    }
  }

  /**
   * Пересчитывает максимальный балл события
   */
  private async updateEventMaxScore(eventId: string): Promise<void> {
    const questions = await this.questionsRepository.findPointsByEvent(eventId);

    const maxScore = questions.reduce((sum, q) => sum + q.points, 0);

    await this.questionsRepository.updateEventMaxScore(eventId, maxScore);
  }
}
