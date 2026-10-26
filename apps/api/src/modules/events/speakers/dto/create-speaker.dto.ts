import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUrl,
  IsInt,
  MaxLength,
  Min,
} from 'class-validator';
import type {
  BusinessTranslationMeta,
  BusinessTranslations,
} from '../../../translations/dto/business-translation.dto';
import {
  IsBusinessTranslationMeta,
  IsBusinessTranslations,
} from '../../../translations/dto/business-translation.dto';

export const SPEAKER_TRANSLATION_FIELDS = ['position', 'company', 'bio'] as const;

export class CreateSpeakerDto {
  @ApiProperty({ example: 'Иван' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  firstName: string;

  @ApiProperty({ example: 'Иванов' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  lastName: string;

  @ApiProperty({ example: 'Senior Developer' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  position: string;

  @ApiPropertyOptional({ example: 'Google' })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  company?: string;

  @ApiPropertyOptional({ example: 'Краткая информация о спикере...' })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  bio?: string;

  @ApiPropertyOptional({ example: '/uploads/avatar.jpg' })
  @IsString()
  @IsOptional()
  avatarUrl?: string;

  @ApiPropertyOptional({ example: 'https://linkedin.com/in/username' })
  @IsUrl()
  @IsOptional()
  linkedinUrl?: string;

  @ApiPropertyOptional({ example: 'https://instagram.com/username' })
  @IsUrl()
  @IsOptional()
  instagramUrl?: string;

  @ApiPropertyOptional({ example: 'https://facebook.com/username' })
  @IsUrl()
  @IsOptional()
  facebookUrl?: string;

  @ApiPropertyOptional({ example: 'https://example.com' })
  @IsUrl()
  @IsOptional()
  websiteUrl?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional({
    description:
      'Plain-text translations for speaker position, company, and bio. Locale keys: ru, uz, en. ' +
      'Scalar position/company/bio fields stay populated as legacy fallback.',
    example: {
      position: { ru: 'Руководитель', uz: 'Rahbar', en: 'Head' },
      company: { ru: 'Acme', uz: 'Acme', en: 'Acme' },
      bio: {
        ru: 'Опытный спикер.',
        uz: 'Tajribali spiker.',
        en: 'Experienced speaker.',
      },
    },
    additionalProperties: true,
  })
  @IsOptional()
  @IsBusinessTranslations(SPEAKER_TRANSLATION_FIELDS)
  translations?: BusinessTranslations;

  @ApiPropertyOptional({
    description: 'Translation metadata keyed by field and locale.',
    example: {
      position: {
        ru: { status: 'manual' },
        uz: { status: 'auto_translated', sourceLocale: 'ru' },
      },
    },
    additionalProperties: true,
  })
  @IsOptional()
  @IsBusinessTranslationMeta(SPEAKER_TRANSLATION_FIELDS)
  translationMeta?: BusinessTranslationMeta;
}
