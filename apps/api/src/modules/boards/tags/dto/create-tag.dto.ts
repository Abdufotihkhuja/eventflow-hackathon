import { ApiProperty, ApiSchema } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength, Matches } from 'class-validator';

// Уникальное имя OpenAPI-схемы: класс совпадает по имени с events/tags CreateTagDto.
@ApiSchema({ name: 'BoardCreateTagDto' })
export class CreateTagDto {
  @ApiProperty({ example: 'Frontend' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name: string;

  @ApiProperty({ example: '#3B82F6', description: 'HEX цвет' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, {
    message: 'Цвет должен быть в формате HEX',
  })
  color: string;
}
