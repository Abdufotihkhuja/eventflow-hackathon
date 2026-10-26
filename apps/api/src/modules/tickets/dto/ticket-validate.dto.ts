import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class ValidateTicketDto {
  @ApiProperty({
    description:
      'Содержимое QR-кода. Поддерживаются signed v2 payloads (`v2.<body>.<sig>`) и legacy raw UUID.',
  })
  @IsString()
  @IsNotEmpty()
  qrCode!: string;

  @ApiProperty({
    required: false,
    description:
      'Опциональный eventId — при сканировании на конкретном пункте входа. Если задан и не совпадает с владельцем билета — статус `wrong_event`.',
  })
  @IsOptional()
  @IsUUID()
  eventId?: string;
}

export class TicketValidationAttendeeDto {
  @ApiProperty() id!: string;
  @ApiProperty() fullName!: string;
  @ApiProperty() email!: string;
  @ApiProperty() role!: string;
}

export class TicketValidationEventDto {
  @ApiProperty() id!: string;
  @ApiProperty() title!: string;
}

export class TicketValidationTicketDto {
  @ApiProperty() number!: string;
  @ApiProperty() type!: string;
}

export class TicketValidationResultDto {
  @ApiProperty()
  valid!: boolean;

  @ApiProperty({
    enum: [
      'valid',
      'already_used',
      'pending_review',
      'cancelled',
      'rejected',
      'registration_not_approved',
      'expired',
      'event_not_started',
      'wrong_event',
      'invalid_signature',
      'ticket_not_found',
    ],
    description:
      'Машиночитаемый код для UI staff/organizer. `valid` означает разрешить вход.',
  })
  status!: string;

  @ApiProperty({ description: 'Человекочитаемое сообщение для отображения staff' })
  message!: string;

  @ApiProperty({ type: TicketValidationAttendeeDto, required: false })
  attendee?: TicketValidationAttendeeDto;

  @ApiProperty({ type: TicketValidationEventDto, required: false })
  event?: TicketValidationEventDto;

  @ApiProperty({ type: TicketValidationTicketDto, required: false })
  ticket?: TicketValidationTicketDto;

  @ApiProperty({
    required: false,
    description:
      'ISO-таймстамп check-in. Для статуса `valid` — текущая отметка; для `already_used` — время первого прохода.',
  })
  checkedInAt?: string;
}
