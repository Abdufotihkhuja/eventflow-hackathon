import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { normalizeOptionalPhone } from './phone.transform';

export class CreateMemberDto {
  @ApiProperty({ example: 'member@example.com' })
  @IsEmail({}, { message: 'Некорректный email' })
  @IsNotEmpty({ message: 'Email обязателен' })
  email: string;

  @ApiPropertyOptional({
    example: 'password123',
    description:
      'Legacy-поле. Прямое создание сотрудника с паролем запрещено; invite flow его не использует.',
  })
  @IsString()
  @MinLength(8, { message: 'Пароль должен содержать минимум 8 символов' })
  @IsOptional()
  password?: string;

  @ApiProperty({ example: 'Пётр' })
  @IsString()
  @IsNotEmpty({ message: 'Имя обязательно' })
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ example: 'Петров' })
  @IsString()
  @IsNotEmpty({ message: 'Фамилия обязательна' })
  @MaxLength(100)
  lastName: string;

  @ApiPropertyOptional({ example: '+998901234567' })
  @Transform(({ value }) => normalizeOptionalPhone(value))
  @IsPhoneNumber(undefined, { message: 'Некорректный номер телефона' })
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: 'Менеджер по продажам' })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  position?: string;

  @ApiPropertyOptional({ example: 'Отдел продаж' })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  department?: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID('4', { message: 'Некорректный ID роли' })
  @IsNotEmpty({ message: 'ID роли обязателен' })
  roleId: string;

  @ApiPropertyOptional({
    example: true,
    description:
      'Для legacy-маршрута должно быть true. false или отсутствие поля отклоняется; используйте POST /organizations/invites.',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  sendInvitation?: boolean;
}
