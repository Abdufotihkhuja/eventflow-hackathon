import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength, IsOptional } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({
    example: 'Отличное мероприятие! Спасибо организаторам!',
    description: 'Текст комментария',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content: string;

  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID родительского комментария (для ответов)',
  })
  @IsString()
  @IsOptional()
  parentId?: string;
}
