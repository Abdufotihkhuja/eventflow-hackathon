import { BadRequestException, Injectable } from '@nestjs/common';
import * as fs from 'fs';
import type { ReadStream } from 'fs';
import * as path from 'path';

/**
 * Root directory for participant-uploaded registration answer files.
 *
 * IMPORTANT: this is intentionally OUTSIDE the public `UPLOADS_DIR` that
 * `ServeStaticModule` serves at `/uploads`. Answer files contain participant
 * PII and must only be reachable through authorized download endpoints, never
 * via a guessable static URL.
 */
export function getRegistrationFilesRootDir(): string {
  return (
    process.env.REGISTRATION_UPLOADS_DIR ||
    path.resolve(process.cwd(), '../../storage/registration-files')
  );
}

/**
 * Minimal private file storage for registration answer files. Mirrors the
 * path-traversal guarantees of LocalFileStorageService but is rooted in a
 * non-public directory and is never wired into static serving.
 */
@Injectable()
export class RegistrationFilesStorage {
  private readonly rootDir = path.resolve(getRegistrationFilesRootDir());

  // NOTE: the storage root is created lazily on first write (save() does a
  // recursive mkdir), NOT in the constructor. Creating it at construction
  // time would crash the whole API on boot (Nest DI) if the path is not
  // writable — e.g. an unmounted/mis-permissioned dir in production. A
  // mis-configured directory must only fail the upload that needs it, never
  // take the API down.

  /**
   * Persist a buffer under `<relativeDir>/<fileName>`. `fileName` must already
   * be a safe, generated name (uuid + sanitized ext) — never a client path.
   */
  async save(
    relativeDir: string,
    fileName: string,
    buffer: Buffer,
  ): Promise<string> {
    const relativePath = path.posix.join(relativeDir, fileName);
    const absolutePath = this.resolveInsideRoot(relativePath);
    await fs.promises.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.promises.writeFile(absolutePath, buffer);
    return relativePath;
  }

  createReadStream(relativePath: string): ReadStream {
    const absolutePath = this.resolveInsideRoot(relativePath);
    if (!fs.existsSync(absolutePath)) {
      throw new BadRequestException('Файл не найден');
    }
    return fs.createReadStream(absolutePath);
  }

  async remove(relativePath: string): Promise<void> {
    const absolutePath = this.resolveInsideRoot(relativePath);
    if (fs.existsSync(absolutePath)) {
      await fs.promises.unlink(absolutePath);
    }
  }

  /**
   * Resolve a relative path to an absolute one and guarantee it stays inside
   * the storage root (defends against `..` path traversal).
   */
  private resolveInsideRoot(relativePath: string): string {
    const normalized = relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
    const absolutePath = path.resolve(this.rootDir, normalized);
    const root = this.rootDir + path.sep;
    if (absolutePath !== this.rootDir && !absolutePath.startsWith(root)) {
      throw new BadRequestException('Недопустимый путь файла');
    }
    return absolutePath;
  }
}
