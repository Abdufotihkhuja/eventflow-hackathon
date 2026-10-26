import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * PUT /super-admin/organizations/:orgId/access-mask — заменяет весь набор
 * закрытых прав организации. Пустой массив = снять маску полностью.
 */
export class SetAccessMaskDto {
  @ApiProperty({
    type: [String],
    description: 'Коды прав, закрытых для организации (deny-list). Невалидные отбрасываются.',
  })
  @IsArray()
  @ArrayMaxSize(500)
  @IsString({ each: true })
  deniedCodes!: string[];

  @ApiPropertyOptional({ description: 'Причина изменения (необязательна); попадает в аудит.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
