export function createLabelGetter(labelKeyMap, t, options) {
    return (value) => {
        const labelKey = labelKeyMap[value];
        if (!labelKey) {
            return options?.fallbackLabel ?? "";
        }
        return t(labelKey);
    };
}
export function translateOptions(options, t) {
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
//# sourceMappingURL=static-data.js.map