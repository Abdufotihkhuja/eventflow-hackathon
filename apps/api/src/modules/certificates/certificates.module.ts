import { Module } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module';
import {
  CertificatesController,
  EventCertificatesController,
  UserCertificatesController,
} from './certificates.controller';
import { CertificatesService } from './certificates.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { UploadsModule } from '../uploads/uploads.module';
import { StorageModule } from '../storage/storage.module';
import { CertificateGenerationService } from './application/certificate-generation.service';
import { ArtifactRecipientsModule } from '../events/artifact-recipients/artifact-recipients.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    BillingModule,
    PrismaModule,
    UploadsModule,
    StorageModule,
    ArtifactRecipientsModule,
    MailModule,
  ],
  controllers: [
    CertificatesController,
    EventCertificatesController,
    UserCertificatesController,
  ],
  providers: [CertificatesService, CertificateGenerationService],
  exports: [CertificatesService, CertificateGenerationService],
})
export class CertificatesModule {}
