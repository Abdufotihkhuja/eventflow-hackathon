const interpolationPattern = /\{([a-zA-Z0-9_]+)\}/g;
export function interpolate(message, params) {
    if (!params) {
        return message;
    }
    return message.replace(interpolationPattern, (placeholder, key) => {
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
//# sourceMappingURL=interpolation.js.map