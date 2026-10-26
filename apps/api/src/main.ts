import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { requestContextMiddleware } from './common/middleware/request-context.middleware';
import { installBigIntJsonSerialization } from './common/money/bigint-json';
import { createSwaggerDocument } from './openapi/swagger-document';
import { configureApiRouting } from './configure-api-routing';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  // Деньги (D-3): BigInt-колонки Prisma сериализуются в JSON строкой,
  // иначе первый же денежный эндпоинт упадёт на JSON.stringify.
  installBigIntJsonSerialization();
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const configService = app.get(ConfigService);

  // За nginx (X-Forwarded-For). Без этого Express видит у всех запросов один
  // IP прокси, и rate-limit (ThrottlerGuard по req.ip) считается ГЛОБАЛЬНО на
  // всю платформу — 5 логинов/3 регистрации в минуту на всех, что блокирует
  // вход и регистрацию у всех пользователей. С trust proxy req.ip = реальный
  // IP клиента (левый элемент X-Forwarded-For), и лимит работает по пользователю.
  //
  // ВАЖНО: доверяем РОВНО стольким прокси, сколько их перед API (по умолчанию 1
  // — nginx). `true` доверяет всей цепочке X-Forwarded-For, позволяя клиенту
  // подделать req.ip и обойти rate-limit/логирование. TRUST_PROXY_HOPS меняет
  // число доверенных прокси при изменении топологии (например, LB + nginx => 2).
  const trustProxyHops = Number(
    configService.get<string>('TRUST_PROXY_HOPS') ?? '1',
  );
  app.set('trust proxy', Number.isFinite(trustProxyHops) ? trustProxyHops : 1);
  const nodeEnv = configService.get<string>('NODE_ENV') || 'development';
  const isProduction = nodeEnv === 'production';
  // Swagger UI требует 'unsafe-inline'/'unsafe-eval'. Он поднимается только вне
  // production (или при SWAGGER_ENABLED). Поэтому релакс CSP включаем только
  // когда Swagger реально обслуживается — в проде CSP строгий.
  const swaggerEnabled =
    configService.get<string>('SWAGGER_ENABLED') === 'true' || !isProduction;

  // Безопасность
  app.use(
    helmet({
      crossOriginResourcePolicy: {
        policy: 'cross-origin',
      },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: swaggerEnabled
            ? ["'self'", "'unsafe-inline'", "'unsafe-eval'"]
            : ["'self'"],
          imgSrc: ["'self'", 'data:', 'validator.swagger.io'],
        },
      },
    }),
  );
  app.use(requestContextMiddleware);

  // CORS - требуем явную конфигурацию в production.
  // Поддерживаются wildcard-паттерны через `*` (например
  // "http://localhost:*", "http://*.localhost", "http://127.0.0.1:*").
  const corsOrigins = configService.get<string>('CORS_ORIGINS');
  if (isProduction && !corsOrigins) {
    throw new Error(
      'CORS_ORIGINS must be configured in production environment',
    );
  }
  const corsMatchers = corsOrigins
    ? corsOrigins
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean)
        .map((pattern) => {
          if (!pattern.includes('*')) {
            return (origin: string) => origin === pattern;
          }
          // Экранируем regex-метасимволы, кроме `*`, затем `*` -> `.*`.
          const escaped = pattern
            .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
            .replace(/\*/g, '.*');
          const re = new RegExp(`^${escaped}$`);
          return (origin: string) => re.test(origin);
        })
    : null;
  type CorsOriginCallback = (err: Error | null, allow?: boolean) => void;
  app.enableCors({
    origin: corsMatchers
      ? (origin: string | undefined, cb: CorsOriginCallback) => {
          // Same-origin / curl / server-to-server (no Origin header) — пускаем.
          if (!origin) return cb(null, true);
          const allowed = corsMatchers.some((match) => match(origin));
          if (allowed) return cb(null, true);
          return cb(new Error(`CORS: origin ${origin} not allowed`), false);
        }
      : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'X-EventFlow-Scope',
      'X-EventFlow-Elevation',
      'X-CSRF-Token',
    ],
  });

  // Валидация
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Префикс API
  configureApiRouting(app);

  // Swagger — только вне production (swaggerEnabled вычислен выше). В проде
  // полная схема API не публикуется без аутентификации (разведывательный вектор).
  if (swaggerEnabled) {
    const document = createSwaggerDocument(app);
    SwaggerModule.setup('api/docs', app, document, {
      jsonDocumentUrl: 'api/docs.json',
    });
  }

  const port = configService.get<number>('PORT') || 3000;
  await app.listen(port);

  logger.log(`Application started on port ${port} [${nodeEnv}]`);
  if (swaggerEnabled) {
    logger.log(`Swagger available at: http://localhost:${port}/api/docs`);
    logger.log(
      `OpenAPI JSON available at: http://localhost:${port}/api/docs.json`,
    );
  }
}

void bootstrap();
