import * as path from 'path';

export const UPLOADS_PUBLIC_PREFIX = '/uploads';

export function getUploadsRootDir(): string {
  return (
    process.env.UPLOADS_DIR ||
    path.resolve(process.cwd(), '../../storage/uploads')
  );
}

export function normalizeRelativeUploadPath(value: string): string {
  const normalized = toStoragePathname(value);
  const uploadsRoot = path.resolve(getUploadsRootDir()).replace(/\\/g, '/');

  if (normalized.startsWith(UPLOADS_PUBLIC_PREFIX)) {
    return normalized.slice(UPLOADS_PUBLIC_PREFIX.length).replace(/^\/+/, '');
  }

  if (path.isAbsolute(normalized)) {
    const resolved = path.resolve(normalized).replace(/\\/g, '/');

    if (resolved.startsWith(uploadsRoot)) {
      return path.relative(uploadsRoot, resolved).replace(/\\/g, '/');
    }
  }

  return normalized.replace(/^\/+/, '');
}

export function toUploadsPublicUrl(relativePath: string): string {
  const normalized = normalizeRelativeUploadPath(relativePath);
  return `${UPLOADS_PUBLIC_PREFIX}/${normalized}`.replace(/\/+/g, '/');
}

export function resolveUploadAbsolutePath(pathOrUrl: string): string {
  return path.join(getUploadsRootDir(), normalizeRelativeUploadPath(pathOrUrl));
}

function toStoragePathname(value: string): string {
  try {
    if (/^https?:\/\//i.test(value)) {
      return new URL(value).pathname.replace(/\\/g, '/');
    }
  } catch {
    // Fall through to raw path normalization for malformed URLs.
  }

  return value.replace(/\\/g, '/');
}
