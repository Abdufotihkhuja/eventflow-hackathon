import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class UpdateCommentDto {
  @ApiProperty({
    example: 'Обновлённый текст комментария',
    description: 'Текст комментария',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content: string;
}
