import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

const ALLOWED_LOCALES = ['ru', 'uz', 'en'] as const;
const ALLOWED_META_STATUSES = [
  'empty',
  'manual',
  'auto_translated',
  'edited_after_translation',
  'outdated',
  'translation_error',
] as const;

type PlainRecord = Record<string, unknown>;

export type BusinessTranslations = Record<string, Partial<Record<string, string>>>;
export type BusinessTranslationMeta = Record<string, Record<string, PlainRecord>>;

export class BusinessTranslationsDoc {
  @ApiPropertyOptional({
    description: 'Plain-text business field translations. Keys are limited to ru, uz, en.',
    example: {
      name: { ru: 'Конференция', uz: 'Konferensiya', en: 'Conference' },
    },
    additionalProperties: true,
  })
  translations?: BusinessTranslations;

  @ApiPropertyOptional({
    description: 'Translation metadata keyed by field and locale.',
    example: {
      name: {
        ru: { status: 'manual' },
        uz: { status: 'auto_translated', sourceLocale: 'ru' },
      },
    },
    additionalProperties: true,
  })
  translationMeta?: BusinessTranslationMeta;
}

export function IsBusinessTranslations(
  fieldKeys: readonly string[],
  validationOptions?: ValidationOptions,
) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'isBusinessTranslations',
      target: object.constructor,
      propertyName,
      constraints: [fieldKeys],
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          return isTranslationsShape(value, args.constraints[0] as readonly string[]);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} may only contain known fields and ru/uz/en string values`;
        },
      },
    });
  };
}

export function IsBusinessTranslationMeta(
  fieldKeys: readonly string[],
  validationOptions?: ValidationOptions,
) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'isBusinessTranslationMeta',
      target: object.constructor,
      propertyName,
      constraints: [fieldKeys],
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          return isTranslationMetaShape(value, args.constraints[0] as readonly string[]);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} may only contain known fields, ru/uz/en locales, and known statuses`;
        },
      },
    });
  };
}

export function pickFallbackTranslation(
  translations: BusinessTranslations | undefined,
  fieldKey: string,
  fallback?: string | null,
): string {
  const field = translations?.[fieldKey];
  for (const locale of ALLOWED_LOCALES) {
    const value = field?.[locale];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return fallback?.trim() ?? '';
}

function isTranslationsShape(
  value: unknown,
  fieldKeys: readonly string[],
): value is BusinessTranslations {
  if (value === undefined || value === null) return true;
  if (!isPlainRecord(value)) return false;

  for (const [fieldKey, localeValues] of Object.entries(value)) {
    if (!fieldKeys.includes(fieldKey) || !isPlainRecord(localeValues)) {
      return false;
    }

    for (const [locale, text] of Object.entries(localeValues)) {
      if (!ALLOWED_LOCALES.includes(locale as (typeof ALLOWED_LOCALES)[number])) {
        return false;
      }
      if (typeof text !== 'string') {
        return false;
      }
    }
  }

  return true;
}

function isTranslationMetaShape(
  value: unknown,
  fieldKeys: readonly string[],
): value is BusinessTranslationMeta {
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
      const status = meta.status;
      if (
        typeof status !== 'string' ||
        !ALLOWED_META_STATUSES.includes(
          status as (typeof ALLOWED_META_STATUSES)[number],
        )
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
