import { mkdtempSync, rmSync } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { LocalFileStorageService } from './local-file-storage.service';

describe('LocalFileStorageService', () => {
  const originalUploadsDir = process.env.UPLOADS_DIR;
  let uploadsDir: string;

  beforeEach(() => {
    uploadsDir = mkdtempSync(path.join(os.tmpdir(), 'eventflow-storage-'));
    process.env.UPLOADS_DIR = uploadsDir;
  });

  afterEach(() => {
    if (originalUploadsDir === undefined) {
      delete process.env.UPLOADS_DIR;
    } else {
      process.env.UPLOADS_DIR = originalUploadsDir;
    }

    rmSync(uploadsDir, { recursive: true, force: true });
  });

  it('saves files and serves them through the storage contract', async () => {
    const storage = new LocalFileStorageService();
    const saved = await storage.save({
      buffer: Buffer.from('hello storage'),
      originalName: 'hello.txt',
      mimetype: 'text/plain',
      size: 13,
      directory: 'docs',
      fileName: 'file.txt',
    });

    expect(saved.url).toBe('/uploads/docs/file.txt');
    expect(storage.exists(saved.relativePath)).toBe(true);

    const file = await new Promise<string>((resolve, reject) => {
      let data = '';
      const stream = storage.createReadStream(saved.relativePath);

      stream.on('data', (chunk) => {
        data += chunk.toString();
      });
      stream.on('end', () => resolve(data));
      stream.on('error', reject);
    });

    expect(file).toBe('hello storage');
    expect(storage.getAbsolutePath(saved.absolutePath)).toBe(saved.absolutePath);
    expect(storage.exists(saved.absolutePath)).toBe(true);

    await storage.remove(saved.relativePath);
    expect(storage.exists(saved.relativePath)).toBe(false);
  });
});
