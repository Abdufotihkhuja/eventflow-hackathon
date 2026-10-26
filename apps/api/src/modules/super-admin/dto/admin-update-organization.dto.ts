import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';
import type {
  BusinessTranslationMeta,
  BusinessTranslations,
} from '../../translations/dto/business-translation.dto';
import {
  IsBusinessTranslationMeta,
  IsBusinessTranslations,
} from '../../translations/dto/business-translation.dto';

const ADMIN_ORGANIZATION_TRANSLATION_FIELDS = [
  'name',
  'companyName',
  'description',
] as const;

/**
 * DTO для редактирования организации супер-админом.
 * Не содержит verificationStatus - статус верификации не меняется через этот DTO.
 */
export class AdminUpdateOrganizationDto {
  @ApiPropertyOptional({ example: 'org@example.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    example: 'Иван Петров',
    description: 'Имя представителя',
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: 'ООО "Ивент Компания"' })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  companyName?: string;

  @ApiPropertyOptional({
    example: '1234567890',
    description: 'ИНН организации (до 20 символов)',
  })
  @IsString()
  @IsOptional()
  @Length(1, 20, { message: 'ИНН должен содержать от 1 до 20 символов' })
  inn?: string;

  @ApiPropertyOptional({ example: 'Мы занимаемся организацией мероприятий...' })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({
    description:
      'Plain-text translations for public organization name, companyName, and description. Locale keys: ru, uz, en.',
    example: {
      name: { ru: 'EventFlow', uz: 'EventFlow', en: 'EventFlow' },
      companyName: {
        ru: 'ООО EventFlow',
        uz: 'EventFlow MChJ',
        en: 'EventFlow LLC',
      },
      description: {
        ru: 'Организация мероприятий',
        uz: 'Tadbirlar tashkilotchisi',
        en: 'Event organizer',
      },
    },
    additionalProperties: true,
  })
  @IsOptional()
  @IsBusinessTranslations(ADMIN_ORGANIZATION_TRANSLATION_FIELDS)
  translations?: BusinessTranslations;

  @ApiPropertyOptional({
    description:
      'Translation metadata for public organization name, companyName, and description.',
    example: {
      companyName: {
        ru: { status: 'manual' },
        en: { status: 'auto_translated', sourceLocale: 'ru' },
      },
    },
    additionalProperties: true,
  })
  @IsOptional()
  @IsBusinessTranslationMeta(ADMIN_ORGANIZATION_TRANSLATION_FIELDS)
  translationMeta?: BusinessTranslationMeta;

  @ApiPropertyOptional({ example: '+998901234567' })
  @IsString()
  @IsOptional()
  @Matches(/^\+?[1-9]\d{6,14}$/, {
    message: 'Телефон должен быть в международном формате',
  })
  phone?: string;

  @ApiPropertyOptional({ example: 'https://example.com/logo.png' })
  @IsUrl({}, { message: 'logoUrl должен быть валидным URL' })
  @IsOptional()
  logoUrl?: string;

  @ApiPropertyOptional({ example: true, description: 'Email подтверждён' })
  @IsBoolean()
  @IsOptional()
  isEmailVerified?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Включена ли для организации функция арендуемых площадок',
  })
  @IsBoolean()
  @IsOptional()
  placesFeatureEnabled?: boolean;
}
