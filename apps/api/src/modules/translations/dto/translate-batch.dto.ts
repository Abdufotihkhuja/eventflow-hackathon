import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsString,
  MaxLength,
  Validate,
  ValidateNested,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
  type ValidationArguments,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  APP_LOCALES,
  TRANSLATION_CONTENT_TYPES,
  type AppLocale,
  type TranslationContentType,
} from '../translation.types';

@ValidatorConstraint({ name: 'sourceLocaleNotInTargetLocales', async: false })
class SourceLocaleNotInTargetLocalesConstraint
  implements ValidatorConstraintInterface
{
  validate(targetLocales: unknown, args: ValidationArguments): boolean {
    if (!Array.isArray(targetLocales)) {
      return true;
    }

    const object = args.object as TranslateBatchDto;
    return !targetLocales.includes(object.sourceLocale);
  }

  defaultMessage(): string {
    return 'sourceLocale must not be present in targetLocales';
  }
}

export class TranslateBatchItemDto {
  @ApiProperty({ example: 'title' })
  @IsString()
  @IsNotEmpty()
  fieldKey: string;

  // Rich-text fields are sent as a single newline-joined payload (all blocks in
  // one item), so this caps the whole description, not a single block.
  @ApiProperty({ example: 'Конференция', maxLength: 50000 })
  @IsString()
  @MaxLength(50000)
  text: string;

  @ApiProperty({ enum: TRANSLATION_CONTENT_TYPES, example: 'plain_text' })
  @IsEnum(TRANSLATION_CONTENT_TYPES)
  contentType: TranslationContentType;
}

export class TranslateBatchDto {
  @ApiProperty({ enum: APP_LOCALES, example: 'ru' })
  @IsEnum(APP_LOCALES)
  sourceLocale: AppLocale;

  @ApiProperty({ enum: APP_LOCALES, isArray: true, example: ['uz', 'en'] })
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(APP_LOCALES, { each: true })
  @Validate(SourceLocaleNotInTargetLocalesConstraint)
  targetLocales: AppLocale[];

  @ApiProperty({ type: [TranslateBatchItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => TranslateBatchItemDto)
  items: TranslateBatchItemDto[];
}
