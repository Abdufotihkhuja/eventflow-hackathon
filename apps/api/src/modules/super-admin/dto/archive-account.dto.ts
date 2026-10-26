import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/** Необязательная причина архивации пользователя/организации. */
export class ArchiveAccountDto {
  @ApiPropertyOptional({
    example: 'Нарушение правил платформы',
    description: 'Причина архивации (опционально, попадает в audit log)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}
