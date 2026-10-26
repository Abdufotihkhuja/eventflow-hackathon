import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { StorageModule } from '../../storage/storage.module';
import { ArtifactBulkPreviewService } from './artifact-bulk-preview.service';
import { ArtifactRecipientsController } from './artifact-recipients.controller';
import { ArtifactRecipientsService } from './artifact-recipients.service';
import { ArtifactRecipientResolverService } from './artifact-recipient-resolver.service';
import { ArtifactTemplateRoleResolverService } from './artifact-template-role-resolver.service';

@Module({
  imports: [PrismaModule, StorageModule],
  controllers: [ArtifactRecipientsController],
  providers: [
    ArtifactBulkPreviewService,
    ArtifactRecipientsService,
    ArtifactRecipientResolverService,
    ArtifactTemplateRoleResolverService,
  ],
  exports: [
    ArtifactBulkPreviewService,
    ArtifactRecipientsService,
    ArtifactRecipientResolverService,
    ArtifactTemplateRoleResolverService,
  ],
})
export class ArtifactRecipientsModule {}
