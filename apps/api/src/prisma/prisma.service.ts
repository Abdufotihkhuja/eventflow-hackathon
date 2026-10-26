import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { OperationalMetricsService } from '../modules/platform/observability/operational-metrics.service';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);
  private readonly slowQueryThresholdMs: number;
  private readonly connectionDisabled: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly operationalMetricsService: OperationalMetricsService,
  ) {
    const connectionDisabled =
      configService.get<string>('OPENAPI_EXPORT_MODE') === 'true' ||
      process.env.OPENAPI_EXPORT_MODE === 'true';

    const connectionString =
      configService.get<string>('DATABASE_URL') ??
      (connectionDisabled
        ? 'postgresql://prisma:prisma@localhost:5432/prisma?schema=public'
        : undefined);

    if (!connectionString) {
      throw new Error(
        'DATABASE_URL is required when Prisma connections are enabled',
      );
    }

    const adapter = new PrismaPg({ connectionString });

    super({
      adapter,
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'stdout', level: 'info' },
        { emit: 'stdout', level: 'warn' },
        { emit: 'stdout', level: 'error' },
      ],
    });

    this.connectionDisabled = connectionDisabled;

    const configuredThreshold = Number(
      configService.get<string>('DB_SLOW_QUERY_THRESHOLD_MS') ?? '500',
    );
    this.slowQueryThresholdMs =
      Number.isFinite(configuredThreshold) && configuredThreshold > 0
        ? configuredThreshold
        : 500;

    (this as PrismaClient & {
      $on(eventType: 'query', callback: (event: PrismaQueryEvent) => void): void;
    }).$on('query', (event) => this.handleQueryEvent(event));
  }

  async onModuleInit() {
    if (this.connectionDisabled) {
      this.logger.log('Database connection is disabled for OpenAPI export mode');
      return;
    }

    await this.$connect();
    this.logger.log('Database connected');
  }

  /**
   * Graceful shutdown для корректного закрытия соединений
   * Вызывается через enableShutdownHooks() в main.ts
   */
  enableShutdownHooks(app: { close: () => Promise<void> }) {
    process.on('beforeExit', () => {
      this.logger.log('Database disconnecting...');
      void app.close();
    });
  }

  private handleQueryEvent(event: PrismaQueryEvent): void {
    if (
      !this.operationalMetricsService.isEnabled() ||
      event.duration < this.slowQueryThresholdMs
    ) {
      return;
    }

    const operation = getSqlOperation(event.query);
    this.operationalMetricsService.recordSlowQuery({
      durationMs: event.duration,
      operation,
    });
    this.logger.warn(
      JSON.stringify({
        type: 'db_slow_query',
        durationMs: event.duration,
        operation,
        thresholdMs: this.slowQueryThresholdMs,
        target: event.target,
      }),
    );
  }
}

interface PrismaQueryEvent {
  query: string;
  duration: number;
  target: string;
}

function getSqlOperation(query: string): string {
  const [operation = 'UNKNOWN'] = query.trim().split(/\s+/, 1);
  return operation.toUpperCase();
}
