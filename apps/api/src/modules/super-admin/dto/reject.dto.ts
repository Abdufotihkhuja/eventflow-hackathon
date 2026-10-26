import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class RejectDto {
  @ApiProperty({
    example: 'Недостаточно информации о компании',
    required: false,
    description: 'Причина отклонения (опционально)',
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  reason?: string;

  @ApiProperty({
    example: 'changes_requested',
    required: false,
    enum: ['rejected', 'changes_requested'],
    description:
      'Семантика решения модерации события (MOD-04, аддитивно): ' +
      '«отклонено» либо «запрошены правки». Без поля — rejected. ' +
      'Для организаций/блога игнорируется.',
  })
  @IsIn(['rejected', 'changes_requested'])
  @IsOptional()
  kind?: 'rejected' | 'changes_requested';
}
