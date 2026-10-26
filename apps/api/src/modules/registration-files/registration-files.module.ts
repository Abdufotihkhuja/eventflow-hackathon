import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import {
  OrganizerRegistrationFilesController,
  RegistrationFilesController,
} from './registration-files.controller';
import { RegistrationFilesService } from './registration-files.service';
import { RegistrationFilesRepository } from './registration-files.repository';
import { RegistrationFilesStorage } from './registration-files.storage';

@Module({
  imports: [PrismaModule],
  controllers: [
    RegistrationFilesController,
    OrganizerRegistrationFilesController,
  ],
  providers: [
    RegistrationFilesService,
    RegistrationFilesRepository,
    RegistrationFilesStorage,
  ],
  exports: [RegistrationFilesService],
})
export class RegistrationFilesModule {}
