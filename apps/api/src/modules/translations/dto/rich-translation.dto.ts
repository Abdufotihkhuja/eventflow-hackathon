import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';
import { BlockNoteUtil } from '../../../common/utils/blocknote.util';

const ALLOWED_LOCALES = ['ru', 'uz', 'en'] as const;
const ALLOWED_META_STATUSES = [
  'empty',
  'manual',
  'auto_translated',
  'edited_after_translation',
  'outdated',
  'translation_error',
] as const;
const ALLOWED_META_KEYS = [
  'status',
  'sourceLocale',
  'sourceHash',
  'structureHash',
  'provider',
  'model',
  'translatedAt',
  'error',
] as const;

type PlainRecord = Record<string, unknown>;

export type RichTranslations = Record<string, Partial<Record<string, unknown>>>;
export type RichTranslationMeta = Record<string, Record<string, PlainRecord>>;

export class RichTranslationsDoc {
  @ApiPropertyOptional({
    description:
      'Rich BlockNote translations keyed by field and locale. Locale keys: ru, uz, en.',
    example: {
      description: {
        ru: [
          {
            id: 'block-1',
            type: 'paragraph',
            content: [{ type: 'text', text: 'Описание', styles: {} }],
            children: [],
          },
        ],
      },
    },
    additionalProperties: true,
  })
  richTranslations?: RichTranslations;

  @ApiPropertyOptional({
    description: 'Rich translation metadata keyed by field and locale.',
    example: {
      description: {
        ru: { status: 'manual' },
        uz: { status: 'auto_translated', sourceLocale: 'ru' },
      },
    },
    additionalProperties: true,
  })
  richTranslationMeta?: RichTranslationMeta;
}

export function IsRichTranslations(
  fieldKeys: readonly string[],
  validationOptions?: ValidationOptions,
) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'isRichTranslations',
      target: object.constructor,
      propertyName,
      constraints: [fieldKeys],
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          return isRichTranslationsShape(
            value,
            args.constraints[0] as readonly string[],
          );
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} may only contain known fields, ru/uz/en locales, and valid BlockNote documents`;
        },
      },
    });
  };
}

export function IsRichTranslationMeta(
  fieldKeys: readonly string[],
  validationOptions?: ValidationOptions,
) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'isRichTranslationMeta',
      target: object.constructor,
      propertyName,
      constraints: [fieldKeys],
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          return isRichTranslationMetaShape(
            value,
            args.constraints[0] as readonly string[],
          );
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} may only contain known fields, ru/uz/en locales, and known statuses`;
        },
      },
    });
  };
}

export function normalizeRichTranslations(
  value: RichTranslations | undefined,
): RichTranslations | undefined {
  if (value === undefined) return undefined;

  const normalized: RichTranslations = {};
  for (const [fieldKey, localeDocs] of Object.entries(value)) {
    normalized[fieldKey] = {};
    for (const [locale, document] of Object.entries(localeDocs ?? {})) {
      normalized[fieldKey][locale] = BlockNoteUtil.normalizeDocument(
        document as any[],
      );
    }
  }

  return normalized;
}

function isRichTranslationsShape(
  value: unknown,
  fieldKeys: readonly string[],
): value is RichTranslations {
  if (value === undefined || value === null) return true;
  if (!isPlainRecord(value)) return false;

  for (const [fieldKey, localeValues] of Object.entries(value)) {
    if (!fieldKeys.includes(fieldKey) || !isPlainRecord(localeValues)) {
      return false;
    }

    for (const [locale, document] of Object.entries(localeValues)) {
      if (!ALLOWED_LOCALES.includes(locale as (typeof ALLOWED_LOCALES)[number])) {
        return false;
      }
      const normalized = BlockNoteUtil.normalizeDocument(document as any[]);
      if (!BlockNoteUtil.isValid(normalized)) {
        return false;
      }
    }
  }

  return true;
}

function isRichTranslationMetaShape(
  value: unknown,
  fieldKeys: readonly string[],
): value is RichTranslationMeta {
  if (value === undefined || value === null) return true;
  if (!isPlainRecord(value)) return false;

  for (const [fieldKey, localeMeta] of Object.entries(value)) {
    if (!fieldKeys.includes(fieldKey) || !isPlainRecord(localeMeta)) {
      return false;
    }

    for (const [locale, meta] of Object.entries(localeMeta)) {
      if (!ALLOWED_LOCALES.includes(locale as (typeof ALLOWED_LOCALES)[number])) {
        return false;
      }
      if (!isPlainRecord(meta)) {
        return false;
      }
      if (
        Object.keys(meta).some(
          (key) =>
            !ALLOWED_META_KEYS.includes(
              key as (typeof ALLOWED_META_KEYS)[number],
            ),
        )
      ) {
        return false;
      }
      const status = meta.status;
      if (
        typeof status !== 'string' ||
        !ALLOWED_META_STATUSES.includes(
          status as (typeof ALLOWED_META_STATUSES)[number],
        )
      ) {
        return false;
      }
      if (
        meta.sourceLocale !== undefined &&
        !ALLOWED_LOCALES.includes(
          meta.sourceLocale as (typeof ALLOWED_LOCALES)[number],
        )
      ) {
        return false;
      }
      if (
        (meta.sourceHash !== undefined && typeof meta.sourceHash !== 'string') ||
        (meta.structureHash !== undefined &&
          typeof meta.structureHash !== 'string') ||
        (meta.provider !== undefined && meta.provider !== 'tahrirchi') ||
        (meta.model !== undefined && typeof meta.model !== 'string') ||
        (meta.translatedAt !== undefined &&
          typeof meta.translatedAt !== 'string') ||
        (meta.error !== undefined &&
          meta.error !== null &&
          typeof meta.error !== 'string')
      ) {
        return false;
      }
    }
  }

  return true;
}

function isPlainRecord(value: unknown): value is PlainRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
