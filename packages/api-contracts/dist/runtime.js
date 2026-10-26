export function unwrapApiPayload(payload) {
    if (typeof payload === 'object' && payload !== null && 'data' in payload) {
        const maybeEnvelope = payload;
        if ('total' in maybeEnvelope ||
            'page' in maybeEnvelope ||
            'totalPages' in maybeEnvelope ||
            'limit' in maybeEnvelope) {
            return payload;
        }
        return maybeEnvelope.data;
    }
    return payload;
}
//# sourceMappingURL=runtime.js.map