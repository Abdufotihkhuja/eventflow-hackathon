import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';
import { MailController } from './mail.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { QueueModule } from '../platform/queue/queue.module';
import { MailDispatchService } from './application/mail-dispatch.service';
import { EmailUnsubscribeModule } from '../email-unsubscribe/email-unsubscribe.module';

@Module({
  imports: [
    PrismaModule,
    QueueModule,
    EmailUnsubscribeModule,
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const user = configService.get<string>('mail.auth.user');
        const pass = configService.get<string>('mail.auth.pass');
        return {
          transport: {
            host: configService.get<string>('mail.host'),
            port: configService.get<number>('mail.port'),
            secure: configService.get<boolean>('mail.secure'),
            // Only authenticate when credentials are configured. Without a user
            // (e.g. the local Mailpit catcher) nodemailer must NOT send AUTH,
            // otherwise it fails with "Missing credentials for PLAIN".
            ...(user ? { auth: { user, pass } } : {}),
          },
          defaults: {
            from: configService.get<string>('mail.from'),
          },
        };
      },
    }),
  ],
  controllers: [MailController],
  providers: [MailService, MailDispatchService],
  exports: [MailService, MailDispatchService],
})
export class MailModule {}
