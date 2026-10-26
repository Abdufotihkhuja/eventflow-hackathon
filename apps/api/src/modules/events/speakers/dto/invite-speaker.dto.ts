import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';
import type {
  BusinessTranslationMeta,
  BusinessTranslations,
} from '../../../translations/dto/business-translation.dto';
import {
  IsBusinessTranslationMeta,
  IsBusinessTranslations,
} from '../../../translations/dto/business-translation.dto';
import { SPEAKER_TRANSLATION_FIELDS } from './create-speaker.dto';

export class InviteSpeakerDto {
  @ApiProperty({
    example: 'speaker@example.com',
    description: 'Email спикера для отправки приглашения',
  })
  @IsEmail({}, { message: 'Некорректный email' })
  @IsNotEmpty({ message: 'Email обязателен' })
  email: string;

  @ApiProperty({
    example: 'Иван',
    description: 'Имя спикера',
  })
  @IsString()
  @IsNotEmpty({ message: 'Имя спикера обязательно' })
  @MaxLength(200, { message: 'Имя не должно превышать 200 символов' })
  firstName: string;

  @ApiProperty({
    example: 'Иванов',
    description: 'Фамилия спикера',
  })
  @IsString()
  @IsNotEmpty({ message: 'Фамилия спикера обязательна' })
  @MaxLength(200, { message: 'Фамилия не должна превышать 200 символов' })
  lastName: string;

  @ApiProperty({
    example: 'Senior Developer',
    description: 'Должность спикера',
  })
  @IsString()
  @IsNotEmpty({ message: 'Должность обязательна' })
  @MaxLength(200, { message: 'Должность не должна превышать 200 символов' })
  position: string;

  @ApiPropertyOptional({
    example: 'Google',
    description: 'Компания спикера',
  })
  @IsString()
  @IsOptional()
  @MaxLength(200, {
    message: 'Название компании не должно превышать 200 символов',
  })
  company?: string;

  @ApiPropertyOptional({
    example: 'Краткая информация о спикере...',
    description: 'Биография спикера',
  })
  @IsString()
  @IsOptional()
  @MaxLength(2000, { message: 'Биография не должна превышать 2000 символов' })
  bio?: string;

  @ApiPropertyOptional({
    example: 'https://linkedin.com/in/username',
    description: 'LinkedIn профиль спикера',
  })
  @IsUrl({}, { message: 'Некорректный URL для LinkedIn' })
  @IsOptional()
  linkedinUrl?: string;

  @ApiPropertyOptional({
    example: 'https://instagram.com/username',
    description: 'Instagram профиль спикера',
  })
  @IsUrl({}, { message: 'Некорректный URL для Instagram' })
  @IsOptional()
  instagramUrl?: string;

  @ApiPropertyOptional({
    example: 'https://facebook.com/username',
    description: 'Facebook профиль спикера',
  })
  @IsUrl({}, { message: 'Некорректный URL для Facebook' })
  @IsOptional()
  facebookUrl?: string;

  @ApiPropertyOptional({
    example: 'https://example.com',
    description: 'Личный сайт спикера',
  })
  @IsUrl({}, { message: 'Некорректный URL для сайта' })
  @IsOptional()
  websiteUrl?: string;

  @ApiPropertyOptional({
    description: 'Локализация position/company/bio (ru/uz/en).',
    additionalProperties: true,
  })
  @IsOptional()
  @IsBusinessTranslations(SPEAKER_TRANSLATION_FIELDS)
  translations?: BusinessTranslations;

  @ApiPropertyOptional({
    description: 'Метаданные локализации position/company/bio.',
    additionalProperties: true,
  })
  @IsOptional()
  @IsBusinessTranslationMeta(SPEAKER_TRANSLATION_FIELDS)
  translationMeta?: BusinessTranslationMeta;
}
