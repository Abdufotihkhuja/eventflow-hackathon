import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  MaxLength,
  Matches,
  IsUUID,
} from 'class-validator';

export class CheckBlogCategorySlugQueryDto {
  @ApiProperty({
    example: 'tips-guides',
    description: 'Slug для проверки (a-z, 0-9, дефис)',
  })
  @IsString()
  @MaxLength(100)
  @Matches(/^[a-z0-9-]+$/, {
    message:
      'Slug может содержать только строчные латинские буквы, цифры и дефисы',
  })
  slug: string;

  @ApiPropertyOptional({
    description:
      'ID категории при редактировании — этот slug считается свободным, если принадлежит этой категории',
  })
  @IsUUID()
  @IsOptional()
  excludeId?: string;
}
