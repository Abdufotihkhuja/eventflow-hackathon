import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

/**
 * Creates an organization invite. Unlike the legacy member-creation flow this
 * never requires a password: the staff record is created only when the invitee
 * accepts. The email is normalized (trim + lowercase) server-side.
 */
export class CreateInviteDto {
  @ApiProperty({ example: 'member@example.com' })
  @IsEmail({}, { message: 'Некорректный email' })
  @IsNotEmpty({ message: 'Email обязателен' })
  email: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID('4', { message: 'Некорректный ID роли' })
  @IsNotEmpty({ message: 'ID роли обязателен' })
  roleId: string;

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
}
