import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { MemberStatus } from '@prisma/client';
import {
  IsEnum,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { normalizeOptionalPhone } from './phone.transform';

export class UpdateMemberDto {
  @ApiPropertyOptional({ example: 'Пётр' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Петров' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional({ example: '+998901234567' })
  @Transform(({ value }) => normalizeOptionalPhone(value))
  @IsPhoneNumber(undefined, { message: 'Некорректный номер телефона' })
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: 'Менеджер по продажам' })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  position?: string;

  @ApiPropertyOptional({ example: 'Отдел продаж' })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  department?: string;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID('4', { message: 'Некорректный ID роли' })
  @IsOptional()
  roleId?: string;

  @ApiPropertyOptional({
    description: 'Статус сотрудника',
    enum: MemberStatus,
    example: MemberStatus.ACTIVE,
  })
  @IsEnum(MemberStatus, { message: 'Некорректный статус' })
  @IsOptional()
  status?: MemberStatus;
}
