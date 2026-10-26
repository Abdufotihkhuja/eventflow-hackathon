import { Module } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { RegistrationsModule } from '../registrations/registrations.module';
import { UsersModule } from '../users/users.module';
import { EventsModule } from '../events/events.module';
import { StorageModule } from '../storage/storage.module';
import { OptionalJwtAuthGuard } from '../../common/guards';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';
import { PublicRepository } from './public.repository';

@Module({
  imports: [
    BillingModule,
    PrismaModule,
    RegistrationsModule,
    UsersModule,
    EventsModule,
    StorageModule,
  ],
  controllers: [PublicController],
  providers: [PublicService, PublicRepository, OptionalJwtAuthGuard],
  exports: [PublicService],
})
export class PublicModule {}
