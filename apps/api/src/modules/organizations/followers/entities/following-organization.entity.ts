import { ApiProperty } from '@nestjs/swagger';
import { OrganizationVerificationStatus } from '@prisma/client';

export class FollowingOrganizationEntity {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'EventFlow' })
  name: string;

  @ApiProperty({ example: 'ООО "EventFlow"' })
  companyName: string;

  @ApiProperty({ example: 'https://example.com/logo.jpg', required: false })
  logoUrl?: string;

  @ApiProperty({ example: 'Организация мероприятий', required: false })
  description?: string;

  @ApiProperty({ example: 'https://eventflow.com', required: false })
  website?: string;

  @ApiProperty({
    enum: OrganizationVerificationStatus,
    example: OrganizationVerificationStatus.APPROVED,
  })
  verificationStatus: OrganizationVerificationStatus;

  @ApiProperty({ example: '2024-01-15T10:00:00Z' })
  followedAt: Date;

  constructor(partial: Partial<FollowingOrganizationEntity>) {
    Object.assign(this, partial);
  }
}
