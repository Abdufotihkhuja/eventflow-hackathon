import { Module, forwardRef } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module';
import {
  RegistrationsController,
  EventRegistrationsController,
} from './registrations.controller';
import { RegistrationsService } from './registrations.service';
import { RegistrationsRepository } from './registrations.repository';
import { PrismaModule } from '../../prisma/prisma.module';
import { TicketsModule } from '../tickets/tickets.module';
import { MailModule } from '../mail/mail.module';
import { RegistrationFilesModule } from '../registration-files/registration-files.module';

@Module({
  imports: [
    BillingModule,
    PrismaModule,
    forwardRef(() => TicketsModule),
    MailModule,
    RegistrationFilesModule,
  ],
  controllers: [RegistrationsController, EventRegistrationsController],
  providers: [RegistrationsService, RegistrationsRepository],
  exports: [RegistrationsService, RegistrationsRepository],
})
export class RegistrationsModule {}
