import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { RentalType } from '@prisma/client';

@ValidatorConstraint({ name: 'maxWords', async: false })
class MaxWordsConstraint implements ValidatorConstraintInterface {
  validate(value: string | undefined, args: ValidationArguments): boolean {
    if (!value) {
      return true;
    }

    const [maxWords] = args.constraints as [number];
    const words = value.trim().split(/\s+/).filter(Boolean);

    return words.length <= maxWords;
  }

  defaultMessage(args: ValidationArguments): string {
    const [maxWords] = args.constraints as [number];
    return `Комментарий должен содержать не более ${maxWords} слов`;
  }
}

export class CreatePlaceRentalRequestDto {
  @ApiProperty({
    enum: RentalType,
    example: RentalType.DAILY,
    description: 'Тип аренды: HOURLY (почасовая) или DAILY (суточная)',
  })
  @IsNotEmpty()
  @IsEnum(RentalType, {
    message: 'Тип аренды должен быть HOURLY или DAILY',
  })
  rentalType: RentalType;

  @ApiProperty({
    description: 'Контактный номер телефона',
    example: '+998901234567',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: 'Телефон должен быть в международном формате',
  })
  phone: string;

  @ApiPropertyOptional({
    description: 'Комментарий к заявке, до 100 слов',
    example:
      'Нужна площадка для делового мероприятия на 120 гостей, интересуют условия аренды и базовое техническое оснащение.',
  })
  @IsOptional()
  @IsString()
  @Validate(MaxWordsConstraint, [100])
  comment?: string;
}
