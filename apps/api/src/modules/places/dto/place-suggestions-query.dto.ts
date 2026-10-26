import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Max, Min } from 'class-validator';

export class PlaceSuggestionsQueryDto {
  @ApiPropertyOptional({ example: 41.311151 })
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiPropertyOptional({ example: 69.279737 })
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiPropertyOptional({ example: 15, default: 15 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(200)
  @IsOptional()
  radiusKm?: number = 15;

  @ApiPropertyOptional({ example: 6, default: 6 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(30)
  @IsOptional()
  limit?: number = 6;
}
