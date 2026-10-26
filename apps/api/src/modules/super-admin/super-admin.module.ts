import { Module } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { SuperAdminController } from './super-admin.controller';
import { SuperAdminService } from './super-admin.service';
import { VerificationCodesController } from './verification-codes.controller';
import { VerificationModule } from '../verification/verification.module';
import { MailModule } from '../mail/mail.module';
import { BlogModule } from '../blog/blog.module';
import { AccessMaskModule } from '../access-mask/access-mask.module';
import { SuperAdminAccessMaskController } from './access-mask.controller';
import { SuperAdminAccessMaskService } from './access-mask.service';
import { UsersExportService } from './users-export.service';
import { PlatformElevationController } from './platform-elevation.controller';
import { PlatformElevationService } from './platform-elevation.service';

@Module({
  imports: [
    BillingModule,
    PrismaModule,
    VerificationModule,
    MailModule,
    BlogModule,
    AccessMaskModule,
  ],
  controllers: [
    SuperAdminController,
    VerificationCodesController,
    SuperAdminAccessMaskController,
    PlatformElevationController,
  ],
  providers: [
    SuperAdminService,
    SuperAdminAccessMaskService,
    UsersExportService,
    PlatformElevationService,
  ],
  exports: [SuperAdminService],
})
export class SuperAdminModule {}
