import type { TranslationKey, Translator } from "./types.js";

export type LabelKey = TranslationKey | string;

export type LabelKeyMap<Value extends PropertyKey> = Partial<Record<Value, LabelKey>>;

export type TranslatableOption<Value = string> = {
  readonly value: Value;
  readonly labelKey: LabelKey;
  readonly disabled?: boolean;
};

export function createLabelGetter<Value extends PropertyKey>(
  labelKeyMap: LabelKeyMap<Value>,
  t: Translator,
  options?: { fallbackLabel?: string },
): (value: Value) => string {
  return (value) => {
    const labelKey = labelKeyMap[value];

    if (!labelKey) {
      return options?.fallbackLabel ?? "";
    }

    return t(labelKey);
  };
}

export function translateOptions<Option extends TranslatableOption>(
  options: readonly Option[],
  t: Translator,
): Array<Omit<Option, "labelKey"> & { label: string }> {
  return options.map(({ labelKey, ...option }) => ({
    ...option,
    label: t(labelKey),
  }));
}

/*
 * Static data migration pattern:
 *
 * const EVENT_STATUS_LABEL_KEYS = {
 *   DRAFT: "statuses.draft",
 *   PUBLISHED: "statuses.published",
 * } as const;
 *
 * const getEventStatusLabel = createLabelGetter(EVENT_STATUS_LABEL_KEYS, t);
 *
 * const eventStatusOptions = translateOptions(
 *   [
 *     { value: "DRAFT", labelKey: "statuses.draft" },
 *     { value: "PUBLISHED", labelKey: "statuses.published" },
 *   ],
 *   t,
 * );
 *
 * API/internal values such as DRAFT and PUBLISHED stay unchanged.
 * Only display labels are translated through labelKey.
 */
