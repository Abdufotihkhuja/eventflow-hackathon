import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { TicketDesign } from './generate-ticket.dto';
import { RegistrationStatus } from '@prisma/client';

export class DownloadTicketsDto {
  @ApiPropertyOptional({
    enum: TicketDesign,
    default: TicketDesign.BRANDED,
    description: 'Дизайн билетов',
  })
  @IsEnum(TicketDesign)
  @IsOptional()
  design?: TicketDesign = TicketDesign.BRANDED;

  @ApiPropertyOptional({
    type: [String],
    description:
      'ID регистраций для скачивания. Если не указано — все одобренные',
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  registrationIds?: string[];

  @ApiPropertyOptional({
    enum: RegistrationStatus,
    default: RegistrationStatus.APPROVED,
    description: 'Статус регистраций для скачивания',
  })
  @IsEnum(RegistrationStatus)
  @IsOptional()
  status?: RegistrationStatus = RegistrationStatus.APPROVED;
}
