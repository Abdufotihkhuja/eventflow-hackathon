import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsBoolean,
  MaxLength,
} from 'class-validator';

export class CreateBlogCommentDto {
  @ApiProperty({
    description: 'Текст комментария',
    example: 'Отличная статья! Очень полезная информация.',
    maxLength: 2000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content: string;

  @ApiPropertyOptional({
    description: 'ID родительского комментария (для ответов)',
    example: 'uuid-of-parent-comment',
  })
  @IsUUID('4')
  @IsOptional()
  parentId?: string;
}

export class UpdateBlogCommentDto {
  @ApiProperty({
    description: 'Новый текст комментария',
    example: 'Обновлённый комментарий',
    maxLength: 2000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content: string;
}

export class BlogCommentLikeDto {
  @ApiProperty({
    description: 'Тип реакции: true = лайк, false = дизлайк',
    example: true,
  })
  @IsBoolean()
  isLike: boolean;
}
