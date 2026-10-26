import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength, IsUUID } from 'class-validator';

export class SuggestSlugQueryDto {
  @ApiProperty({
    example: 'Как организовать успешную конференцию',
    description: 'Заголовок статьи — из него генерируется уникальный slug',
  })
  @IsString()
  @MaxLength(500)
  title: string;

  @ApiPropertyOptional({
    description:
      'ID статьи при редактировании — при проверке уникальности эта запись исключается',
  })
  @IsUUID()
  @IsOptional()
  excludeId?: string;
}
