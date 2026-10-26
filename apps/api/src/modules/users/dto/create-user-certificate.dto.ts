import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsInt,
  IsArray,
  IsUrl,
  Min,
  Max,
  MaxLength,
  Matches,
} from 'class-validator';
import { IsUtcIso8601 } from '../../../common/validators/utc-iso8601.validator';
import { Type } from 'class-transformer';

export class CreateUserCertificateDto {
  @ApiProperty({
    description: 'Название сертификата',
    example: 'Eventflow Pro Coordinator',
  })
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiProperty({
    description: 'Название провайдера/академии',
    example: 'EVENTFLOW ACADEMY',
  })
  @IsString()
  @MaxLength(200)
  provider: string;

  @ApiPropertyOptional({
    description: 'Описание программы',
    example:
      'Продвинутая программа по автоматизации потоков и аналитике Eventflow.',
  })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({
    description: 'Дата выдачи (YYYY-MM-DD или ISO 8601 с Z, например 2024-12-15T00:00:00Z)',
    example: '2024-12-15',
  })
  @IsUtcIso8601()
  issueDate: string;

  @ApiPropertyOptional({
    description: 'Дата истечения (YYYY-MM-DD или ISO 8601 с Z)',
    example: '2026-12-15',
  })
  @IsUtcIso8601()
  @IsOptional()
  expiryDate?: string;

  @ApiPropertyOptional({
    description: 'Часов обучения',
    example: 48,
    minimum: 0,
    maximum: 10000,
  })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(10000)
  trainingHours?: number;

  @ApiPropertyOptional({
    description: 'Уникальный идентификатор сертификата',
    example: 'EVT-PRO-4829',
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  credentialId?: string;

  @ApiPropertyOptional({
    description: 'Ссылка для проверки сертификата',
    example: 'https://verify.eventflow.com/cert/EVT-PRO-4829',
  })
  @IsUrl()
  @IsOptional()
  credentialUrl?: string;

  @ApiPropertyOptional({
    description: 'Ссылка на PDF файл сертификата',
    example: 'https://cdn.eventflow.com/certificates/cert-4829.pdf',
  })
  @IsUrl()
  @IsOptional()
  certificateUrl?: string;

  @ApiPropertyOptional({
    description: 'Навыки/теги',
    example: ['QR & RFID', 'Incident Response', 'Stakeholder Ops'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  skills?: string[];

  @ApiPropertyOptional({
    description: 'Цвет карточки (HEX)',
    example: '#F59E0B',
  })
  @IsString()
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'Цвет должен быть в формате HEX (#RRGGBB)',
  })
  color?: string;
}
