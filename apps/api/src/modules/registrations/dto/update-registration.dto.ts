import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { IsUtcIso8601 } from '../../../common/validators/utc-iso8601.validator';
import { Type } from 'class-transformer';
import { ParticipantRole } from '@prisma/client';

export class UpdateRegistrationDto {
  @ApiPropertyOptional({
    description: 'Роль участника на событии',
    enum: ParticipantRole,
  })
  @IsOptional()
  @IsEnum(ParticipantRole)
  role?: ParticipantRole;

  @ApiPropertyOptional({
    description: 'Дата начала перелёта/дороги (YYYY-MM-DD или ISO 8601 с Z)',
    example: '2025-03-04',
  })
  @IsOptional()
  @IsUtcIso8601()
  travelStartDate?: string | null;

  @ApiPropertyOptional({
    description: 'Дата окончания перелёта/дороги (YYYY-MM-DD или ISO 8601 с Z)',
    example: '2025-03-04',
  })
  @IsOptional()
  @IsUtcIso8601()
  travelEndDate?: string | null;

  @ApiPropertyOptional({
    description: 'Количество дней на подготовку до события (0-30)',
    example: 2,
    minimum: 0,
    maximum: 30,
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(30)
  preparationDays?: number;
}
