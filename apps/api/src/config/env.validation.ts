const PRODUCTION_ONLY_REQUIRED_VARS = [
  'DATABASE_URL',
  'REDIS_URL',
  'JWT_SECRET',
  'CORS_ORIGINS',
  'INTERNAL_JOB_TOKEN',
  'METRICS_INTERNAL_TOKEN',
  'TAHRIRCHI_TOKEN',
  'FRONTEND_APP_URL',
  'FRONTEND_ADMIN_URL',
  'FRONTEND_PUBLIC_URL',
  'TICKET_QR_SECRET',
] as const;

const KNOWN_INSECURE_DEFAULTS: Record<string, string[]> = {
  JWT_SECRET: [
    'dev-secret-change-me',
    'super-secret-key-change-in-production',
    'default-secret',
    'replace-with-long-random-jwt-secret',
  ],
  INTERNAL_JOB_TOKEN: [
    'eventflow-internal-job-token',
    'replace-with-long-random-internal-job-token',
  ],
  METRICS_INTERNAL_TOKEN: [
    'eventflow-internal-metrics-token',
    'eventflow-internal-job-token',
    'replace-with-long-random-internal-metrics-token',
  ],
  TICKET_QR_SECRET: [
    'ЗАМЕНИТЕ_НА_СЛУЧАЙНУЮ_СТРОКУ_64_СИМВОЛА_HMAC_TICKET_QR',
    'replace-with-long-random-ticket-qr-secret',
    'dev-ticket-qr-secret',
  ],
};

export function validateEnvironment(
  rawEnv: Record<string, unknown>,
): Record<string, unknown> {
  const env = { ...rawEnv };
  const nodeEnv =
    typeof env.NODE_ENV === 'string' ? env.NODE_ENV : 'development';

  if (nodeEnv !== 'production') {
    return env;
  }

  const errors: string[] = [];

  for (const variable of PRODUCTION_ONLY_REQUIRED_VARS) {
    if (!isMeaningfulString(env[variable])) {
      errors.push(`${variable} must be set in production`);
    }
  }

  for (const [variable, disallowedValues] of Object.entries(
    KNOWN_INSECURE_DEFAULTS,
  )) {
    const value = getStringValue(env[variable]);
    if (disallowedValues.includes(value)) {
      errors.push(`${variable} uses a known insecure default value`);
    }
  }

  validateProductionUrl(env.FRONTEND_APP_URL, 'FRONTEND_APP_URL', errors);
  validateProductionUrl(env.FRONTEND_ADMIN_URL, 'FRONTEND_ADMIN_URL', errors);
  validateProductionUrl(env.FRONTEND_PUBLIC_URL, 'FRONTEND_PUBLIC_URL', errors);

  if (isMeaningfulString(env.FRONTEND_URL)) {
    errors.push(
      'FRONTEND_URL is no longer supported in production; use FRONTEND_APP_URL, FRONTEND_PUBLIC_URL, and FRONTEND_ADMIN_URL',
    );
  }

  validateOAuthConfig(env, 'GOOGLE', errors);
  validateOAuthConfig(env, 'LINKEDIN', errors);
  validateViaConfig(env, errors);

  if (errors.length > 0) {
    throw new Error(
      `Production environment validation failed:\n- ${errors.join('\n- ')}`,
    );
  }

  return env;
}

function validateOAuthConfig(
  env: Record<string, unknown>,
  provider: 'GOOGLE' | 'LINKEDIN',
  errors: string[],
): void {
  const clientId = env[`${provider}_CLIENT_ID`];
  const clientSecret = env[`${provider}_CLIENT_SECRET`];
  const callbackUrl = env[`${provider}_CALLBACK_URL`];

  const providerEnabled =
    isMeaningfulString(clientId) || isMeaningfulString(clientSecret);

  if (!providerEnabled) {
    return;
  }

  if (!isMeaningfulString(clientId) || !isMeaningfulString(clientSecret)) {
    errors.push(
      `${provider}_CLIENT_ID and ${provider}_CLIENT_SECRET must both be set when ${provider} OAuth is enabled`,
    );
  }

  if (!isMeaningfulString(callbackUrl)) {
    errors.push(
      `${provider}_CALLBACK_URL must be set when ${provider} OAuth is enabled`,
    );
    return;
  }

  validateProductionUrl(callbackUrl, `${provider}_CALLBACK_URL`, errors);
}

/**
 * VIA-платежи: провайдер опционален, но полу-конфигурация в проде опасна —
 * либо все креды на месте, либо ни одной. VIA_API_BASE_URL, если задан,
 * обязан быть HTTPS (client-secret ходит в заголовке каждого запроса).
 */
function validateViaConfig(
  env: Record<string, unknown>,
  errors: string[],
): void {
  const parts = ['VIA_CLIENT_ID', 'VIA_CLIENT_SECRET', 'VIA_MERCHANT_ID'];
  const present = parts.filter((key) => isMeaningfulString(env[key]));
  if (present.length > 0 && present.length < parts.length) {
    errors.push(
      `VIA payments are partially configured: set all of ${parts.join(', ')} or none`,
    );
  }

  // Токен endpoint'а уведомлений — единственная защита неподписанных колбэков
  // VIA, короткий токен подбираем перебором.
  const webhookToken = getStringValue(env.VIA_WEBHOOK_TOKEN);
  if (webhookToken && webhookToken.length < 32) {
    errors.push('VIA_WEBHOOK_TOKEN must be at least 32 characters in production');
  }

  const baseUrl = env.VIA_API_BASE_URL;
  if (isMeaningfulString(baseUrl)) {
    validateProductionUrl(baseUrl, 'VIA_API_BASE_URL', errors);
    try {
      if (new URL(String(baseUrl)).protocol !== 'https:') {
        errors.push('VIA_API_BASE_URL must use https in production');
      }
    } catch {
      // Невалидный URL уже зафиксирован validateProductionUrl.
    }
  }
}

function validateProductionUrl(
  candidate: unknown,
  variable: string,
  errors: string[],
): void {
  if (!isMeaningfulString(candidate)) {
    return;
  }

  try {
    const url = new URL(String(candidate));
    const hostname = url.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname.endsWith('.localhost')
    ) {
      errors.push(`${variable} cannot use a localhost-style URL in production`);
    }
  } catch {
    errors.push(`${variable} must be a valid absolute URL`);
  }
}

function isMeaningfulString(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function getStringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}
