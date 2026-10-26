import { Module } from '@nestjs/common';
import { LocalFileStorageService } from './local-file-storage.service';
import { FileStorageService } from './application/file-storage.service';
import { FILE_STORAGE_PROVIDER } from './storage.constants';

@Module({
  providers: [
    LocalFileStorageService,
    {
      provide: FILE_STORAGE_PROVIDER,
      useExisting: LocalFileStorageService,
    },
    FileStorageService,
  ],
  exports: [LocalFileStorageService, FileStorageService],
})
export class StorageModule {}
