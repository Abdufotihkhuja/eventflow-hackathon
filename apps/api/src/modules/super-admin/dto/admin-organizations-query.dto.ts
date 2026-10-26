import { ApiPropertyOptional } from '@nestjs/swagger';
import { OrganizationVerificationStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class AdminOrganizationsQueryDto {
  @ApiPropertyOptional({ description: 'Номер страницы', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value, 10))
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Количество на странице', default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => parseInt(value, 10))
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Поиск по названию, email или ИНН' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Статус верификации',
    enum: OrganizationVerificationStatus,
  })
  @IsOptional()
  @IsEnum(OrganizationVerificationStatus)
  verificationStatus?: OrganizationVerificationStatus;

  @ApiPropertyOptional({
    description:
      'Фильтр по состоянию: active (активные) | archived (архивированные) | all (все)',
    enum: ['active', 'archived', 'all'],
    default: 'active',
  })
  @IsOptional()
  @IsIn(['active', 'archived', 'all'])
  status?: 'active' | 'archived' | 'all';
}
