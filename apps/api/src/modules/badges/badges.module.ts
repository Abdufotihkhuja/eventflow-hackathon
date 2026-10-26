import { Module } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { UploadsModule } from '../uploads/uploads.module';
import { TicketsModule } from '../tickets/tickets.module';
import { ArtifactRecipientsModule } from '../events/artifact-recipients/artifact-recipients.module';
import { BadgesController } from './badges.controller';
import { BadgesService } from './badges.service';
import { BadgeZipProgressService } from './application/badge-zip-progress.service';

@Module({
  imports: [
    BillingModule,
    PrismaModule,
    UploadsModule,
    StorageModule,
    TicketsModule,
    ArtifactRecipientsModule,
  ],
  controllers: [BadgesController],
  providers: [BadgesService, BadgeZipProgressService],
  exports: [BadgesService],
})
export class BadgesModule {}
