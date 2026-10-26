import { Module } from '@nestjs/common';
import { CollectionsController, AdminCollectionsController } from './collections.controller';
import { CollectionsService } from './collections.service';
import { CollectionsRepository } from './collections.repository';
import { UploadsModule } from '../uploads/uploads.module';

@Module({
  imports: [UploadsModule],
  controllers: [CollectionsController, AdminCollectionsController],
  providers: [CollectionsService, CollectionsRepository],
  exports: [CollectionsService, CollectionsRepository],
})
export class CollectionsModule {}
