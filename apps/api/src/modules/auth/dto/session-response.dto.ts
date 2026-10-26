import { ApiProperty } from '@nestjs/swagger';

export class SessionResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({
    example: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...',
  })
  userAgent: string | null;

  @ApiProperty({ example: '192.168.1.1' })
  ipAddress: string | null;

  @ApiProperty({ example: '2025-01-03T10:00:00.000Z' })
  lastUsedAt: Date;

  @ApiProperty({ example: '2025-01-03T09:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2025-01-10T09:00:00.000Z' })
  expiresAt: Date;

  @ApiProperty({ example: true })
  isCurrent: boolean;
}
