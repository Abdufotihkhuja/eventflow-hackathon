import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import {
  BuiltInEventRecipientRoleKey,
  EventRecipientRoleKind,
  ParticipantRole,
} from '@prisma/client';

export enum ArtifactTemplateSummaryArtifactType {
  CERTIFICATE = 'CERTIFICATE',
  BADGE = 'BADGE',
}

export enum ArtifactTemplateStatus {
  READY = 'READY',
  MISSING = 'MISSING',
  INACTIVE_ROLE = 'INACTIVE_ROLE',
  NOT_ARTIFACT_ELIGIBLE = 'NOT_ARTIFACT_ELIGIBLE',
  DUPLICATE_DEFAULT = 'DUPLICATE_DEFAULT',
}

export class ArtifactTemplateSummaryQueryDto {
  @ApiPropertyOptional({ enum: ArtifactTemplateSummaryArtifactType })
  @IsOptional()
  @IsEnum(ArtifactTemplateSummaryArtifactType)
  artifactType?: ArtifactTemplateSummaryArtifactType;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  includeInactiveTemplates?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  includeInactiveRoles?: boolean;
}

export class ArtifactTemplateSummaryTemplateDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  isDefault!: boolean;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({ type: String, nullable: true })
  recipientRoleId!: string | null;

  @ApiProperty()
  roleCode!: string;

  @ApiProperty()
  roleDisplayName!: string;

  @ApiProperty({ enum: ParticipantRole, nullable: true })
  recipientRole!: ParticipantRole | null;

  @ApiProperty()
  sizePreset!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class ArtifactTemplateTypeSummaryDto {
  @ApiProperty({ type: String, nullable: true })
  defaultTemplateId!: string | null;

  @ApiProperty({ type: String, nullable: true })
  defaultTemplateName!: string | null;

  @ApiProperty()
  hasActiveDefault!: boolean;

  @ApiProperty()
  activeTemplateCount!: number;

  @ApiProperty()
  inactiveTemplateCount!: number;

  @ApiProperty()
  duplicateActiveDefaultCount!: number;

  @ApiProperty()
  missingTemplate!: boolean;

  @ApiProperty({ enum: ArtifactTemplateStatus })
  templateStatus!: ArtifactTemplateStatus;

  @ApiProperty({ type: [ArtifactTemplateSummaryTemplateDto] })
  templates!: ArtifactTemplateSummaryTemplateDto[];
}

export class ArtifactTemplateRoleSummaryDto {
  @ApiProperty()
  roleId!: string;

  @ApiProperty()
  roleCode!: string;

  @ApiProperty()
  roleDisplayName!: string;

  @ApiProperty({ type: String, nullable: true })
  builtInKey!: BuiltInEventRecipientRoleKey | null;

  @ApiProperty({ enum: EventRecipientRoleKind })
  kind!: EventRecipientRoleKind;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  isArtifactEligible!: boolean;

  @ApiProperty()
  assignmentCount!: number;

  @ApiProperty()
  activeAssignmentCount!: number;

  @ApiPropertyOptional({ type: ArtifactTemplateTypeSummaryDto })
  certificateTemplateSummary?: ArtifactTemplateTypeSummaryDto;

  @ApiPropertyOptional({ type: ArtifactTemplateTypeSummaryDto })
  badgeTemplateSummary?: ArtifactTemplateTypeSummaryDto;
}

export class ArtifactTemplateSummaryResponseDto {
  @ApiProperty({ type: [ArtifactTemplateRoleSummaryDto] })
  roles!: ArtifactTemplateRoleSummaryDto[];
}
