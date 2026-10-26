import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsBoolean } from 'class-validator';

/**
 * DTO для обновления настроек приватности сотрудника
 */
export class UpdateMemberPrivacyDto {
  @ApiPropertyOptional({
    example: true,
    description: 'Публичный профиль (виден другим сотрудникам организации)',
  })
  @IsOptional()
  @IsBoolean()
  isPublicProfile?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: 'Показывать email другим сотрудникам',
  })
  @IsOptional()
  @IsBoolean()
  showEmail?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: 'Показывать телефон другим сотрудникам',
  })
  @IsOptional()
  @IsBoolean()
  showPhone?: boolean;
}
