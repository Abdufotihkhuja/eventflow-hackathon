import path from 'path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname, '../..'),
  transpilePackages: ['@eventflow/i18n'],
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias ?? {}),
      '.js': ['.ts', '.tsx', '.js'],
      '.mjs': ['.mts', '.mjs'],
    };
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      '@eventflow/i18n$': path.join(__dirname, '../../packages/i18n/src/index.ts'),
      '@eventflow/i18n/react': path.join(
        __dirname,
        '../../packages/i18n/src/react/index.ts'
      ),
      '@eventflow/i18n/next': path.join(
        __dirname,
        '../../packages/i18n/src/next/index.ts'
      ),
    };

    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'eventflow.uz',
        pathname: '/uploads/**',
      },
      // Пользовательский контент (события, материалы): любые внешние ссылки
      { protocol: 'https', hostname: '**', pathname: '/**' },
      { protocol: 'http', hostname: '**', pathname: '/**' },
    ],
  },
  // Lint проверяется отдельно в CI, не блокирует build
  eslint: {
    ignoreDuringBuilds: true,
  },
  // TypeScript ошибки проверяются отдельно через type-check
  typescript: {
    ignoreBuildErrors: false,
  },
  /**
   * Dev-only proxy: forward `/api/*` to the api container at localhost:3000
   * so the dev preview server keeps requests same-origin (no CORS).
   * In production, nginx handles this via its upstream config.
   */
  async rewrites() {
    if (process.env.NODE_ENV === 'production') return [];
    const target =
      process.env.NEXT_PUBLIC_API_URL_INTERNAL || 'http://localhost:3000';
    return [
      // Handle the duplicate `/api/api/` produced when API_BASE_URL=/api
      {
        source: '/api/api/:path*',
        destination: `${target}/api/:path*`,
      },
      // Standard mapping
      {
        source: '/api/:path*',
        destination: `${target}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
