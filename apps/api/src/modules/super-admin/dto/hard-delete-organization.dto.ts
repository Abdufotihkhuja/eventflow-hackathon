import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Подтверждение необратимого удаления организации.
 * Супер-админ обязан передать строку вида `DELETE <название организации>` —
 * это второй (серверный) барьер против случайного удаления.
 */
export class HardDeleteOrganizationDto {
  @ApiProperty({
    example: 'DELETE Acme Events',
    description:
      'Строка подтверждения. Должна точно совпадать с `DELETE <название организации>`.',
  })
  @IsString()
  @MinLength(7) // 'DELETE ' + хотя бы один символ названия
  @MaxLength(400)
  confirmation!: string;
}
