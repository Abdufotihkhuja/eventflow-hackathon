import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ParticipantRole } from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export enum ArtifactBulkPreviewType {
  CERTIFICATE = 'CERTIFICATE',
  BADGE = 'BADGE',
}

export enum ArtifactBulkPreviewScope {
  SELECTED = 'SELECTED',
  ROLE = 'ROLE',
  ALL_ELIGIBLE = 'ALL_ELIGIBLE',
  ALL_PARTICIPANTS = 'ALL_PARTICIPANTS',
  ALL_SPEAKERS = 'ALL_SPEAKERS',
}

export enum ArtifactBulkPreviewStatus {
  READY = 'READY',
  STALE = 'STALE',
  FAILED = 'FAILED',
  PROCESSING = 'PROCESSING',
  NOT_GENERATED = 'NOT_GENERATED',
  MISSING_TEMPLATE = 'MISSING_TEMPLATE',
  NOT_ELIGIBLE = 'NOT_ELIGIBLE',
  GENERATABLE = 'GENERATABLE',
  BLOCKED = 'BLOCKED',
}

export enum ArtifactBulkPreviewWarningCode {
  LARGE_BULK_ACTION = 'LARGE_BULK_ACTION',
}

export enum ArtifactBulkPreviewExcludedReason {
  ROLE_MISMATCH = 'ROLE_MISMATCH',
  /** Registration is not APPROVED (required for certificates). */
  NOT_APPROVED = 'NOT_APPROVED',
  /** No attendance record for the event. */
  NOT_ATTENDED = 'NOT_ATTENDED',
}

export class ArtifactBulkPreviewDto {
  @ApiProperty({ enum: ArtifactBulkPreviewType })
  @IsEnum(ArtifactBulkPreviewType)
  artifactType!: ArtifactBulkPreviewType;

  @ApiProperty({ enum: ArtifactBulkPreviewScope })
  @IsEnum(ArtifactBulkPreviewScope)
  scope!: ArtifactBulkPreviewScope;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  recipientIds?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  registrationIds?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  recipientRoleIds?: string[];

  @ApiPropertyOptional()
  @IsUUID('4')
  @IsOptional()
  recipientRoleId?: string;

  @ApiPropertyOptional()
  @IsUUID('4')
  @IsOptional()
  roleId?: string;

  @ApiPropertyOptional({ example: 'speaker' })
  @IsString()
  @IsOptional()
  roleCode?: string;

  @ApiPropertyOptional({ enum: ParticipantRole })
  @IsEnum(ParticipantRole)
  @IsOptional()
  recipientRole?: ParticipantRole;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  staleOnly?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  forceRegenerate?: boolean;

  @ApiPropertyOptional({
    default: true,
    description:
      'Certificate previews only: require registration-backed recipients to have attendance. Matches certificate generation default.',
  })
  @IsBoolean()
  @IsOptional()
  onlyAttended?: boolean;

  @ApiPropertyOptional({
    default: true,
    description:
      'Badge previews only: require registration-backed recipients to be approved. Matches badge download default.',
  })
  @IsBoolean()
  @IsOptional()
  onlyApproved?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  includeReady?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  includeStale?: boolean;
}

export class ArtifactBulkPreviewStatusBreakdownDto {
  @ApiProperty()
  ready!: number;

  @ApiProperty()
  stale!: number;

  @ApiProperty()
  failed!: number;

  @ApiProperty()
  processing!: number;

  @ApiProperty()
  notGenerated!: number;

  @ApiProperty()
  missingTemplate!: number;

  @ApiProperty()
  notEligible!: number;

  @ApiProperty()
  generatable!: number;

  @ApiProperty()
  blocked!: number;
}

export class ArtifactBulkPreviewRoleDto {
  @ApiProperty()
  roleId!: string;

  @ApiProperty()
  roleCode!: string;

  @ApiProperty()
  roleDisplayName!: string;

  @ApiProperty()
  recipientCount!: number;

  @ApiProperty()
  artifactCount!: number;

  @ApiProperty()
  willGenerateCount!: number;

  @ApiProperty()
  willRegenerateCount!: number;

  @ApiProperty()
  willSkipCount!: number;

  @ApiProperty()
  missingTemplateCount!: number;

  @ApiProperty()
  blockedCount!: number;

  @ApiProperty({ type: ArtifactBulkPreviewStatusBreakdownDto })
  statusBreakdown!: ArtifactBulkPreviewStatusBreakdownDto;
}

export class ArtifactBulkPreviewMissingTemplateDto {
  @ApiProperty()
  roleId!: string;

  @ApiProperty()
  roleCode!: string;

  @ApiProperty()
  roleDisplayName!: string;

  @ApiProperty({ enum: ArtifactBulkPreviewType })
  artifactType!: ArtifactBulkPreviewType;
}

export class ArtifactBulkPreviewWarningDto {
  @ApiProperty({ enum: ArtifactBulkPreviewWarningCode })
  code!: ArtifactBulkPreviewWarningCode;

  @ApiProperty()
  message!: string;
}

export class ArtifactBulkPreviewExcludedRecipientDto {
  @ApiProperty()
  recipientId!: string;

  @ApiProperty({ enum: ArtifactBulkPreviewExcludedReason })
  reason!: ArtifactBulkPreviewExcludedReason;
}

export class ArtifactBulkPreviewResponseDto {
  @ApiProperty({ enum: ArtifactBulkPreviewType })
  artifactType!: ArtifactBulkPreviewType;

  @ApiProperty({ enum: ArtifactBulkPreviewScope })
  scope!: ArtifactBulkPreviewScope;

  @ApiProperty()
  recipientCount!: number;

  @ApiProperty()
  artifactCount!: number;

  @ApiProperty()
  willGenerateCount!: number;

  @ApiProperty()
  willRegenerateCount!: number;

  @ApiProperty()
  willSkipCount!: number;

  @ApiProperty()
  missingTemplateCount!: number;

  @ApiProperty()
  blockedCount!: number;

  @ApiProperty()
  staleCount!: number;

  @ApiProperty()
  readyCount!: number;

  @ApiProperty()
  failedCount!: number;

  @ApiProperty()
  notGeneratedCount!: number;

  @ApiProperty()
  processingCount!: number;

  @ApiProperty({ type: [ArtifactBulkPreviewRoleDto] })
  roles!: ArtifactBulkPreviewRoleDto[];

  @ApiProperty({ type: [ArtifactBulkPreviewMissingTemplateDto] })
  missingTemplates!: ArtifactBulkPreviewMissingTemplateDto[];

  @ApiProperty({ type: [ArtifactBulkPreviewWarningDto] })
  warnings!: ArtifactBulkPreviewWarningDto[];

  @ApiProperty({ type: [ArtifactBulkPreviewExcludedRecipientDto] })
  excludedRecipients!: ArtifactBulkPreviewExcludedRecipientDto[];
}
