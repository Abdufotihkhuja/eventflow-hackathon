import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength, IsUUID } from 'class-validator';

export class SuggestSlugQueryDto {
  @ApiProperty({
    example: 'Tech Conference 2025',
    description: 'Заголовок мероприятия — из него генерируется уникальный slug',
  })
  @IsString()
  @MaxLength(500)
  title: string;

  @ApiPropertyOptional({
    description:
      'ID мероприятия при редактировании — при проверке уникальности эта запись исключается',
  })
  @IsUUID()
  @IsOptional()
  excludeId?: string;
}
