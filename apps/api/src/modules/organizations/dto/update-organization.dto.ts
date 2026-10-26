import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsUrl,
  IsInt,
  Min,
  Max,
  MaxLength,
  Matches,
  Length,
} from 'class-validator';
import type {
  BusinessTranslationMeta,
  BusinessTranslations,
} from '../../translations/dto/business-translation.dto';
import {
  IsBusinessTranslationMeta,
  IsBusinessTranslations,
} from '../../translations/dto/business-translation.dto';

const ORGANIZATION_TRANSLATION_FIELDS = [
  'name',
  'companyName',
  'description',
] as const;

export class UpdateOrganizationDto {
  @ApiProperty({ example: 'Test OOO', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  organizationName?: string;

  @ApiProperty({
    example: '123456789',
    description:
      'ИНН организации (до 24 символов). Используется сотрудниками при входе.',
    required: false,
  })
  @IsString()
  @IsOptional()
  @Length(1, 24, { message: 'ИНН должен содержать от 1 до 24 символов' })
  inn?: string;

  @ApiProperty({
    example: 'Мы занимаемся организацией мероприятий...',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({
    required: false,
    description:
      'Plain-text translations for public organization name, companyName, and description. Locale keys: ru, uz, en.',
    example: {
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
  })
  @IsOptional()
  @IsBusinessTranslations(ORGANIZATION_TRANSLATION_FIELDS)
  translations?: BusinessTranslations;

  @ApiProperty({
    required: false,
    description:
      'Translation metadata for public organization name, companyName, and description.',
    example: {
      companyName: {
        ru: { status: 'manual' },
        en: { status: 'auto_translated', sourceLocale: 'ru' },
      },
    },
  })
  @IsOptional()
  @IsBusinessTranslationMeta(ORGANIZATION_TRANSLATION_FIELDS)
  translationMeta?: BusinessTranslationMeta;

  @ApiProperty({ example: '+79001234567', required: false })
  @IsString()
  @IsOptional()
  @Matches(/^\+?[1-9]\d{6,14}$/, {
    message: 'Телефон должен быть в международном формате',
  })
  phone?: string;

  @ApiProperty({
    example: 'г. Ташкент, ул. Мирабадская, д. 1',
    required: false,
    description: 'Адрес организации',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  address?: string;

  @ApiProperty({
    example: 'https://eventflow.uz',
    required: false,
    description: 'Веб-сайт организации',
  })
  @IsUrl({}, { message: 'website должен быть валидным URL' })
  @IsOptional()
  website?: string;

  @ApiProperty({
    example: 'Technology',
    required: false,
    description: 'Отрасль компании',
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  industry?: string;

  @ApiProperty({
    example: 50,
    required: false,
    description: 'Размер компании (число сотрудников)',
  })
  @IsInt()
  @IsOptional()
  @Min(1, { message: 'Размер компании должен быть не менее 1' })
  @Max(1_000_000, { message: 'Размер компании должен быть не более 1000000' })
  companySize?: number;

  @ApiProperty({ example: 'https://example.com/logo.png', required: false })
  @IsUrl({}, { message: 'logoUrl должен быть валидным URL' })
  @IsOptional()
  logoUrl?: string;
}
