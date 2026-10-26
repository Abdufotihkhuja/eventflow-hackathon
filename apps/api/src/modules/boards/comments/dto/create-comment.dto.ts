import { ApiProperty, ApiSchema } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

// Уникальное имя OpenAPI-схемы: класс совпадает по имени с events/comments CreateCommentDto.
@ApiSchema({ name: 'BoardCreateCommentDto' })
export class CreateCommentDto {
  @ApiProperty({
    example: 'Отличная работа! Нужно только поправить валидацию.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  content: string;
}
