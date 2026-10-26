import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

@Injectable()
export class InternalMetricsGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const expectedToken =
      this.configService.getOrThrow<string>('METRICS_INTERNAL_TOKEN');
    const metricsHeader = request.headers['x-internal-metrics-token'];
    const providedToken =
      typeof metricsHeader === 'string'
        ? metricsHeader
        : undefined;

    if (!expectedToken || !providedToken || providedToken !== expectedToken) {
      throw new UnauthorizedException('Invalid internal metrics token');
    }

    return true;
  }
}
