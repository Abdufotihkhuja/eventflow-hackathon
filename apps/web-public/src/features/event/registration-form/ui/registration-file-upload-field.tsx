"use client";

import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";

import { useT } from "@eventflow/i18n/react";
import { Download, FileUp, Loader2, Paperclip, X } from "lucide-react";

import { registrationService } from "@shared/api/registrationService";
import { ApiError } from "@shared/lib";
import { resolveMediaUrl } from "@shared/lib/utils";

import type { RegistrationQuestionPublic } from "@shared/api/publicCatalogService";

interface UploadedDescriptor {
  id: string;
  name: string;
  size: number;
}

const DEFAULT_MAX_FILE_SIZE_MB = 10;
const DEFAULT_MAX_FILES = 1;

function parseValue(value: string): UploadedDescriptor[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (f): f is UploadedDescriptor =>
          !!f &&
          typeof f === "object" &&
          typeof (f as UploadedDescriptor).id === "string",
      )
      .map((f) => ({
        id: f.id,
        name: typeof f.name === "string" ? f.name : "file",
        size: typeof f.size === "number" ? f.size : 0,
      }));
  } catch {
    return [];
  }
}

function formatBytes(bytes: number): string {
  if (!bytes) return "0 KB";
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.max(1, Math.round(kb))} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export interface RegistrationFileUploadFieldProps {
  eventId: string;
  question: RegistrationQuestionPublic;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

/* eslint-disable complexity, max-lines-per-function -- self-contained upload widget with many states */
export function RegistrationFileUploadField({
  eventId,
  question,
  value,
  onChange,
  disabled,
}: RegistrationFileUploadFieldProps): ReactNode {
  const t = useT();
  const config = question.fileUploadConfig ?? null;
  const maxFileSizeMb = config?.maxFileSizeMb ?? DEFAULT_MAX_FILE_SIZE_MB;
  const allowMultiple = config?.allowMultipleFiles ?? false;
  const maxFiles = allowMultiple ? (config?.maxFiles ?? DEFAULT_MAX_FILES) : 1;
  const allowedFileTypes = useMemo(
    () => config?.allowedFileTypes ?? [],
    [config],
  );

  const files = useMemo(() => parseValue(value), [value]);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const commit = useCallback(
    (next: UploadedDescriptor[]): void => {
      onChange(next.length > 0 ? JSON.stringify(next) : "");
    },
    [onChange],
  );

  const validateLocal = useCallback(
    (file: File): string | null => {
      const lower = file.name.toLowerCase();
      const ext = lower.includes(".")
        ? lower.slice(lower.lastIndexOf("."))
        : "";
      if (
        allowedFileTypes.length > 0 &&
        (!ext || !allowedFileTypes.includes(ext))
      ) {
        return t("public.events.registration.fileUpload.invalidType");
      }
      if (file.size > maxFileSizeMb * 1024 * 1024) {
        return t("public.events.registration.fileUpload.tooLarge");
      }
      return null;
    },
    [allowedFileTypes, maxFileSizeMb, t],
  );

  const handleFiles = useCallback(
    async (fileList: FileList | null): Promise<void> => {
      if (!fileList || fileList.length === 0) return;
      setError(null);

      const incoming = Array.from(fileList);
      let current = parseValue(value);

      if (current.length + incoming.length > maxFiles) {
        setError(t("public.events.registration.fileUpload.tooMany"));
        return;
      }

      setUploading(true);
      try {
        for (const file of incoming) {
          const localError = validateLocal(file);
          if (localError) {
            setError(localError);
            continue;
          }
          try {
            const uploaded = await registrationService.uploadAnswerFile(
              eventId,
              question.id,
              file,
            );
            current = [
              ...current,
              {
                id: uploaded.id,
                name: uploaded.originalName,
                size: uploaded.size,
              },
            ];
            commit(current);
          } catch (e) {
            const message =
              e instanceof ApiError && e.message
                ? e.message
                : t("public.events.registration.fileUpload.uploadError");
            setError(message);
          }
        }
      } finally {
        setUploading(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [value, maxFiles, validateLocal, eventId, question.id, commit, t],
  );

  const handleRemove = useCallback(
    async (id: string): Promise<void> => {
      setError(null);
      const current = parseValue(value);
      // Optimistically drop from UI; best-effort server delete.
      commit(current.filter((f) => f.id !== id));
      try {
        await registrationService.deleteAnswerFile(eventId, id);
      } catch {
        // Pending files are reconciled server-side at submit; ignore.
      }
    },
    [value, commit, eventId],
  );

  const limitReached = files.length >= maxFiles;
  const templateUrl = config?.template?.url
    ? resolveMediaUrl(config.template.url)
    : null;

  const constraints = [
    `${t("public.events.registration.fileUpload.maxSizeShort")} ${maxFileSizeMb} MB`,
    allowedFileTypes.length > 0
      ? allowedFileTypes.join(", ")
      : null,
    allowMultiple
      ? `${t("public.events.registration.fileUpload.maxFilesShort")} ${maxFiles}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="cm-reg-file">
      {config?.description ? (
        <p className="cm-reg-file__desc">{config.description}</p>
      ) : null}

      {templateUrl ? (
        <a
          className="cm-reg-file__template"
          href={templateUrl}
          target="_blank"
          rel="noopener noreferrer"
          download
        >
          <Download size={15} aria-hidden />
          <span>
            {t("public.events.registration.fileUpload.downloadTemplate")}
          </span>
          {config?.template?.name ? (
            <span className="cm-reg-file__template-name">
              {config.template.name}
            </span>
          ) : null}
        </a>
      ) : null}

      {!limitReached ? (
        <button
          type="button"
          className={`cm-reg-file__drop${dragOver ? " is-dragover" : ""}`}
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            void handleFiles(e.dataTransfer.files);
          }}
        >
          {uploading ? (
            <Loader2 className="cm-reg-spinner cm-reg-spinner--sm" aria-hidden />
          ) : (
            <FileUp size={20} aria-hidden />
          )}
          <span className="cm-reg-file__drop-title">
            {uploading
              ? t("public.events.registration.fileUpload.uploading")
              : t("public.events.registration.fileUpload.dropHint")}
          </span>
          {constraints ? (
            <span className="cm-reg-file__drop-hint">{constraints}</span>
          ) : null}
        </button>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        hidden
        multiple={allowMultiple}
        accept={allowedFileTypes.join(",") || undefined}
        disabled={disabled || uploading}
        onChange={(e) => void handleFiles(e.target.files)}
      />

      {files.length > 0 ? (
        <ul className="cm-reg-file__list">
          {files.map((f) => (
            <li key={f.id} className="cm-reg-file__item">
              <Paperclip size={15} aria-hidden className="cm-reg-file__item-icon" />
              <span className="cm-reg-file__item-name">{f.name}</span>
              <span className="cm-reg-file__item-size">
                {formatBytes(f.size)}
              </span>
              <button
                type="button"
                className="cm-reg-file__remove"
                onClick={() => void handleRemove(f.id)}
                disabled={disabled || uploading}
                aria-label={t("public.events.registration.fileUpload.remove")}
              >
                <X size={15} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {error ? (
        <p className="cm-reg-file__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
/* eslint-enable complexity, max-lines-per-function */
