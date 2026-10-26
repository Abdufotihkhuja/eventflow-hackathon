import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

/**
 * DTO для редактирования пользователя супер-админом.
 * Не содержит статусных полей - статус не меняется.
 */
export class AdminUpdateUserDto {
  @ApiPropertyOptional({ example: 'user@example.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: 'Иван Иванов' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: '+998901234567' })
  @IsPhoneNumber()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: 'Ташкент, Узбекистан' })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  location?: string;

  @ApiPropertyOptional({ example: 'Разработчик с 5-летним опытом...' })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  bio?: string;

  @ApiPropertyOptional({ example: true, description: 'Email подтверждён' })
  @IsBoolean()
  @IsOptional()
  isEmailVerified?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Публичный профиль' })
  @IsBoolean()
  @IsOptional()
  isPublicProfile?: boolean;

  @ApiPropertyOptional({ example: false, description: 'Показывать email' })
  @IsBoolean()
  @IsOptional()
  showEmail?: boolean;

  @ApiPropertyOptional({ example: false, description: 'Показывать телефон' })
  @IsBoolean()
  @IsOptional()
  showPhone?: boolean;

  @ApiPropertyOptional({ example: 'https://linkedin.com/in/username' })
  @IsUrl()
  @IsOptional()
  linkedinUrl?: string;

  @ApiPropertyOptional({ example: 'https://instagram.com/username' })
  @IsUrl()
  @IsOptional()
  instagramUrl?: string;

  @ApiPropertyOptional({ example: 'https://facebook.com/username' })
  @IsUrl()
  @IsOptional()
  facebookUrl?: string;

  @ApiPropertyOptional({ example: 'https://example.com' })
  @IsUrl()
  @IsOptional()
  websiteUrl?: string;
}
