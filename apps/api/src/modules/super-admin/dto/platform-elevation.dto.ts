import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PlatformElevationMode } from '@prisma/client';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

export class RequestPlatformElevationDto {
  @ApiProperty({
    enum: PlatformElevationMode,
    default: PlatformElevationMode.READ,
  })
  @IsEnum(PlatformElevationMode)
  mode: PlatformElevationMode = PlatformElevationMode.READ;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  organizationId?: string;

  @ApiProperty({ minLength: 10 })
  @IsString()
  @MinLength(10)
  reason: string;
}

export class PlatformElevationResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ enum: PlatformElevationMode })
  mode: PlatformElevationMode;

  @ApiProperty({ nullable: true, type: String })
  token: string | null;

  @ApiProperty({ format: 'date-time' })
  expiresAt: Date;

  @ApiProperty()
  approvalRequired: boolean;
}
