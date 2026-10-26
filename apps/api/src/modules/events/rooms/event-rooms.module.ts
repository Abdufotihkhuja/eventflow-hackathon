import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { EventRoomsController } from './event-rooms.controller';
import { EventRoomsService } from './event-rooms.service';

@Module({
  imports: [PrismaModule],
  controllers: [EventRoomsController],
  providers: [EventRoomsService],
  exports: [EventRoomsService],
})
export class EventRoomsModule {}
