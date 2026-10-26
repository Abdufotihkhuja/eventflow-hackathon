import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ContactRequestStatus,
  ContactRequestType,
  RentalType,
} from '@prisma/client';

export class ContactRequestEntity {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({
    description: 'Информация о пользователе',
    type: 'object',
    properties: {
      id: { type: 'string', example: 'uuid' },
      firstName: { type: 'string', example: 'Иван' },
      lastName: { type: 'string', example: 'Иванов' },
      avatarUrl: { type: 'string', example: 'https://example.com/avatar.jpg' },
    },
  })
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    avatarUrl?: string | null;
  } | null;

  @ApiPropertyOptional({
    description: 'Организация-заявитель для заявок на аренду площадки',
    type: 'object',
    properties: {
      id: { type: 'string', example: 'uuid' },
      name: { type: 'string', example: 'EventFlow Agency' },
      logoUrl: { type: 'string', example: '/uploads/logo.png' },
    },
  })
  requesterOrganization?: {
    id: string;
    name: string;
    logoUrl?: string | null;
  } | null;

  @ApiPropertyOptional({
    description: 'Площадка, по которой оставлена заявка',
    type: 'object',
    properties: {
      id: { type: 'string', example: 'uuid' },
      title: { type: 'string', example: 'Loft Hall Tashkent' },
      slug: { type: 'string', example: 'loft-hall-tashkent' },
      coverImage: { type: 'string', example: '/uploads/places/cover.jpg' },
    },
  })
  rentalPlace?: {
    id: string;
    title: string;
    slug: string;
    coverImage?: string | null;
  } | null;

  @ApiProperty({ example: '+998901234567' })
  phone: string;

  @ApiProperty({
    example: 'Хочу узнать подробнее о вашем мероприятии',
    required: false,
  })
  message?: string;

  @ApiProperty({
    enum: ContactRequestStatus,
    example: ContactRequestStatus.NEW,
  })
  status: ContactRequestStatus;

  @ApiProperty({
    enum: ContactRequestType,
    example: ContactRequestType.PLACE_RENTAL,
  })
  type: ContactRequestType;

  @ApiPropertyOptional({
    enum: RentalType,
    example: RentalType.DAILY,
    description: 'Тип аренды (только для заявок PLACE_RENTAL)',
  })
  rentalType?: RentalType | null;

  @ApiProperty({ example: '2024-01-15T10:00:00Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-15T10:00:00Z' })
  updatedAt: Date;

  constructor(partial: Partial<ContactRequestEntity>) {
    Object.assign(this, partial);
  }
}
