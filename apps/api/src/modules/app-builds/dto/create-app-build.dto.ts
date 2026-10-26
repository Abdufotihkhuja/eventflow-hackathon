import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AppBuildPlatform } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateAppBuildDto {
  @ApiProperty({ enum: AppBuildPlatform })
  @IsEnum(AppBuildPlatform)
  platform: AppBuildPlatform;

  @ApiProperty({ example: '0.1.0 (42)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  version: string;

  @ApiPropertyOptional({ example: 'Исправлен self check-in, новые бейджи' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
