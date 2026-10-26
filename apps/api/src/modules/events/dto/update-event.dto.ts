import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { IsNumber, IsOptional, Min } from 'class-validator';

import { CreateEventDto } from './create-event.dto';

export class UpdateEventDto extends PartialType(
  OmitType(CreateEventDto, ['maxParticipants'] as const),
) {
  // Переопределяем поле, чтобы лимит участников можно было снять: undefined
  // означает «не трогать», а очищенное в форме поле приходит как явный null.
  @ApiPropertyOptional({
    // Без явного type рефлексия отдаёт `number | null` как Object — и в
    // контракте появляется `type: "object"` вместо числа.
    type: Number,
    example: 100,
    nullable: true,
    description: 'Лимит участников. null — снять ограничение.',
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxParticipants?: number | null;
}
