import { ApiProperty } from '@nestjs/swagger';

export class FollowerEntity {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Иван' })
  firstName: string;

  @ApiProperty({ example: 'Иванов' })
  lastName: string;

  @ApiProperty({ example: 'https://example.com/avatar.jpg', required: false })
  avatarUrl?: string;

  @ApiProperty({ example: '2024-01-15T10:00:00Z' })
  followedAt: Date;

  constructor(partial: Partial<FollowerEntity>) {
    Object.assign(this, partial);
  }
}
