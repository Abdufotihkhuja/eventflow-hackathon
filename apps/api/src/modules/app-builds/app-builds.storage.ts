import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import type { ReadStream } from 'fs';
import * as path from 'path';

/**
 * Root directory for internal mobile app build artifacts.
 *
 * IMPORTANT: intentionally OUTSIDE the public `UPLOADS_DIR` served by
 * `ServeStaticModule` at `/uploads`. Builds are internal artifacts and must
 * only be reachable through the SUPER_ADMIN download endpoint, never via a
 * guessable static URL.
 */
export function getAppBuildsRootDir(): string {
  return (
    process.env.APP_BUILDS_DIR ||
    path.resolve(process.cwd(), '../../storage/app-builds')
  );
}

/**
 * Minimal private file storage for app build artifacts. Mirrors the
 * path-traversal guarantees of RegistrationFilesStorage but is rooted in its
 * own non-public directory.
 */
@Injectable()
export class AppBuildsStorage {
  private readonly rootDir = path.resolve(getAppBuildsRootDir());

  // NOTE: the storage root is created lazily on first write (save() does a
  // recursive mkdir), NOT in the constructor — a mis-configured directory
  // must only fail the upload that needs it, never take the API down.

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
      throw new NotFoundException('Файл сборки не найден в хранилище');
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
