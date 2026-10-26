import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({ example: 'Модератор' })
  @IsString()
  @IsNotEmpty({ message: 'Название роли обязательно' })
  name: string;

  @ApiProperty({
    example: ['550e8400-e29b-41d4-a716-446655440000'],
    description: 'Массив ID прав для роли',
  })
  @IsArray()
  @IsUUID('4', { each: true, message: 'Некорректный ID права' })
  permissionIds: string[];
}
