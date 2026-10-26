import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { EventRecipientStatus } from '@prisma/client';
import type { BusinessTranslations } from '../../../translations/dto/business-translation.dto';
import { IsBusinessTranslations } from '../../../translations/dto/business-translation.dto';

export const RECIPIENT_ROLE_CODE_MAX_LENGTH = 64;
export const RECIPIENT_ROLE_DISPLAY_NAME_MAX_LENGTH = 120;
export const RECIPIENT_ROLE_TRANSLATION_FIELDS = ['displayName'] as const;

export enum RecipientRoleDeleteRecommendation {
  DEACTIVATE = 'DEACTIVATE',
  SAFE_TO_DELETE = 'SAFE_TO_DELETE',
  BLOCKED = 'BLOCKED',
}

export class CreateRecipientRoleDto {
  @ApiProperty({
    example: 'press',
    description:
      'Stable event-scoped lowercase slug. Once created, role codes are immutable.',
    maxLength: RECIPIENT_ROLE_CODE_MAX_LENGTH,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(RECIPIENT_ROLE_CODE_MAX_LENGTH)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message:
      'Role code must be a lowercase slug with letters, numbers, and single hyphen-separated words',
  })
  code!: string;

  @ApiProperty({
    example: 'Press',
    maxLength: RECIPIENT_ROLE_DISPLAY_NAME_MAX_LENGTH,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(RECIPIENT_ROLE_DISPLAY_NAME_MAX_LENGTH)
  displayName!: string;

  @ApiPropertyOptional({ example: 80, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100000)
  sortOrder?: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isArtifactEligible?: boolean;

  @ApiPropertyOptional({
    description:
      'Локализация displayName: { displayName: { ru?, uz?, en? } }. ' +
      'Скаляр displayName выше остаётся как fallback.',
    example: { displayName: { ru: 'Пресса', uz: 'Matbuot', en: 'Press' } },
  })
  @IsOptional()
  @IsBusinessTranslations(RECIPIENT_ROLE_TRANSLATION_FIELDS)
  translations?: BusinessTranslations;
}

export class UpdateRecipientRoleDto {
  @ApiPropertyOptional({
    example: 'Press',
    maxLength: RECIPIENT_ROLE_DISPLAY_NAME_MAX_LENGTH,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(RECIPIENT_ROLE_DISPLAY_NAME_MAX_LENGTH)
  displayName?: string;

  @ApiPropertyOptional({ example: 80 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100000)
  sortOrder?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isArtifactEligible?: boolean;

  @ApiPropertyOptional({
    description: 'Локализация displayName.',
    example: { displayName: { ru: 'Пресса', uz: 'Matbuot', en: 'Press' } },
  })
  @IsOptional()
  @IsBusinessTranslations(RECIPIENT_ROLE_TRANSLATION_FIELDS)
  translations?: BusinessTranslations;
}

export class RecipientRoleDeletePreviewCountsDto {
  @ApiProperty()
  activeAssignments!: number;

  @ApiProperty()
  inactiveAssignments!: number;

  @ApiProperty()
  certificateTemplates!: number;

  @ApiProperty()
  badgeTemplates!: number;

  @ApiProperty()
  certificates!: number;
}

export class RecipientRoleDeletePreviewDto {
  @ApiProperty()
  roleId!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  displayName!: string;

  @ApiProperty()
  isBuiltIn!: boolean;

  @ApiProperty({ type: RecipientRoleDeletePreviewCountsDto })
  counts!: RecipientRoleDeletePreviewCountsDto;

  @ApiProperty({ enum: RecipientRoleDeleteRecommendation })
  recommendedAction!: RecipientRoleDeleteRecommendation;

  @ApiProperty({ type: [String] })
  blockingReasons!: string[];
}

export class CreateManualArtifactRecipientDto {
  @ApiProperty({ example: 'Ada Lovelace', maxLength: 160 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  displayName!: string;

  @ApiPropertyOptional({ example: 'Ada', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Lovelace', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional({ example: 'ada@example.com' })
  @IsOptional()
  @IsEmail()
  @MaxLength(320)
  email?: string;

  @ApiPropertyOptional({
    description: 'Existing user id to safely attach the manual recipient to.',
  })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ type: [String], description: 'Initial role ids.' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  roleIds?: string[];

  @ApiPropertyOptional({
    type: [String],
    description: 'Initial role codes, for example vip or staff.',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    each: true,
    message:
      'Role code must be a lowercase slug with letters, numbers, and single hyphen-separated words',
  })
  roleCodes?: string[];
}

export class UpdateManualArtifactRecipientDto {
  @ApiPropertyOptional({ example: 'Ada Lovelace', maxLength: 160 })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  displayName?: string;

  @ApiPropertyOptional({ example: 'Ada', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Lovelace', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional({ example: 'ada@example.com', nullable: true })
  @IsOptional()
  @IsEmail()
  @MaxLength(320)
  email?: string | null;

  @ApiPropertyOptional({ enum: EventRecipientStatus })
  @IsOptional()
  @IsEnum(EventRecipientStatus)
  status?: EventRecipientStatus;
}

export class AssignArtifactRecipientRoleDto {
  @ApiPropertyOptional({ description: 'Recipient role id.' })
  @IsOptional()
  @IsUUID()
  roleId?: string;

  @ApiPropertyOptional({
    description: 'Recipient role code, for example vip or sponsor.',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message:
      'Role code must be a lowercase slug with letters, numbers, and single hyphen-separated words',
  })
  roleCode?: string;
}
