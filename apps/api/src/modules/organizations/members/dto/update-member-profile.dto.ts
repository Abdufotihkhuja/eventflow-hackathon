import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  MaxLength,
  IsPhoneNumber,
} from 'class-validator';
import { normalizeOptionalPhone } from './phone.transform';

/**
 * DTO для обновления профиля сотрудника (самим сотрудником)
 * Отличается от UpdateMemberDto тем, что не позволяет менять роль/статус
 */
export class UpdateMemberProfileDto {
  @ApiPropertyOptional({ example: 'Иван', description: 'Имя' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Иванов', description: 'Фамилия' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional({
    example: '+998901234567',
    description: 'Номер телефона',
  })
  @Transform(({ value }) => normalizeOptionalPhone(value))
  @IsOptional()
  @IsPhoneNumber(undefined, { message: 'Некорректный номер телефона' })
  phone?: string;

  @ApiPropertyOptional({
    example: 'Менеджер проектов',
    description: 'Должность',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  position?: string;

  @ApiPropertyOptional({
    example: 'Отдел разработки',
    description: 'Отдел',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  department?: string;

  @ApiPropertyOptional({
    example: 'Опытный менеджер с 5-летним стажем...',
    description: 'О себе (биография)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string;

  @ApiPropertyOptional({
    example: 'Ташкент, Узбекистан',
    description: 'Местоположение',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;
}
