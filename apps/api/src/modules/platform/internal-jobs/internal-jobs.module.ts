import { Module } from '@nestjs/common';
import { BillingModule } from '../../billing/billing.module';
import { MailModule } from '../../mail/mail.module';
import { TicketsModule } from '../../tickets/tickets.module';
import { CertificatesModule } from '../../certificates/certificates.module';
import { BadgesModule } from '../../badges/badges.module';
import { RegistrationFilesModule } from '../../registration-files/registration-files.module';
import { InternalJobsController } from './internal-jobs.controller';
import { InternalJobGuard } from '../queue/internal-job.guard';

@Module({
  imports: [
    BillingModule,
    MailModule,
    TicketsModule,
    CertificatesModule,
    BadgesModule,
    RegistrationFilesModule,
  ],
  controllers: [InternalJobsController],
  providers: [InternalJobGuard],
})
export class InternalJobsModule {}
