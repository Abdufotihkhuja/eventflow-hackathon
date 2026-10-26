import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength } from 'class-validator';

/**
 * Организатор отменяет участие или отзывает подтверждение участника.
 * Причина необязательна и попадает в письмо-уведомление участнику.
 */
export class CancelRegistrationDto {
  @ApiPropertyOptional({ example: 'Причина отмены участия' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  reason?: string;
}
