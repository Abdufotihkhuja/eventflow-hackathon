import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule, OpenAPIObject } from '@nestjs/swagger';

export function buildSwaggerConfig() {
  return new DocumentBuilder()
    .setTitle('EventFlow API')
    .setDescription('API для платформы управления мероприятиями')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
}

export function createSwaggerDocument(app: INestApplication) {
  const document = SwaggerModule.createDocument(app, buildSwaggerConfig());
  return normalizeOperationIds(document);
}

function normalizeOperationIds(document: OpenAPIObject): OpenAPIObject {
  const methods = new Set([
    'get',
    'put',
    'post',
    'delete',
    'options',
    'head',
    'patch',
    'trace',
  ]);

  for (const [path, pathItem] of Object.entries(document.paths)) {
    for (const [method, operation] of Object.entries(pathItem ?? {})) {
      if (!methods.has(method)) {
        continue;
      }

      if (!operation || typeof operation !== 'object') {
        continue;
      }

      operation.operationId = buildOperationId(path, method);
    }
  }

  return document;
}

function buildOperationId(path: string, method: string): string {
  const sanitizedPath = path
    .replace(/^\/+/, '')
    .replace(/[{}]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return `${method}_${sanitizedPath}`;
}
