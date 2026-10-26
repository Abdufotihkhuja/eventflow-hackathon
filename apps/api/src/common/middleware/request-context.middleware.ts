import { Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { buildRouteLabel } from '../../modules/platform/observability/observability.helpers';

export interface RequestWithContext extends Request {
  requestId?: string;
}

const logger = new Logger('HttpAccess');

export function requestContextMiddleware(
  request: RequestWithContext,
  response: Response,
  next: NextFunction,
): void {
  const startedAt = Date.now();
  const requestIdHeader = request.headers['x-request-id'];
  const requestId =
    (Array.isArray(requestIdHeader) ? requestIdHeader[0] : requestIdHeader) ??
    randomUUID();

  request.requestId = requestId;
  response.setHeader('x-request-id', requestId);

  response.on('finish', () => {
    logger.log(
      JSON.stringify({
        type: 'http_access',
        requestId,
        method: request.method,
        path: request.originalUrl || request.url,
        route: buildRouteLabel(request),
        statusCode: response.statusCode,
        durationMs: Date.now() - startedAt,
      }),
    );
  });

  next();
}
