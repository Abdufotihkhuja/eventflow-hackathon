import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { EventRecipientStatus } from '@prisma/client';

export class ArtifactRecipientQueryDto {
  @ApiPropertyOptional({ example: 1, description: 'Page number' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, description: 'Recipients per page' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Search by recipient name or email' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by recipient role id' })
  @IsOptional()
  @IsUUID()
  roleId?: string;

  @ApiPropertyOptional({
    description: 'Filter by recipient role code, for example participant',
    example: 'participant',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  roleCode?: string;

  @ApiPropertyOptional({ enum: EventRecipientStatus })
  @IsOptional()
  @IsEnum(EventRecipientStatus)
  status?: EventRecipientStatus;
}
