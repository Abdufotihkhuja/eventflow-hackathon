import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateSuperAdminDto {
  @ApiProperty({ example: 'admin@example.com' })
  @IsEmail({}, { message: 'Некорректный email' })
  @IsNotEmpty({ message: 'Email обязателен' })
  email: string;

  @ApiProperty({ example: 'securePassword123' })
  @IsString()
  @MinLength(12, { message: 'Пароль должен содержать минимум 12 символов' })
  @IsNotEmpty({ message: 'Пароль обязателен' })
  password: string;

  @ApiProperty({ example: 'Супер Админ' })
  @IsString()
  @IsNotEmpty({ message: 'Имя обязательно' })
  name: string;
}
