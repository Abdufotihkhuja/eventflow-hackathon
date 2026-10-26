import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

/** Локализованные подписи на материал. Ключи: ru, uz, en. */
export type MaterialTitleTranslations = {
  ru?: string;
  uz?: string;
  en?: string;
};

export class AddMaterialLinkDto {
  @ApiProperty({
    example: 'https://drive.google.com/file/d/xxx/view',
    description: 'URL материала (презентация, документ и т.д.)',
  })
  @Transform(({ value, obj }) => value ?? obj.link)
  @IsUrl(
    { require_protocol: true, protocols: ['http', 'https'] },
    { message: 'Укажите корректный URL (http или https)' },
  )
  @IsNotEmpty({ message: 'URL обязателен' })
  url: string;

  @ApiPropertyOptional({
    example: 'Доклад',
    description: 'Название материала (для отображения на фронте)',
  })
  @Transform(({ value, obj }) => value ?? obj.name)
  @IsString()
  @IsOptional()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  link?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({
    description:
      'Локализованные подписи на материал. Ключи: ru, uz, en. Если задано — ' +
      'подменяет scalar title. Используется для показа корректной подписи ' +
      'участникам в зависимости от их интерфейсного языка.',
    example: { ru: 'Доклад', uz: "Ma'ruza", en: 'Talk' },
  })
  @IsOptional()
  @IsObject()
  titleTranslations?: MaterialTitleTranslations;
}
