import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ChangeEmailRequestDto {
  @ApiProperty({
    example: 'newemail@example.com',
    description: 'Новый email адрес',
  })
  @IsEmail({}, { message: 'Некорректный email адрес' })
  @IsNotEmpty({ message: 'Новый email обязателен' })
  newEmail: string;

  @ApiProperty({
    example: 'CurrentPassword123!',
    description: 'Текущий пароль для подтверждения',
  })
  @IsString({ message: 'Пароль должен быть строкой' })
  @IsNotEmpty({ message: 'Текущий пароль обязателен' })
  @MinLength(1, { message: 'Текущий пароль не может быть пустым' })
  currentPassword: string;
}
