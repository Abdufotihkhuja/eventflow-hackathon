import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PlatformElevationMode, PlatformRole } from '@prisma/client';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import type { ICurrentUser } from '../interfaces';
import { hashElevationToken } from '../../modules/super-admin/platform-elevation.service';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

interface AdminRequest extends Request {
  user?: ICurrentUser;
}

@Injectable()
export class PlatformElevationGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AdminRequest>();
    if (request.user?.platformRole !== PlatformRole.SUPER_ADMIN) return true;
    const path = request.originalUrl ?? request.url;
    if (
      !path.includes('/super-admin/') ||
      path.includes('/super-admin/elevations')
    ) {
      return true;
    }

    const supplied = request.headers['x-eventflow-elevation'];
    if (typeof supplied !== 'string' || !supplied || supplied.includes(',')) {
      throw elevationDenied('PLATFORM_ELEVATION_REQUIRED');
    }
    const elevation = await this.prisma.platformElevation.findUnique({
      where: { tokenHash: hashElevationToken(supplied) },
    });
    const now = new Date();
    if (
      !elevation ||
      elevation.accountId !== request.user.accountId ||
      elevation.revokedAt ||
      elevation.expiresAt <= now
    ) {
      throw elevationDenied('PLATFORM_ELEVATION_INVALID');
    }

    const organizationId =
      typeof request.params?.orgId === 'string'
        ? request.params.orgId
        : typeof request.params?.organizationId === 'string'
          ? request.params.organizationId
          : undefined;
    if (
      elevation.organizationId &&
      elevation.organizationId !== organizationId
    ) {
      throw elevationDenied('PLATFORM_ELEVATION_SCOPE_MISMATCH');
    }

    // Запись требует WRITE-elevation (консоль запрашивает его сама при входе).
    // Одобрение вторым оператором здесь не проверяется: платформенная команда
    // работает в одиночку, а разбор действий держится на admin audit log.
    // Точечное правило четырёх глаз — только через approveWrite, когда
    // понадобится для отдельных разрушительных операций.
    if (
      !SAFE_METHODS.has(request.method.toUpperCase()) &&
      elevation.mode !== PlatformElevationMode.WRITE
    ) {
      throw elevationDenied('PLATFORM_WRITE_ELEVATION_REQUIRED');
    }
    return true;
  }
}

function elevationDenied(code: string): ForbiddenException {
  return new ForbiddenException({
    code,
    message: 'Platform operation требует elevation',
  });
}
