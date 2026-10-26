import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, IsIn } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class SavedEventsQueryDto {
  @ApiPropertyOptional({ example: 1, description: 'Номер страницы' })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({
    example: 10,
    description: 'Количество событий на странице',
  })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  limit?: number = 10;

  @ApiPropertyOptional({
    enum: ['ru', 'uz', 'en'],
    description: 'Locale for localized public business fields',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    const normalized = value.trim().toLowerCase().replaceAll('_', '-');
    return normalized ? normalized.split('-')[0] : undefined;
  })
  @IsIn(['ru', 'uz', 'en'])
  locale?: string;
}
