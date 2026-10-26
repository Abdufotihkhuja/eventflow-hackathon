import { ApiPropertyOptional } from '@nestjs/swagger';
import { ParticipantRole } from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { ARTIFACT_GENERATION_SCOPES } from '../../certificates/dto/generate-certificates.dto';
import type { ArtifactGenerationScope } from '../../certificates/dto/generate-certificates.dto';

export class DownloadBadgesDto {
  @ApiPropertyOptional({
    example: ['uuid1', 'uuid2'],
    description: 'ID регистраций для выборочного скачивания',
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  registrationIds?: string[];

  @ApiPropertyOptional({
    example: ['uuid1', 'uuid2'],
    description: 'Normalized EventRecipient IDs for selective badge download.',
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  recipientIds?: string[];

  @ApiPropertyOptional({
    enum: ParticipantRole,
    example: ParticipantRole.PARTICIPANT,
    description: 'Роль получателей бейджей',
  })
  @IsEnum(ParticipantRole)
  @IsOptional()
  recipientRole?: ParticipantRole;

  @ApiPropertyOptional({
    example: 'uuid-role',
    description: 'Normalized EventRecipientRole ID. Alias: recipientRoleId.',
  })
  @IsUUID('4')
  @IsOptional()
  roleId?: string;

  @ApiPropertyOptional({
    example: 'uuid-role',
    description: 'Preferred normalized EventRecipientRole ID.',
  })
  @IsUUID('4')
  @IsOptional()
  recipientRoleId?: string;

  @ApiPropertyOptional({
    example: ['uuid-role-1', 'uuid-role-2'],
    description:
      'Preferred normalized EventRecipientRole IDs. Takes priority over roleId/recipientRoleId.',
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  recipientRoleIds?: string[];

  @ApiPropertyOptional({
    example: 'speaker',
    description: 'Normalized EventRecipientRole code.',
  })
  @IsString()
  @IsOptional()
  roleCode?: string;

  @ApiPropertyOptional({
    enum: ARTIFACT_GENERATION_SCOPES,
    example: 'ROLE',
    description:
      'ROLE keeps legacy role-scoped behavior. ALL_ELIGIBLE resolves every active artifact-eligible role assignment.',
  })
  @IsIn(ARTIFACT_GENERATION_SCOPES)
  @IsOptional()
  scope?: ArtifactGenerationScope;

  @ApiPropertyOptional({
    example: 'uuid-template',
    description: 'ID конкретного шаблона бейджа',
  })
  @IsUUID('4')
  @IsOptional()
  templateId?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Только одобренные регистрации. По умолчанию true.',
  })
  @IsBoolean()
  @IsOptional()
  onlyApproved?: boolean;
}
