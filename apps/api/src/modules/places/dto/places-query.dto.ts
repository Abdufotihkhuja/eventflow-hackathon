import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { RentalPlaceStatus } from '@prisma/client';

export class PlacesQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 10 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  @IsOptional()
  limit?: number = 10;

  @ApiPropertyOptional({ example: 'loft' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: RentalPlaceStatus })
  @IsEnum(RentalPlaceStatus)
  @IsOptional()
  status?: RentalPlaceStatus;
}
