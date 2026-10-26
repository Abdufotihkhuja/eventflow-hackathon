import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { QueueModule } from '../queue/queue.module';
import { InternalMetricsGuard } from './internal-metrics.guard';
import { ObservabilityController } from './observability.controller';
import { OperationalMetricsService } from './operational-metrics.service';
import { RequestMetricsInterceptor } from './request-metrics.interceptor';

@Global()
@Module({
  imports: [QueueModule],
  controllers: [ObservabilityController],
  providers: [
    OperationalMetricsService,
    InternalMetricsGuard,
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestMetricsInterceptor,
    },
  ],
  exports: [OperationalMetricsService],
})
export class ObservabilityModule {}
