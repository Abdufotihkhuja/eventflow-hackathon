import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class CertificateQueryDto {
  @ApiPropertyOptional({ example: 1, description: 'Номер страницы' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, description: 'Записей на странице' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  // Up to the per-event certificate batch cap so the issued list can load
  // everyone in one fetch. The UI requests limit=200; the old cap of 100
  // rejected it with 400, leaving the issued list permanently empty.
  @Max(500)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Поиск по имени или email получателя',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  search?: string;
}
