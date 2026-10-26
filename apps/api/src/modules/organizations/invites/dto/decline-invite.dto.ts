import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { DECLINE_REASON_MAX } from '../invites.constants';

export class DeclineInviteDto {
  @ApiPropertyOptional({
    maxLength: DECLINE_REASON_MAX,
    description:
      'Комментарий приглашённому организатору: почему отказ. Необязателен.',
  })
  @IsString()
  @IsOptional()
  @MaxLength(DECLINE_REASON_MAX)
  reason?: string;
}
