import { Module } from '@nestjs/common';
import { VerificationService } from './verification.service';
import { VerificationRepository } from './verification.repository';
import { VerificationController } from './verification.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { MailModule } from '../mail/mail.module';
import { IamCoreModule } from '../iam/iam-core.module';

@Module({
  imports: [PrismaModule, MailModule, IamCoreModule],
  controllers: [VerificationController],
  providers: [VerificationService, VerificationRepository],
  exports: [VerificationService, VerificationRepository],
})
export class VerificationModule {}
