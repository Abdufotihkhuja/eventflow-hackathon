import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class CreateContactRequestDto {
  @ApiProperty({
    description: 'Номер телефона',
    example: '+998901234567',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: 'Телефон должен быть в международном формате',
  })
  phone: string;

  @ApiPropertyOptional({
    description: 'Сообщение для организатора',
    example: 'Хочу узнать подробнее о вашем мероприятии',
  })
  @IsOptional()
  @IsString()
  message?: string;
}
