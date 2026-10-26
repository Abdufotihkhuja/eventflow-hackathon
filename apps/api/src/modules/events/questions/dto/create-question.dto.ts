import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
  IsInt,
  MaxLength,
  Min,
  Max,
  Validate,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { QuestionType, QuestionCategory } from '@prisma/client';
import { ValidateQuestionCategoryConstraint } from '../../../../common/decorators/validate-question-category.decorator';
import { FileUploadConfigDto } from '../../../registration-files/dto/file-upload-config.dto';
import type {
  BusinessTranslationMeta,
  BusinessTranslations,
} from '../../../translations/dto/business-translation.dto';
import {
  IsBusinessTranslationMeta,
  IsBusinessTranslations,
} from '../../../translations/dto/business-translation.dto';

export const QUESTION_TRANSLATION_FIELDS = [
  'question',
  'informationalText',
  'correctAnswer',
] as const;

/** Локализованные массивы options. Длина массива должна совпадать с scalar options[]. */
export type QuestionOptionsTranslations = {
  ru?: string[];
  uz?: string[];
  en?: string[];
};

export class CreateQuestionDto {
  @ApiProperty({ example: 'Ваша должность' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  question: string;

  @ApiProperty({
    enum: QuestionType,
    example: QuestionType.TEXT,
    description:
      'Тип поля: TEXT - текст, NUMBER - число, SELECT - выбор (один вариант), CHECKBOX - флажок (несколько вариантов), TEXTAREA - большой текст',
  })
  @IsEnum(QuestionType)
  type: QuestionType;

  @ApiProperty({
    enum: QuestionCategory,
    example: QuestionCategory.OPEN,
    description:
      'Категория вопроса: OPEN - открытый (развернутый ответ), CLOSED - закрытый (да/нет), ALTERNATIVE - альтернативный (выбор из вариантов), RHETORICAL - риторический (информационный текст)',
  })
  @IsEnum(QuestionCategory)
  @Validate(ValidateQuestionCategoryConstraint)
  category: QuestionCategory;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  isRequired?: boolean;

  @ApiPropertyOptional({
    example: ['Разработчик', 'Дизайнер', 'Менеджер'],
    description:
      'Варианты ответов (обязательно для типов SELECT и CHECKBOX, каждый вариант до 200 символов)',
  })
  @IsArray()
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  @IsOptional()
  options?: string[];

  @ApiPropertyOptional({
    example: 10,
    description:
      'Вес вопроса в баллах (для режима TEST, 0 = не учитывается в подсчете)',
  })
  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  points?: number;

  @ApiPropertyOptional({
    example: 'Правильный ответ',
    description:
      'Правильный ответ для открытых вопросов (TEXT/TEXTAREA/NUMBER в режиме TEST). Для TEXT/TEXTAREA можно указать ключевые слова через запятую',
  })
  @IsString()
  @MaxLength(2000)
  @IsOptional()
  correctAnswer?: string;

  @ApiPropertyOptional({
    example: ['Вариант 1', 'Вариант 3'],
    description:
      'Правильные варианты ответов (для SELECT/CHECKBOX в режиме TEST)',
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  correctOptions?: string[];

  @ApiPropertyOptional({
    example: 'Внимание! После регистрации вы получите письмо...',
    description:
      'Информационный текст (для риторических вопросов - отображается участнику без необходимости ответа)',
  })
  @IsString()
  @MaxLength(2000)
  @IsOptional()
  informationalText?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional({
    description:
      'Локализованные plain-text поля: question, informationalText, correctAnswer. ' +
      'Ключи локалей: ru, uz, en. Скаляры остаются как fallback.',
    example: {
      question: { ru: 'Ваша должность', uz: 'Lavozimingiz', en: 'Your position' },
      informationalText: { ru: 'Внимание...', en: 'Notice...' },
    },
    additionalProperties: true,
  })
  @IsOptional()
  @IsBusinessTranslations(QUESTION_TRANSLATION_FIELDS)
  translations?: BusinessTranslations;

  @ApiPropertyOptional({
    description: 'Метаданные локализации question/informationalText/correctAnswer.',
    additionalProperties: true,
  })
  @IsOptional()
  @IsBusinessTranslationMeta(QUESTION_TRANSLATION_FIELDS)
  translationMeta?: BusinessTranslationMeta;

  @ApiPropertyOptional({
    description:
      'Локализованные массивы option-меток. Длина массива в каждой локали ' +
      'должна совпадать с длиной scalar options[]. correctOptions всегда ' +
      'сравнивается против scalar options[] на answer evaluation.',
    example: {
      ru: ['Разработчик', 'Дизайнер'],
      uz: ['Dasturchi', 'Dizayner'],
      en: ['Developer', 'Designer'],
    },
  })
  @IsOptional()
  @IsObject()
  optionsTranslations?: QuestionOptionsTranslations;

  @ApiPropertyOptional({
    type: FileUploadConfigDto,
    description:
      'Настройки для вопросов типа FILE_UPLOAD (описание, шаблон, лимит размера/количества, разрешённые форматы).',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => FileUploadConfigDto)
  fileUploadConfig?: FileUploadConfigDto;
}
