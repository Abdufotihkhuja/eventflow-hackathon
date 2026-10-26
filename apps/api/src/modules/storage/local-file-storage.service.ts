import { BadRequestException, Injectable } from '@nestjs/common';
import * as fs from 'fs';
import type { ReadStream } from 'fs';
import * as path from 'path';
import {
  getUploadsRootDir,
  normalizeRelativeUploadPath,
  resolveUploadAbsolutePath,
  toUploadsPublicUrl,
} from './storage-paths';
import { FileStorage, StoredFile, StorageSaveInput } from './storage.types';

@Injectable()
export class LocalFileStorageService implements FileStorage {
  private readonly rootDir = getUploadsRootDir();

  constructor() {
    this.ensureDirectory();
  }

  async save(input: StorageSaveInput): Promise<StoredFile> {
    const relativePath = input.directory
      ? path.posix.join(input.directory, input.fileName)
      : input.fileName;
    const absolutePath = this.getAbsolutePath(relativePath);

    await fs.promises.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.promises.writeFile(absolutePath, input.buffer);

    return {
      fileName: input.fileName,
      originalName: input.originalName,
      mimetype: input.mimetype,
      size: input.size,
      relativePath,
      absolutePath,
      url: this.getPublicUrl(relativePath),
    };
  }

  async remove(pathOrUrl: string): Promise<void> {
    const absolutePath = this.getAbsolutePath(pathOrUrl);

    if (!fs.existsSync(absolutePath)) {
      return;
    }

    await fs.promises.unlink(absolutePath);
  }

  exists(pathOrUrl: string): boolean {
    return fs.existsSync(this.getAbsolutePath(pathOrUrl));
  }

  getAbsolutePath(pathOrUrl: string): string {
    const absolutePath = resolveUploadAbsolutePath(pathOrUrl);
    this.assertInsideRoot(absolutePath);
    return absolutePath;
  }

  getPublicUrl(relativePath: string): string {
    return toUploadsPublicUrl(relativePath);
  }

  ensureDirectory(relativeDirectory?: string): string {
    const targetDir = relativeDirectory
      ? this.getAbsolutePath(normalizeRelativeUploadPath(relativeDirectory))
      : this.rootDir;

    this.assertInsideRoot(targetDir);

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    return targetDir;
  }

  createReadStream(pathOrUrl: string): ReadStream {
    const absolutePath = this.getAbsolutePath(pathOrUrl);

    if (!fs.existsSync(absolutePath)) {
      throw new BadRequestException('Файл не найден');
    }

    return fs.createReadStream(absolutePath);
  }

  private assertInsideRoot(absolutePath: string): void {
    const normalizedRoot = path.resolve(this.rootDir);
    const normalizedTarget = path.resolve(absolutePath);

    // Сравниваем с корнем ПЛЮС разделитель (или сам корень), иначе
    // `startsWith(root)` пропускает соседний каталог с общим префиксом
    // (например root=/data/uploads матчит /data/uploads-evil/...).
    const rootWithSep = normalizedRoot.endsWith(path.sep)
      ? normalizedRoot
      : normalizedRoot + path.sep;
    if (
      normalizedTarget !== normalizedRoot &&
      !normalizedTarget.startsWith(rootWithSep)
    ) {
      throw new BadRequestException('Недопустимый путь файла');
    }
  }
}
