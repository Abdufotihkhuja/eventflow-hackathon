import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class PublicOrganizationsQueryDto {
  @ApiProperty({ example: 1, description: 'Номер страницы', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    example: 50,
    description: 'Количество на странице (max 100)',
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;

  @ApiProperty({
    enum: ['ru', 'uz', 'en'],
    description: 'Locale for localized public business fields',
    required: false,
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
