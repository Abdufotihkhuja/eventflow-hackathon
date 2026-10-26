import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { createSwaggerDocument } from './swagger-document';
import { configureApiRouting } from '../configure-api-routing';

function applyOpenApiExportEnvDefaults() {
  process.env.OPENAPI_EXPORT_MODE = 'true';
  process.env.NODE_ENV ??= 'development';
  process.env.JWT_SECRET ??= 'openapi-export-secret';
  process.env.DATABASE_URL ??=
    'postgresql://prisma:prisma@localhost:5432/prisma?schema=public';
  process.env.INTERNAL_JOB_TOKEN ??= 'openapi-export-internal-job-token';
  process.env.METRICS_INTERNAL_TOKEN ??=
    'openapi-export-internal-metrics-token';
  process.env.FRONTEND_APP_URL ??= 'http://app.localhost';
  process.env.FRONTEND_PUBLIC_URL ??= 'http://web.localhost';
}

async function exportOpenApi() {
  const logger = new Logger('OpenApiExport');
  applyOpenApiExportEnvDefaults();
  const outputPath = resolve(
    process.cwd(),
    process.argv[2] ??
      '../../packages/api-contracts/openapi/eventflow.openapi.json',
  );

  const app = await NestFactory.create(AppModule, {
    logger: false,
  });

  try {
    configureApiRouting(app);
    await app.init();

    const document = createSwaggerDocument(app);
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, JSON.stringify(document, null, 2), 'utf8');

    logger.log(`OpenAPI document exported to ${outputPath}`);
  } finally {
    await app.close();
  }
}

void exportOpenApi();
