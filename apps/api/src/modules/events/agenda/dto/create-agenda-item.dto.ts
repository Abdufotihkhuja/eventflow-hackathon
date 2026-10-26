import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  IsArray,
  IsUUID,
  MaxLength,
  Min,
  Matches,
  IsISO8601,
} from 'class-validator';
import { AgendaItemType } from '@prisma/client';
import type {
  BusinessTranslationMeta,
  BusinessTranslations,
} from '../../../translations/dto/business-translation.dto';
import {
  IsBusinessTranslationMeta,
  IsBusinessTranslations,
} from '../../../translations/dto/business-translation.dto';

export const AGENDA_TRANSLATION_FIELDS = ['title', 'description', 'location'] as const;

export class CreateAgendaItemDto {
  @ApiProperty({ example: 'Открытие конференции' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  title: string;

  @ApiPropertyOptional({ example: 'Приветственное слово организаторов' })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ enum: AgendaItemType, example: AgendaItemType.KEYNOTE })
  @IsEnum(AgendaItemType)
  type: AgendaItemType;

  @ApiProperty({
    example: '2026-06-15',
    description:
      'Дата проведения в формате YYYY-MM-DD (должна быть в пределах дат мероприятия)',
  })
  @IsISO8601({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Дата должна быть в формате YYYY-MM-DD',
  })
  date: string;

  @ApiProperty({ example: '10:00', description: 'Время в формате HH:MM' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'Время должно быть в формате HH:MM',
  })
  startTime: string;

  @ApiProperty({ example: 60, description: 'Длительность в минутах' })
  @IsInt()
  @Min(1)
  duration: number;

  @ApiPropertyOptional({
    example: 'Зал А, Комната 101',
    description:
      'Legacy: текстовое название зала. Используется как fallback для писем/PDF/поиска. Если задан roomId, синхронизируется с room.name автоматически.',
  })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  location?: string;

  @ApiPropertyOptional({
    description:
      'FK на EventRoom (per-event зал/сцена). При наличии roomId валидация конфликтов работает по FK, а location синхронизируется с room.name.',
  })
  @IsOptional()
  @IsUUID()
  roomId?: string;

  @ApiPropertyOptional({
    example: [
      'https://example.com/presentation.pdf',
      'https://example.com/materials.zip',
    ],
    description: 'Ссылки на материалы (презентации, документы)',
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  materials?: string[];

  @ApiPropertyOptional({
    example: ['uuid1', 'uuid2'],
    description: 'ID спикеров',
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  speakerIds?: string[];

  @ApiPropertyOptional({ example: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional({
    description:
      'Plain-text translations for agenda title, description and location. Locale keys: ru, uz, en. ' +
      'Scalar fields stay populated as legacy fallback.',
    example: {
      title: { ru: 'Открытие', uz: 'Ochilish', en: 'Opening' },
      description: { ru: 'Приветственное слово', en: 'Welcome speech' },
      location: { ru: 'Зал А', en: 'Hall A' },
    },
    additionalProperties: true,
  })
  @IsOptional()
  @IsBusinessTranslations(AGENDA_TRANSLATION_FIELDS)
  translations?: BusinessTranslations;

  @ApiPropertyOptional({
    description: 'Translation metadata keyed by field and locale.',
    additionalProperties: true,
  })
  @IsOptional()
  @IsBusinessTranslationMeta(AGENDA_TRANSLATION_FIELDS)
  translationMeta?: BusinessTranslationMeta;
}
