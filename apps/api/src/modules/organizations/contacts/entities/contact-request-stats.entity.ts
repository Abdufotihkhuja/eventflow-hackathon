import { ApiProperty } from '@nestjs/swagger';

export class ContactRequestStatsEntity {
  @ApiProperty({ example: 50, description: 'Всего заявок' })
  total: number;

  @ApiProperty({ example: 15, description: 'Новые заявки' })
  new: number;

  @ApiProperty({ example: 20, description: 'Заявки в работе' })
  inProgress: number;

  @ApiProperty({ example: 15, description: 'Закрытые заявки' })
  closed: number;

  constructor(partial: Partial<ContactRequestStatsEntity>) {
    Object.assign(this, partial);
  }
}
