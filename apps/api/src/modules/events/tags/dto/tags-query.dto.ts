import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum } from 'class-validator';
import { TagCategory } from '@prisma/client';

export class TagsQueryDto {
  @ApiPropertyOptional({
    enum: TagCategory,
    description: 'Фильтр по категории тега',
    example: TagCategory.FORMAT,
  })
  @IsEnum(TagCategory)
  @IsOptional()
  category?: TagCategory;
}
