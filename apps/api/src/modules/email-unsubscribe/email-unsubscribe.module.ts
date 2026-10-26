import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { EmailUnsubscribeController } from './email-unsubscribe.controller';
import { EmailUnsubscribeService } from './email-unsubscribe.service';
import { UnsubscribeTokenService } from './unsubscribe-token.service';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [EmailUnsubscribeController],
  providers: [UnsubscribeTokenService, EmailUnsubscribeService],
  exports: [UnsubscribeTokenService, EmailUnsubscribeService],
})
export class EmailUnsubscribeModule {}
