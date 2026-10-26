import { Inject, Injectable } from '@nestjs/common';
import type { ReadStream } from 'fs';
import { FILE_STORAGE_PROVIDER } from '../storage.constants';
import type {
  FileStorage,
  StoredFile,
  StorageSaveInput,
} from '../storage.types';

@Injectable()
export class FileStorageService {
  constructor(
    @Inject(FILE_STORAGE_PROVIDER) private readonly storage: FileStorage,
  ) {}

  save(input: StorageSaveInput): Promise<StoredFile> {
    return this.storage.save(input);
  }

  remove(pathOrUrl: string): Promise<void> {
    return this.storage.remove(pathOrUrl);
  }

  exists(pathOrUrl: string): boolean {
    return this.storage.exists(pathOrUrl);
  }

  getAbsolutePath(pathOrUrl: string): string {
    return this.storage.getAbsolutePath(pathOrUrl);
  }

  getPublicUrl(relativePath: string): string {
    return this.storage.getPublicUrl(relativePath);
  }

  ensureDirectory(relativeDirectory?: string): string {
    return this.storage.ensureDirectory(relativeDirectory);
  }

  createReadStream(pathOrUrl: string): ReadStream {
    return this.storage.createReadStream(pathOrUrl);
  }
}
