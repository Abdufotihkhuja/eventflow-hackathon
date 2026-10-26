import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QuestionType, QuestionCategory } from '@prisma/client';

type LocaleStringMap = Partial<Record<'ru' | 'uz' | 'en', string>>;
type LocaleStringArrayMap = Partial<Record<'ru' | 'uz' | 'en', string[]>>;

/**
 * Entity для отображения вопроса БЕЗ правильных ответов (для участников)
 */
export class QuestionEntity {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'uuid' })
  eventId: string;

  @ApiProperty({ example: 'Ваш уровень владения JavaScript?' })
  question: string;

  @ApiProperty({ enum: QuestionType })
  type: QuestionType;

  @ApiProperty({ enum: QuestionCategory })
  category: QuestionCategory;

  @ApiProperty({ example: true })
  isRequired: boolean;

  @ApiProperty({ example: ['Начинающий', 'Средний', 'Продвинутый'] })
  options: string[];

  @ApiPropertyOptional({ example: 'Внимание! Информационный текст...' })
  informationalText?: string | null;

  @ApiProperty({ example: 0 })
  sortOrder: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional({
    description: 'Локализованные question/informationalText (плэйнтекст).',
  })
  translations?: Record<string, LocaleStringMap> | null;

  @ApiPropertyOptional({
    description: 'Локализованные массивы options (один массив на каждую локаль).',
  })
  optionsTranslations?: LocaleStringArrayMap | null;

  @ApiPropertyOptional({
    description:
      'Настройки поля загрузки файла (для type=FILE_UPLOAD): description, ' +
      'template, maxFileSizeMb, allowedFileTypes, allowMultipleFiles, maxFiles.',
  })
  fileUploadConfig?: unknown | null;

  // НЕ включаем: points, correctAnswer, correctOptions, translationMeta.
  // Эти поля видны только организаторам.

  constructor(partial: Partial<QuestionEntity>) {
    Object.assign(this, partial);
  }
}

/**
 * Entity для отображения вопроса С правильными ответами (для организаторов)
 */
export class QuestionAdminEntity extends QuestionEntity {
  @ApiProperty({ example: 10, description: 'Вес вопроса в баллах' })
  points: number;

  @ApiPropertyOptional({
    example: 'Правильный ответ',
    description: 'Правильный ответ (только для организаторов)',
  })
  correctAnswer?: string | null;

  @ApiProperty({
    example: ['Вариант 1', 'Вариант 3'],
    description: 'Правильные варианты (только для организаторов)',
  })
  correctOptions: string[];

  @ApiPropertyOptional({
    description: 'Метаданные локализации (только для организаторов).',
  })
  translationMeta?: Record<string, Record<string, unknown>> | null;

  constructor(partial: Partial<QuestionAdminEntity>) {
    super(partial);
    Object.assign(this, partial);
  }
}
