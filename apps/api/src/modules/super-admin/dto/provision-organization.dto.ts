import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

export class ProvisionOrganizationDto {
  @ApiProperty({ example: 'owner@example.com' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'EventFlow Team' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  organizationName: string;

  @ApiPropertyOptional({ example: 'EventFlow Team LLC' })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  companyName?: string;

  @ApiPropertyOptional({ example: '1234567890' })
  @IsString()
  @IsOptional()
  @Length(1, 20)
  inn?: string;

  @ApiPropertyOptional({ example: 'Организатор деловых мероприятий' })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;
}

export class ProvisionOrganizationResponseDto {
  @ApiProperty()
  organizationId: string;

  @ApiProperty()
  accountId: string;

  @ApiProperty()
  membershipId: string;

  @ApiProperty({
    example: true,
    description:
      'Owner должен установить пароль через существующий password-reset flow.',
  })
  setupRequired: true;
}
