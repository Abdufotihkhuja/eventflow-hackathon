import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';
import { CreateManualArtifactRecipientDto } from './manage-recipient-role.dto';
import { ArtifactRecipientDto } from './artifact-recipient-response.dto';

export const BATCH_RECIPIENTS_MAX_ROWS = 500;

export class BatchCreateManualArtifactRecipientsDto {
  @ApiProperty({
    type: [CreateManualArtifactRecipientDto],
    description: `Up to ${BATCH_RECIPIENTS_MAX_ROWS} manual recipients to create or reuse.`,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(BATCH_RECIPIENTS_MAX_ROWS)
  @ValidateNested({ each: true })
  @Type(() => CreateManualArtifactRecipientDto)
  recipients!: CreateManualArtifactRecipientDto[];

  @ApiPropertyOptional({
    type: [String],
    description:
      'Default role codes applied to every row that does not specify roleIds or roleCodes. ' +
      'Useful for Excel imports where a single role applies to the whole sheet.',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    each: true,
    message:
      'Role code must be a lowercase slug with letters, numbers, and single hyphen-separated words',
  })
  defaultRoleCodes?: string[];
}

export enum BatchRecipientOutcome {
  CREATED = 'CREATED',
  REUSED = 'REUSED',
  FAILED = 'FAILED',
}

export class BatchRecipientResultRowDto {
  @ApiProperty({ description: 'Zero-based index in the submitted recipients array.' })
  index!: number;

  @ApiProperty({ enum: BatchRecipientOutcome })
  outcome!: BatchRecipientOutcome;

  @ApiProperty({ type: ArtifactRecipientDto, nullable: true })
  recipient!: ArtifactRecipientDto | null;

  @ApiProperty({ type: String, nullable: true })
  error!: string | null;
}

export class BatchCreateManualArtifactRecipientsResultDto {
  @ApiProperty({ type: [BatchRecipientResultRowDto] })
  results!: BatchRecipientResultRowDto[];

  @ApiProperty()
  createdCount!: number;

  @ApiProperty()
  reusedCount!: number;

  @ApiProperty()
  failedCount!: number;
}
