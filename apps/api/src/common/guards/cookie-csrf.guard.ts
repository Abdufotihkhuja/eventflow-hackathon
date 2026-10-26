import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { SKIP_COOKIE_CSRF_KEY } from '../decorators/skip-cookie-csrf.decorator';
import {
  readWebAccessCookie,
  readWebCsrfCookie,
  readWebRefreshCookie,
  verifyCsrfToken,
} from '../../modules/auth/web-session.util';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

@Injectable()
export class CookieCsrfGuard implements CanActivate {
  constructor(
    private readonly config: ConfigService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (SAFE_METHODS.has(request.method.toUpperCase())) return true;

    // Запрос с Authorization: Bearer подделать межсайтово нельзя — заголовок
    // требует CORS-preflight, а он уже гейтится allowlist'ом CORS_ORIGINS.
    // Куку такой запрос не использует: jwt.strategy читает заголовок первым,
    // так что для web-workspace/web-admin (Bearer из localStorage) кука
    // web-сессии — мёртвый груз, и гейтить их по ней нечего.
    if (hasBearerAuthorization(request)) return true;

    const isCookieSession =
      !!readWebAccessCookie(request) || !!readWebRefreshCookie(request);
    if (!isCookieSession) return true;

    const origin = request.headers.origin;
    if (!origin || !this.allowedOrigins().has(origin)) {
      throw csrfDenied('WEB_ORIGIN_REJECTED');
    }

    // login/register/refresh/logout: см. @SkipCookieCsrf — токен принадлежит
    // сессии, которую запрос заменяет. Origin выше уже проверен.
    if (this.skipsCsrfToken(context)) return true;

    const cookieToken = readWebCsrfCookie(request);
    const headerToken = request.headers['x-csrf-token'];
    const secret = this.config.get<string>('jwt.secret');
    if (
      !secret ||
      !cookieToken ||
      typeof headerToken !== 'string' ||
      headerToken !== cookieToken ||
      !verifyCsrfToken(cookieToken, secret)
    ) {
      throw csrfDenied('WEB_CSRF_REJECTED');
    }
    return true;
  }

  private skipsCsrfToken(context: ExecutionContext): boolean {
    return (
      this.reflector.getAllAndOverride<boolean>(SKIP_COOKIE_CSRF_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) === true
    );
  }

  private allowedOrigins(): Set<string> {
    const configured = [
      this.config.get<string>('frontend.publicUrl'),
      this.config.get<string>('frontend.appUrl'),
      this.config.get<string>('frontend.adminUrl'),
      this.config.get<string>('FRONTEND_PUBLIC_URL'),
      this.config.get<string>('FRONTEND_APP_URL'),
      this.config.get<string>('FRONTEND_ADMIN_URL'),
    ].filter((value): value is string => !!value);
    return new Set(
      configured.flatMap((value) => {
        try {
          return [new URL(value).origin];
        } catch {
          return [];
        }
      }),
    );
  }
}

function hasBearerAuthorization(request: Request): boolean {
  const header = request.headers.authorization;
  return typeof header === 'string' && /^bearer\s+\S/i.test(header);
}

function csrfDenied(code: string): ForbiddenException {
  return new ForbiddenException({
    code,
    message: 'Web session request отклонён',
  });
}
