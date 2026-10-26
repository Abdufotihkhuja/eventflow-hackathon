import { ApiProperty } from '@nestjs/swagger';

export class FollowersStatsEntity {
  @ApiProperty({ example: 150, description: 'Общее количество подписчиков' })
  total: number;

  @ApiProperty({
    example: 25,
    description: 'Количество новых подписчиков за последние 30 дней',
  })
  last30Days: number;

  @ApiProperty({
    example: 5,
    description: 'Количество новых подписчиков за последние 7 дней',
  })
  last7Days: number;

  constructor(partial: Partial<FollowersStatsEntity>) {
    Object.assign(this, partial);
  }
}
