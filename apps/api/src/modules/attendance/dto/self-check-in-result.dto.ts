import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Результат самостоятельного check-in участника (POST /events/:eventId/attendance/self-check-in).
 */
export class SelfCheckInAttendanceDto {
  @ApiProperty() id!: string;
  @ApiProperty({ description: 'ISO 8601' }) checkInAt!: string;
  @ApiProperty({ description: 'ISO 8601, дата check-in (UTC-день)' })
  checkInDate!: string;
}

export class SelfCheckInEventDto {
  @ApiProperty() id!: string;
  @ApiProperty() title!: string;
  @ApiProperty() slug!: string;
  @ApiProperty({ description: 'ISO 8601' }) startDate!: string;
  @ApiProperty({ description: 'ISO 8601' }) endDate!: string;
}

export class SelfCheckInCheckpointDto {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'Регистрация участников' }) name!: string;
  @ApiProperty({ description: 'ISO 8601' }) startsAt!: string;
  @ApiProperty({ description: 'ISO 8601' }) endsAt!: string;
}

export class SelfCheckInResultDto {
  @ApiProperty({ type: SelfCheckInAttendanceDto })
  attendance!: SelfCheckInAttendanceDto;
  @ApiPropertyOptional({
    type: SelfCheckInCheckpointDto,
    nullable: true,
    description:
      'Чекпоинт, в который попала отметка. null — активного чекпоинта не было, отметка засчитана на день.',
  })
  checkpoint!: SelfCheckInCheckpointDto | null;
  @ApiProperty({ type: SelfCheckInEventDto }) event!: SelfCheckInEventDto;
}
