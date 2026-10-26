import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { buildRouteLabel } from './observability.helpers';
import { OperationalMetricsService } from './operational-metrics.service';

@Injectable()
export class RequestMetricsInterceptor implements NestInterceptor {
  constructor(
    private readonly operationalMetricsService: OperationalMetricsService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (
      context.getType<'http'>() !== 'http' ||
      !this.operationalMetricsService.isEnabled()
    ) {
      return next.handle();
    }

    const startedAt = performance.now();
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    return next.handle().pipe(
      finalize(() => {
        this.operationalMetricsService.recordRequest({
          method: request.method,
          route: buildRouteLabel(request),
          statusCode: response.statusCode,
          durationMs: performance.now() - startedAt,
        });
      }),
    );
  }
}
