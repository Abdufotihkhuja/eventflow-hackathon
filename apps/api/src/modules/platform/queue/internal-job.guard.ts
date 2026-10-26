import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

@Injectable()
export class InternalJobGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const expectedToken =
      this.configService.getOrThrow<string>('INTERNAL_JOB_TOKEN');
    const providedToken = request.headers['x-internal-job-token'];

    if (
      !expectedToken ||
      typeof providedToken !== 'string' ||
      providedToken !== expectedToken
    ) {
      throw new UnauthorizedException('Invalid internal job token');
    }

    return true;
  }
}
