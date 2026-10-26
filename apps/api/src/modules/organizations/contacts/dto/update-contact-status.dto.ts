import { ApiProperty } from '@nestjs/swagger';
import { ContactRequestStatus } from '@prisma/client';
import { IsEnum, IsNotEmpty } from 'class-validator';

export class UpdateContactStatusDto {
  @ApiProperty({
    enum: ContactRequestStatus,
    description: 'Новый статус заявки',
    example: ContactRequestStatus.IN_PROGRESS,
  })
  @IsNotEmpty()
  @IsEnum(ContactRequestStatus)
  status: ContactRequestStatus;
}
