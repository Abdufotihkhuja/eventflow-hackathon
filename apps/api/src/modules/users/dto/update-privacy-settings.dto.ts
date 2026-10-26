import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdatePrivacySettingsDto {
  @ApiProperty({
    description: 'Публичный профиль (виден всем пользователям)',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isPublicProfile?: boolean;

  @ApiProperty({
    description: 'Показывать email другим пользователям',
    example: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  showEmail?: boolean;

  @ApiProperty({
    description: 'Показывать телефон другим пользователям',
    example: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  showPhone?: boolean;
}
