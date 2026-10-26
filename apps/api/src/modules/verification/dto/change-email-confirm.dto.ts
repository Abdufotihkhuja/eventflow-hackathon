import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class ChangeEmailConfirmDto {
  @ApiProperty({ example: '123456', description: '6-значный код верификации' })
  @IsString({ message: 'Код должен быть строкой' })
  @IsNotEmpty({ message: 'Код обязателен' })
  @Length(6, 6, { message: 'Код должен состоять из 6 цифр' })
  @Matches(/^\d{6}$/, { message: 'Код должен содержать только цифры' })
  code: string;
}
