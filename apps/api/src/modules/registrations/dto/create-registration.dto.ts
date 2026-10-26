import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsUUID,
  IsString,
  ValidateNested,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { IsUtcIso8601 } from '../../../common/validators/utc-iso8601.validator';
import { Type } from 'class-transformer';
import { ParticipantRole } from '@prisma/client';

export class AnswerDto {
  @ApiProperty({ example: 'uuid' })
  @IsUUID()
  questionId: string;

  @ApiProperty({ example: 'Моя должность - разработчик' })
  @IsString()
  answer: string;
}

export class CreateRegistrationDto {
  @ApiPropertyOptional({ type: [AnswerDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerDto)
  @IsOptional()
  answers?: AnswerDto[];

  @ApiPropertyOptional({
    description: 'Роль участника на событии',
    enum: ParticipantRole,
    default: ParticipantRole.PARTICIPANT,
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
  travelStartDate?: string;

  @ApiPropertyOptional({
    description: 'Дата окончания перелёта/дороги (YYYY-MM-DD или ISO 8601 с Z)',
    example: '2025-03-04',
  })
  @IsOptional()
  @IsUtcIso8601()
  travelEndDate?: string;

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
