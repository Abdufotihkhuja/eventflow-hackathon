import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ContactsModule } from '../organizations/contacts/contacts.module';
import { UploadsModule } from '../uploads/uploads.module';
import { PlacesController } from './places.controller';
import { PlacesRepository } from './places.repository';
import { PlacesService } from './places.service';

@Module({
  imports: [PrismaModule, UploadsModule, ContactsModule],
  controllers: [PlacesController],
  providers: [PlacesRepository, PlacesService],
  exports: [PlacesRepository, PlacesService],
})
export class PlacesModule {}
