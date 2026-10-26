import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
  Matches,
} from 'class-validator';

export class VerifyCodeDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: 'Некорректный email адрес' })
  @IsNotEmpty({ message: 'Email обязателен' })
  email: string;

  @ApiProperty({ example: '123456', description: '6-значный код верификации' })
  @IsString({ message: 'Код должен быть строкой' })
  @IsNotEmpty({ message: 'Код обязателен' })
  @Length(6, 6, { message: 'Код должен состоять из 6 цифр' })
  @Matches(/^\d{6}$/, { message: 'Код должен содержать только цифры' })
  code: string;
}
