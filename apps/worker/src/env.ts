const KNOWN_INSECURE_DEFAULTS: Record<string, string[]> = {
  INTERNAL_JOB_TOKEN: [
    'eventflow-internal-job-token',
    'replace-with-long-random-internal-job-token',
  ],
};

export interface WorkerRuntimeConfig {
  redisUrl: string;
  apiInternalUrl: string;
  internalJobToken: string;
  workerHealthPort: number;
  workerProfile: string;
  mailConcurrency: number;
  pushConcurrency: number;
  ticketsConcurrency: number;
  certificatesConcurrency: number;
  badgesConcurrency: number;
}

export function loadWorkerRuntimeConfig(
  env: NodeJS.ProcessEnv,
): WorkerRuntimeConfig {
  const redisUrl = env.REDIS_URL ?? 'redis://127.0.0.1:6379';
  const apiInternalUrl =
    env.API_INTERNAL_URL ?? 'http://127.0.0.1:3000/api/v1/internal/jobs';
  const internalJobToken = env.INTERNAL_JOB_TOKEN ?? '';
  const workerHealthPort = getPositiveInt(env.WORKER_HEALTH_PORT, 3004);
  const workerProfile = env.WORKER_PROFILE ?? 'all';
  const mailConcurrency = getPositiveInt(env.WORKER_MAIL_CONCURRENCY, 4);
  const pushConcurrency = getPositiveInt(env.WORKER_PUSH_CONCURRENCY, 4);
  const ticketsConcurrency = getPositiveInt(env.WORKER_TICKETS_CONCURRENCY, 2);
  const certificatesConcurrency = getPositiveInt(
    env.WORKER_CERTIFICATES_CONCURRENCY,
    1,
  );
  // Рендер бейджей упирается в CPU так же, как сертификаты — держим 1 по умолчанию.
  const badgesConcurrency = getPositiveInt(env.WORKER_BADGES_CONCURRENCY, 1);

  validateWorkerEnvironment(env, {
    redisUrl,
    apiInternalUrl,
    internalJobToken,
  });

  return {
    redisUrl,
    apiInternalUrl,
    internalJobToken,
    workerHealthPort,
    workerProfile,
    mailConcurrency,
    pushConcurrency,
    ticketsConcurrency,
    certificatesConcurrency,
    badgesConcurrency,
  };
}

function validateWorkerEnvironment(
  env: NodeJS.ProcessEnv,
  values: {
    redisUrl: string;
    apiInternalUrl: string;
    internalJobToken: string;
  },
): void {
  if (env.NODE_ENV !== 'production') {
    return;
  }

  const errors: string[] = [];

  if (!values.redisUrl.trim()) {
    errors.push('REDIS_URL must be set in production');
  }

  if (!values.apiInternalUrl.trim()) {
    errors.push('API_INTERNAL_URL must be set in production');
  } else if (isLocalUrl(values.apiInternalUrl)) {
    errors.push('API_INTERNAL_URL cannot use a localhost-style URL in production');
  }

  if (!values.internalJobToken.trim()) {
    errors.push('INTERNAL_JOB_TOKEN must be set in production');
  } else if (
    KNOWN_INSECURE_DEFAULTS.INTERNAL_JOB_TOKEN.includes(values.internalJobToken)
  ) {
    errors.push('INTERNAL_JOB_TOKEN uses a known insecure default value');
  }

  if (errors.length > 0) {
    throw new Error(
      `Worker environment validation failed:\n- ${errors.join('\n- ')}`,
    );
  }
}

function isLocalUrl(candidate: string): boolean {
  try {
    const url = new URL(candidate);
    const hostname = url.hostname.toLowerCase();
    return (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname.endsWith('.localhost')
    );
  } catch {
    return true;
  }
}

function getPositiveInt(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
