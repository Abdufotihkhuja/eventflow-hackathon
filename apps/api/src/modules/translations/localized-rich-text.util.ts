import type { BlockNoteDocument } from '../../common/types/blocknote.types';
import { BlockNoteUtil } from '../../common/utils/blocknote.util';
import {
  getPublicBusinessLocaleFallbackOrder,
  normalizePublicBusinessLocale,
  type PublicBusinessLocale,
} from './localized-business-field.util';

type RichTranslationValues = Partial<Record<PublicBusinessLocale, unknown>>;

export interface ResolveLocalizedRichTextInput {
  richTranslations: unknown;
  fieldKey: string;
  requestedLocale?: string | null;
  fallbackDocument?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isUsableBlockNoteDocument(
  document: unknown,
): document is BlockNoteDocument {
  return (
    BlockNoteUtil.isValid(document) &&
    !BlockNoteUtil.isEmpty(document)
  );
}

export function resolveLocalizedRichText({
  richTranslations,
  fieldKey,
  requestedLocale,
  fallbackDocument,
}: ResolveLocalizedRichTextInput): BlockNoteDocument | undefined {
  const locale = normalizePublicBusinessLocale(requestedLocale);
  const fieldTranslations = isRecord(richTranslations)
    ? richTranslations[fieldKey]
    : undefined;
  const localeValues: RichTranslationValues = isRecord(fieldTranslations)
    ? fieldTranslations
    : {};

  for (const fallbackLocale of getPublicBusinessLocaleFallbackOrder(locale)) {
    const document = localeValues[fallbackLocale];
    if (isUsableBlockNoteDocument(document)) {
      return document;
    }
  }

  return isUsableBlockNoteDocument(fallbackDocument)
    ? fallbackDocument
    : undefined;
}
