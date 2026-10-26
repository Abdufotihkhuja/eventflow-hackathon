import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  MaxLength,
  Matches,
  IsUUID,
} from 'class-validator';

export class CheckSlugQueryDto {
  @ApiProperty({
    example: 'kak-organizovat-meropriyatie',
    description: 'Slug для проверки (a-z, 0-9, дефис)',
  })
  @IsString()
  @MaxLength(200)
  @Matches(/^[a-z0-9-]+$/, {
    message:
      'Slug может содержать только строчные латинские буквы, цифры и дефисы',
  })
  slug: string;

  @ApiPropertyOptional({
    description:
      'ID статьи при редактировании — этот slug считается свободным, если принадлежит этой статье',
  })
  @IsUUID()
  @IsOptional()
  excludeId?: string;
}
