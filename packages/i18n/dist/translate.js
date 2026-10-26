import { fallbackLocale, normalizeLocale } from "./config.js";
import { interpolate } from "./interpolation.js";
import { messagesByLocale } from "./locales.js";
function getMessageValue(messages, key) {
    const segments = key.split(".");
    let current = messages;
    for (const segment of segments) {
        if (!current || typeof current !== "object" || !(segment in current)) {
            return null;
        }
        current = current[segment];
    }
    return typeof current === "string" ? current : null;
}
function isDevelopmentRuntime() {
    const nodeEnv = globalThis.process?.env
        ?.NODE_ENV;
    return nodeEnv !== "production";
}
function humanizeMissingKey(key) {
    const lastSegment = key.split(".").at(-1) ?? "";
    const spaced = lastSegment
        .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
        .replace(/[_-]+/g, " ")
        .trim();
    if (!spaced) {
        return "";
    }
    return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
export function createTranslator(locale, messages = messagesByLocale, options) {
    const normalizedLocale = normalizeLocale(locale) ?? fallbackLocale;
    return (key, params) => {
        const localeMessages = messages[normalizedLocale] ?? messages[fallbackLocale];
        const message = getMessageValue(localeMessages, key) ??
            getMessageValue(messages[fallbackLocale], key) ??
            null;
        if (message) {
            return interpolate(message, params);
        }
        if (options?.missingMessage) {
            return interpolate(options.missingMessage, { key, ...params });
        }
        return isDevelopmentRuntime() ? `[missing translation: ${key}]` : humanizeMissingKey(key);
    };
}
export const t = createTranslator(fallbackLocale);
//# sourceMappingURL=translate.js.map