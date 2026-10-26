import type { TranslationParams } from "./types.js";

const interpolationPattern = /\{([a-zA-Z0-9_]+)\}/g;

export function interpolate(message: string, params?: TranslationParams): string {
  if (!params) {
    return message;
  }

  return message.replace(interpolationPattern, (placeholder, key: string) => {
    if (!Object.prototype.hasOwnProperty.call(params, key)) {
      return placeholder;
    }

    const value = params[key];

    if (value === null || value === undefined) {
      return "";
    }

    return value instanceof Date ? value.toISOString() : String(value);
  });
}
