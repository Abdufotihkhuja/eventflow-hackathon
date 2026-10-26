import { validateEnvironment } from './env.validation';

describe('validateEnvironment', () => {
  const validProductionEnv = {
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://eventflow:secret@postgres:5432/eventflow_db',
    REDIS_URL: 'redis://redis:6379',
    JWT_SECRET: 'a-secure-production-jwt-secret-value',
    CORS_ORIGINS: 'https://eventflow.uz,https://app.eventflow.uz',
    INTERNAL_JOB_TOKEN: 'internal-job-token-with-real-entropy',
    METRICS_INTERNAL_TOKEN: 'internal-metrics-token-with-real-entropy',
    TAHRIRCHI_TOKEN: 'tahrirchi-token-with-real-entropy',
    FRONTEND_APP_URL: 'https://app.eventflow.uz',
    FRONTEND_ADMIN_URL: 'https://admin.eventflow.uz',
    FRONTEND_PUBLIC_URL: 'https://eventflow.uz',
    TICKET_QR_SECRET: 'ticket-qr-secret-with-real-entropy-for-tests',
  };

  it('passes for a valid production environment', () => {
    expect(validateEnvironment(validProductionEnv)).toMatchObject(
      validProductionEnv,
    );
  });

  it('fails production startup when a required variable is missing', () => {
    expect(() =>
      validateEnvironment({
        ...validProductionEnv,
        INTERNAL_JOB_TOKEN: '',
      }),
    ).toThrow('INTERNAL_JOB_TOKEN must be set in production');
  });

  it('fails production startup on known insecure defaults', () => {
    expect(() =>
      validateEnvironment({
        ...validProductionEnv,
        JWT_SECRET: 'dev-secret-change-me',
      }),
    ).toThrow('JWT_SECRET uses a known insecure default value');
  });

  it('rejects localhost-style frontend URLs in production', () => {
    expect(() =>
      validateEnvironment({
        ...validProductionEnv,
        FRONTEND_PUBLIC_URL: 'http://localhost:3001',
      }),
    ).toThrow(
      'FRONTEND_PUBLIC_URL cannot use a localhost-style URL in production',
    );
  });

  it('rejects the removed FRONTEND_URL fallback in production', () => {
    expect(() =>
      validateEnvironment({
        ...validProductionEnv,
        FRONTEND_URL: 'https://app.eventflow.uz',
      }),
    ).toThrow(
      'FRONTEND_URL is no longer supported in production; use FRONTEND_APP_URL, FRONTEND_PUBLIC_URL, and FRONTEND_ADMIN_URL',
    );
  });
});
