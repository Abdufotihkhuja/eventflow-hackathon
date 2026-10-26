export function normalizeOptionalPhone(value: unknown): unknown {
  if (value === null || value === undefined) return undefined;
  if (typeof value !== 'string') return value;

  const normalized = value.trim().replace(/[\s()-]/g, '');
  return normalized || undefined;
}
