import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  ALLOWED_MAX_FILE_SIZE_MB,
  ALLOWED_REGISTRATION_FILE_EXTENSIONS,
  HARD_MAX_FILES,
} from '../registration-files.constants';

/** Organizer-uploaded template attachment descriptor stored inside the config. */
export class FileUploadTemplateDto {
  @ApiProperty({ example: '/uploads/registration-templates/uuid.pdf' })
  @IsString()
  @MaxLength(1000)
  url: string;

  @ApiProperty({ example: 'template.pdf' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 102400 })
  @IsInt()
  @Min(0)
  size: number;

  @ApiProperty({ example: 'application/pdf' })
  @IsString()
  @MaxLength(255)
  mimeType: string;
}

/** Settings for a FILE_UPLOAD question. Persisted as `fileUploadConfig` JSON. */
export class FileUploadConfigDto {
  @ApiPropertyOptional({
    description: 'Инструкция/описание для участника',
    example: 'Загрузите ваше резюме в формате PDF',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ type: FileUploadTemplateDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => FileUploadTemplateDto)
  template?: FileUploadTemplateDto | null;

  @ApiPropertyOptional({
    description: 'Максимальный размер одного файла в МБ',
    example: 10,
    enum: ALLOWED_MAX_FILE_SIZE_MB,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsIn(ALLOWED_MAX_FILE_SIZE_MB as unknown as number[])
  maxFileSizeMb?: number;

  @ApiPropertyOptional({
    description: 'Разрешённые расширения файлов',
    example: ['.pdf', '.docx', '.png'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsIn(ALLOWED_REGISTRATION_FILE_EXTENSIONS, { each: true })
  allowedFileTypes?: string[];

  @ApiPropertyOptional({ description: 'Разрешить несколько файлов', example: false })
  @IsOptional()
  @IsBoolean()
  allowMultipleFiles?: boolean;

  @ApiPropertyOptional({
    description: 'Максимальное количество файлов (если включена множественная загрузка)',
    example: 3,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(HARD_MAX_FILES)
  maxFiles?: number;
}
