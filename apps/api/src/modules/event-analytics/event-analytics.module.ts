import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { EventAnalyticsController } from './event-analytics.controller';
import { EventAnalyticsService } from './event-analytics.service';

@Module({
  imports: [PrismaModule],
  controllers: [EventAnalyticsController],
  providers: [EventAnalyticsService],
  exports: [EventAnalyticsService],
})
export class EventAnalyticsModule {}
