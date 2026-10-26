import { Module } from '@nestjs/common';
import {
  UserAttendanceController,
  SelfCheckInController,
  EventAttendanceController,
  AttendanceController,
} from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { TicketsModule } from '../tickets/tickets.module';
import { EventCheckpointsModule } from '../events/checkpoints/event-checkpoints.module';

@Module({
  imports: [PrismaModule, TicketsModule, EventCheckpointsModule],
  controllers: [
    UserAttendanceController,
    SelfCheckInController,
    EventAttendanceController,
    AttendanceController,
  ],
  providers: [AttendanceService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
