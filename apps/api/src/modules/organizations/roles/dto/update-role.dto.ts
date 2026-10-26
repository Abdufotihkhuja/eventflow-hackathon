import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateRoleDto {
  @ApiProperty({ example: 'Модератор', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    example: ['550e8400-e29b-41d4-a716-446655440000'],
    required: false,
    description: 'Массив ID прав для роли',
  })
  @IsArray()
  @IsUUID('4', { each: true, message: 'Некорректный ID права' })
  @IsOptional()
  permissionIds?: string[];
}
