import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export const DEVICE_PLATFORMS = ['ios', 'android'] as const;
export const DEVICE_LOCALES = ['ru', 'uz', 'en'] as const;

/** Тело PUT /me/devices/{installationId} (CONTRACT_DIFF §1). */
export class RegisterDeviceDto {
  @ApiProperty({ description: 'Expo push token устройства' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  expoPushToken!: string;

  @ApiProperty({ enum: DEVICE_PLATFORMS })
  @IsIn(DEVICE_PLATFORMS)
  platform!: (typeof DEVICE_PLATFORMS)[number];

  @ApiProperty({
    enum: DEVICE_LOCALES,
    description:
      'Локаль интерфейса устройства — единственный способ локализовать killed-push',
  })
  @IsIn(DEVICE_LOCALES)
  locale!: (typeof DEVICE_LOCALES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  appVersion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  osVersion?: string;
}
