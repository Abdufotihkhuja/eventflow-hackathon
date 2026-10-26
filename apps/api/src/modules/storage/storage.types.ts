import type { ReadStream } from 'fs';

export interface StorageSaveInput {
  buffer: Buffer;
  originalName: string;
  mimetype: string;
  size: number;
  directory?: string;
  fileName: string;
}

export interface StoredFile {
  fileName: string;
  originalName: string;
  mimetype: string;
  size: number;
  relativePath: string;
  absolutePath: string;
  url: string;
}

export interface FileStorage {
  save(input: StorageSaveInput): Promise<StoredFile>;
  remove(pathOrUrl: string): Promise<void>;
  exists(pathOrUrl: string): boolean;
  getAbsolutePath(pathOrUrl: string): string;
  getPublicUrl(relativePath: string): string;
  ensureDirectory(relativeDirectory?: string): string;
  createReadStream(pathOrUrl: string): ReadStream;
}
