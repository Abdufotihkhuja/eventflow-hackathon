import { Module } from '@nestjs/common';
import {
  UserTicketsController,
  EventTicketsController,
  MyEventTicketController,
  TicketScannerController,
} from './tickets.controller';
import { TicketsService } from './tickets.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { TicketGenerationService } from './application/ticket-generation.service';
import { TicketNumberService } from './application/ticket-number.service';
import { TicketQrService } from './application/ticket-qr.service';
import { TicketViewService } from './application/ticket-view.service';
import { TicketValidationService } from './application/ticket-validation.service';
import { TicketCheckInService } from './application/ticket-check-in.service';
import { StorageModule } from '../storage/storage.module';
import { EventCheckpointsModule } from '../events/checkpoints/event-checkpoints.module';

@Module({
  imports: [PrismaModule, StorageModule, EventCheckpointsModule],
  controllers: [
    UserTicketsController,
    EventTicketsController,
    MyEventTicketController,
    TicketScannerController,
  ],
  providers: [
    TicketsService,
    TicketGenerationService,
    TicketNumberService,
    TicketQrService,
    TicketViewService,
    TicketValidationService,
    TicketCheckInService,
  ],
  exports: [
    TicketsService,
    TicketGenerationService,
    TicketNumberService,
    TicketQrService,
    TicketViewService,
    TicketValidationService,
    TicketCheckInService,
  ],
})
export class TicketsModule {}
