import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength } from 'class-validator';

export class RejectRegistrationDto {
  @ApiPropertyOptional({ example: 'Причина отклонения заявки' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  reason?: string;
}
