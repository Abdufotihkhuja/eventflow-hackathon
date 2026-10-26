import { ApiProperty, ApiSchema } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

// Уникальное имя OpenAPI-схемы: класс совпадает по имени с events/comments UpdateCommentDto.
@ApiSchema({ name: 'BoardUpdateCommentDto' })
export class UpdateCommentDto {
  @ApiProperty({ example: 'Исправленный комментарий' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  content: string;
}
