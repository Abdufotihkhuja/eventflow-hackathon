import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PlatformRole } from '@prisma/client';
import { REQUIRE_PLATFORM_ADMIN_KEY } from '../decorators/require-platform-admin.decorator';
import type { ICurrentUser } from '../interfaces';

interface RequestWithUser {
  user?: ICurrentUser;
}

@Injectable()
export class RequirePlatformAdminGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isRequired = this.reflector.getAllAndOverride<boolean>(
      REQUIRE_PLATFORM_ADMIN_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!isRequired) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();

    if (request.user?.platformRole !== PlatformRole.SUPER_ADMIN) {
      throw new ForbiddenException('Требуется platform-admin доступ');
    }

    return true;
  }
}
