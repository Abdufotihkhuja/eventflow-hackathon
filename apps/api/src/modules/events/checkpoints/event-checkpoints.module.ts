import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { EventCheckpointsController } from './event-checkpoints.controller';
import { EventCheckpointsRepository } from './event-checkpoints.repository';
import { EventCheckpointsService } from './event-checkpoints.service';

/**
 * Модуль намеренно не зависит ни от чего, кроме Prisma: его импортируют и
 * AttendanceModule, и TicketsModule (оба пишут check-in), поэтому любая
 * обратная зависимость превратилась бы в цикл.
 */
@Module({
  imports: [PrismaModule],
  controllers: [EventCheckpointsController],
  providers: [EventCheckpointsService, EventCheckpointsRepository],
  exports: [EventCheckpointsService, EventCheckpointsRepository],
})
export class EventCheckpointsModule {}
