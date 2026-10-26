import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength } from 'class-validator';

export class RejectBlogPostDto {
  @ApiProperty({
    description: 'Причина отклонения',
    example: 'Статья содержит рекламный контент',
    maxLength: 1000,
  })
  @IsString()
  @MaxLength(1000)
  message: string;
}

export class ApproveBlogPostDto {
  @ApiPropertyOptional({
    description: 'Комментарий модератора (опционально)',
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  message?: string;
}
