import { ApiProperty } from '@nestjs/swagger';

export class EventTicketOrganizationDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ nullable: true }) logoUrl!: string | null;
  @ApiProperty({ nullable: true, description: 'Hex color #RRGGBB' })
  brandColor!: string | null;
  @ApiProperty({ nullable: true, description: 'Hex color #RRGGBB' })
  accentColor!: string | null;
}

export class EventTicketEventDto {
  @ApiProperty() id!: string;
  @ApiProperty() title!: string;
  @ApiProperty() slug!: string;
  @ApiProperty({ description: 'ISO 8601' }) startDate!: string;
  @ApiProperty({ description: 'ISO 8601' }) endDate!: string;
  @ApiProperty({ nullable: true }) venue!: string | null;
  @ApiProperty({ nullable: true }) city!: string | null;
  @ApiProperty({ enum: ['ONLINE', 'OFFLINE', 'HYBRID'] }) format!: string;
  @ApiProperty({ nullable: true }) coverImage!: string | null;
}

export class EventTicketAttendeeDto {
  @ApiProperty() id!: string;
  @ApiProperty() fullName!: string;
  @ApiProperty() email!: string;
  @ApiProperty({ nullable: true }) avatarUrl!: string | null;
  @ApiProperty() role!: string;
}

export class EventTicketCoreDto {
  @ApiProperty({ description: 'Registration id used as ticket id' }) id!: string;
  @ApiProperty({ description: 'Human-readable ticket number, e.g. EVF-260429-AB7K3X' })
  number!: string;
  @ApiProperty({ description: 'Participant role / ticket type' }) type!: string;
  @ApiProperty({
    enum: ['active', 'checked_in', 'used'],
    description:
      'Endpoint returns ticket only for APPROVED registrations. PENDING / REJECTED / CANCELLED → 404.',
  })
  status!: string;
  @ApiProperty({
    nullable: true,
    description:
      'Signed payload for QR code rendering. Null when ticket has fully been used (post-event).',
  })
  qrPayload!: string | null;
  @ApiProperty({
    nullable: true,
    description: 'Convenience deep-link the QR encodes (app check-in URL).',
  })
  qrCheckInUrl!: string | null;
  @ApiProperty({ description: 'ISO 8601' }) issuedAt!: string | null;
  @ApiProperty({ nullable: true, description: 'ISO 8601' })
  lastCheckInAt!: string | null;
  @ApiProperty({
    description: 'Translatable security tagline shown on the ticket footer',
  })
  securityLabel!: string;
}

export class EventTicketViewModelDto {
  @ApiProperty({ type: EventTicketOrganizationDto })
  organization!: EventTicketOrganizationDto;
  @ApiProperty({ type: EventTicketEventDto }) event!: EventTicketEventDto;
  @ApiProperty({ type: EventTicketAttendeeDto })
  attendee!: EventTicketAttendeeDto;
  @ApiProperty({ type: EventTicketCoreDto }) ticket!: EventTicketCoreDto;
}
