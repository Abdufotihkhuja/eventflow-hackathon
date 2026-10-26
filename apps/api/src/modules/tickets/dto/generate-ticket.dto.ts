import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

export enum TicketDesign {
  BRANDED = 'branded',
  SIMPLE = 'simple',
}

export class GenerateTicketDto {
  @ApiPropertyOptional({
    enum: TicketDesign,
    default: TicketDesign.BRANDED,
    description: 'Дизайн билета: branded (с обложкой) или simple (белый фон)',
  })
  @IsEnum(TicketDesign)
  @IsOptional()
  design?: TicketDesign = TicketDesign.BRANDED;
}
