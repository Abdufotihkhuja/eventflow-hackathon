import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AppBuildsController } from './app-builds.controller';
import { AppBuildsService } from './app-builds.service';
import { AppBuildsStorage } from './app-builds.storage';

@Module({
  imports: [PrismaModule],
  controllers: [AppBuildsController],
  providers: [AppBuildsService, AppBuildsStorage],
})
export class AppBuildsModule {}
