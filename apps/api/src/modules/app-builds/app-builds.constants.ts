import { AppBuildPlatform } from '@prisma/client';

/**
 * Whitelist + limits for internal mobile app build artifacts (team testing
 * distribution via the super-admin panel).
 *
 * The extension whitelist is the authoritative gate: stored filenames are
 * regenerated (uuid + safe ext) and served with
 * `Content-Disposition: attachment`, so an uploaded file is never served
 * inline. Client MIME is checked as defence-in-depth only.
 */

/** Extension (lowercase, leading dot) -> acceptable MIME types. */
export const ALLOWED_APP_BUILD_TYPES: Readonly<
  Record<string, readonly string[]>
> = {
  '.apk': [
    'application/vnd.android.package-archive',
    'application/octet-stream',
  ],
  '.aab': ['application/octet-stream', 'application/x-authorware-bin'],
  '.ipa': [
    'application/octet-stream',
    'application/x-itunes-ipa',
    'application/zip',
  ],
} as const;

/** Which extensions are valid for each platform. */
export const PLATFORM_EXTENSIONS: Readonly<
  Record<AppBuildPlatform, readonly string[]>
> = {
  [AppBuildPlatform.ANDROID]: ['.apk', '.aab'],
  [AppBuildPlatform.IOS]: ['.ipa'],
} as const;

/** Hard ceiling for a single build artifact (MB). */
export const MAX_APP_BUILD_SIZE_MB = 400;

export const MB = 1024 * 1024;
