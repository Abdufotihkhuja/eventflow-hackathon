import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID } from 'class-validator';

export class UpdateMemberPermissionsDto {
  @ApiProperty({
    example: ['550e8400-e29b-41d4-a716-446655440000'],
    description:
      'Массив ID прав для назначения сотруднику (дополнительно к правам роли)',
  })
  @IsArray()
  @IsUUID('4', { each: true, message: 'Некорректный ID права' })
  permissionIds: string[];
}
