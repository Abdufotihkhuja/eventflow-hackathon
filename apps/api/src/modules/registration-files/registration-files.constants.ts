/**
 * Shared whitelist + limits for the FILE_UPLOAD registration question type.
 *
 * The extension whitelist is the authoritative gate: stored filenames are
 * always regenerated (uuid + safe ext) and served with
 * `Content-Disposition: attachment` + `application/octet-stream`, so an
 * uploaded file is never executed/served inline. We additionally check the
 * client MIME against a known set as defence-in-depth (never the sole gate,
 * per security requirements).
 */

/** Extension (lowercase, leading dot) -> acceptable MIME types. */
export const ALLOWED_REGISTRATION_FILE_TYPES: Readonly<
  Record<string, readonly string[]>
> = {
  '.pdf': ['application/pdf'],
  '.doc': ['application/msword'],
  '.docx': [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  '.ppt': ['application/vnd.ms-powerpoint'],
  '.pptx': [
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ],
  '.xls': ['application/vnd.ms-excel'],
  '.xlsx': [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
  '.png': ['image/png'],
  '.jpg': ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.zip': [
    'application/zip',
    'application/x-zip-compressed',
    'application/octet-stream',
  ],
} as const;

export const ALLOWED_REGISTRATION_FILE_EXTENSIONS = Object.freeze(
  Object.keys(ALLOWED_REGISTRATION_FILE_TYPES),
);

/** Default per-question allowed extensions when the organizer picks none. */
export const DEFAULT_ALLOWED_FILE_TYPES =
  ALLOWED_REGISTRATION_FILE_EXTENSIONS.slice();

/** Default per-file size limit (MB). */
export const DEFAULT_MAX_FILE_SIZE_MB = 10;

/** Allowed per-file size choices offered to organizers (MB). */
export const ALLOWED_MAX_FILE_SIZE_MB = [1, 5, 10, 20] as const;

/** Hard ceiling for any single file, regardless of organizer config (MB). */
export const HARD_MAX_FILE_SIZE_MB = 20;

/** Hard ceiling for the number of files per file-upload question. */
export const HARD_MAX_FILES = 10;

/** Default file count when multiple files are not enabled. */
export const DEFAULT_MAX_FILES = 1;

export const MB = 1024 * 1024;

/**
 * Сколько живёт черновик регистрации (файлы, загруженные без отправки формы).
 * Совпадает с TTL сохранённых ответов в localStorage web-public: после этого
 * срока «продолжить» уже нечего, и файлы удаляет фоновая уборка.
 */
export const DRAFT_TTL_HOURS = 7 * 24;

/** Сколько брошенных файлов чистим за один прогон уборки. */
export const DRAFT_SWEEP_BATCH_SIZE = 500;

/** Resolved, validated runtime shape of `RegistrationQuestion.fileUploadConfig`. */
export interface ResolvedFileUploadConfig {
  description: string | null;
  template: {
    url: string;
    name: string;
    size: number;
    mimeType: string;
  } | null;
  maxFileSizeMb: number;
  allowedFileTypes: string[];
  allowMultipleFiles: boolean;
  maxFiles: number;
}

/**
 * Normalise a stored/raw `fileUploadConfig` JSON blob into a safe runtime
 * shape with all defaults applied. Tolerant of nulls/legacy/partial data.
 */
export function resolveFileUploadConfig(
  raw: unknown,
): ResolvedFileUploadConfig {
  const obj =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};

  const allowMultipleFiles = obj.allowMultipleFiles === true;

  const rawAllowed = Array.isArray(obj.allowedFileTypes)
    ? (obj.allowedFileTypes as unknown[])
        .map((v) => (typeof v === 'string' ? v.toLowerCase().trim() : ''))
        .filter((v) => ALLOWED_REGISTRATION_FILE_EXTENSIONS.includes(v))
    : [];
  const allowedFileTypes =
    rawAllowed.length > 0 ? Array.from(new Set(rawAllowed)) : DEFAULT_ALLOWED_FILE_TYPES.slice();

  let maxFileSizeMb =
    typeof obj.maxFileSizeMb === 'number' && Number.isFinite(obj.maxFileSizeMb)
      ? Math.floor(obj.maxFileSizeMb)
      : DEFAULT_MAX_FILE_SIZE_MB;
  if (maxFileSizeMb < 1) maxFileSizeMb = 1;
  if (maxFileSizeMb > HARD_MAX_FILE_SIZE_MB) maxFileSizeMb = HARD_MAX_FILE_SIZE_MB;

  let maxFiles = DEFAULT_MAX_FILES;
  if (allowMultipleFiles) {
    maxFiles =
      typeof obj.maxFiles === 'number' && Number.isFinite(obj.maxFiles)
        ? Math.floor(obj.maxFiles)
        : HARD_MAX_FILES;
    if (maxFiles < 1) maxFiles = 1;
    if (maxFiles > HARD_MAX_FILES) maxFiles = HARD_MAX_FILES;
  }

  const description =
    typeof obj.description === 'string' && obj.description.trim()
      ? obj.description.trim()
      : null;

  let template: ResolvedFileUploadConfig['template'] = null;
  if (obj.template && typeof obj.template === 'object' && !Array.isArray(obj.template)) {
    const t = obj.template as Record<string, unknown>;
    if (typeof t.url === 'string' && t.url) {
      template = {
        url: t.url,
        name: typeof t.name === 'string' ? t.name : 'template',
        size: typeof t.size === 'number' ? t.size : 0,
        mimeType: typeof t.mimeType === 'string' ? t.mimeType : 'application/octet-stream',
      };
    }
  }

  return {
    description,
    template,
    maxFileSizeMb,
    allowedFileTypes,
    allowMultipleFiles,
    maxFiles,
  };
}
