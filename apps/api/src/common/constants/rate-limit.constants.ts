export const PUBLIC_READ_THROTTLE = {
  default: {
    ttl: 60_000,
    limit: 600,
  },
} as const;
