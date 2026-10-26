import { ApiPropertyOptional } from '@nestjs/swagger';
import { ParticipantRole } from '@prisma/client';
import {
  IsArray,
  IsUUID,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsIn,
  IsString,
} from 'class-validator';

export const ARTIFACT_GENERATION_SCOPES = ['ROLE', 'ALL_ELIGIBLE'] as const;
export type ArtifactGenerationScope =
  (typeof ARTIFACT_GENERATION_SCOPES)[number];

export const INELIGIBLE_POLICIES = ['EXCLUDE', 'INCLUDE'] as const;
/**
 * What to do with manually selected recipients that fail the eligibility
 * filters (registration not approved / no attendance):
 * - EXCLUDE: skip them, issue to the rest (default).
 * - INCLUDE: trust the manual selection and issue to everyone selected.
 */
export type IneligiblePolicy = (typeof INELIGIBLE_POLICIES)[number];

export class GenerateCertificatesDto {
  @ApiPropertyOptional({
    example: ['uuid1', 'uuid2'],
    description:
      'ID регистраций. Если не указано, генерируются для всех посетивших',
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  registrationIds?: string[];

  @ApiPropertyOptional({
    example: ['uuid1', 'uuid2'],
    description:
      'Normalized EventRecipient IDs. If roleId/roleCode is omitted, all eligible assigned roles for selected recipients are used.',
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  recipientIds?: string[];

  @ApiPropertyOptional({
    example: true,
    description: 'Генерировать только для посетивших хотя бы один день',
  })
  @IsBoolean()
  @IsOptional()
  onlyAttended?: boolean;

  @ApiPropertyOptional({
    enum: ParticipantRole,
    example: ParticipantRole.PARTICIPANT,
    description:
      'Роль получателей. PARTICIPANT — участники, SPEAKER — спикеры, MENTOR — менторы.',
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
    description:
      'Normalized EventRecipientRole code, for example participant or speaker.',
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
    description:
      'ID конкретного шаблона. Если не указано, используется шаблон по умолчанию для выбранной роли.',
  })
  @IsUUID('4')
  @IsOptional()
  templateId?: string;

  @ApiPropertyOptional({
    example: false,
    description:
      'Force regeneration even when a matching generated PDF already exists.',
  })
  @IsBoolean()
  @IsOptional()
  forceRegenerate?: boolean;

  @ApiPropertyOptional({
    enum: INELIGIBLE_POLICIES,
    example: 'EXCLUDE',
    description:
      'For manual selection (recipientIds/registrationIds): how to treat recipients that fail the approved-registration / attendance filters. EXCLUDE (default) issues to eligible only; INCLUDE trusts the manual selection and issues to everyone selected.',
  })
  @IsIn(INELIGIBLE_POLICIES)
  @IsOptional()
  ineligiblePolicy?: IneligiblePolicy;
}
