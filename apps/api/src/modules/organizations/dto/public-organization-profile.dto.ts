import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrganizationVerificationStatus } from '@prisma/client';

export class PublicOrganizationProfileDto {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'EventFlow' })
  name: string;

  @ApiProperty({ example: 'ООО "EventFlow"' })
  companyName: string;

  @ApiPropertyOptional({ example: 'Организация мероприятий' })
  description?: string;

  @ApiPropertyOptional({ example: 'https://example.com/logo.jpg' })
  logoUrl?: string;

  @ApiPropertyOptional({ example: 'https://eventflow.com' })
  website?: string;

  @ApiPropertyOptional({ example: 'Москва, ул. Примерная, 123' })
  address?: string;

  @ApiProperty({ example: 150, description: 'Количество подписчиков' })
  followersCount: number;

  @ApiProperty({ example: 25, description: 'Количество событий' })
  eventsCount: number;

  @ApiProperty({
    enum: OrganizationVerificationStatus,
    example: OrganizationVerificationStatus.APPROVED,
  })
  verificationStatus: OrganizationVerificationStatus;

  @ApiPropertyOptional({ example: '2024-01-15T10:00:00Z' })
  verifiedAt?: Date;

  @ApiProperty({
    example: true,
    description: 'Подписан ли текущий пользователь',
  })
  isFollowing: boolean;

  constructor(partial: Partial<PublicOrganizationProfileDto>) {
    Object.assign(this, partial);
  }
}
