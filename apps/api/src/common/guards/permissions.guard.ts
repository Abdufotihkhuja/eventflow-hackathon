import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import type { ICurrentUser } from '../interfaces';
import type { PermissionCode } from '../constants/permissions.constant';
import { UserType } from '@prisma/client';

interface RequestWithUser {
  user?: ICurrentUser;
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<
      PermissionCode[]
    >(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user) {
      return false;
    }

    // SuperAdmin — платформенный актор, маска доступа организации на него
    // не распространяется.
    if (user.type === UserType.SUPER_ADMIN) {
      return true;
    }

    // Владелец (Organization) имеет все права, КРОМЕ закрытых маской доступа
    // организации (тонкое управление супер-админа применяется и к владельцу).
    if (user.type === UserType.ORGANIZATION) {
      const denied = user.accessDeniedPermissions;
      if (!denied || denied.length === 0) {
        return true;
      }
      return requiredPermissions.every(
        (permission) => !denied.includes(permission),
      );
    }

    // Для Member проверяем permissions (уже с вычтенной маской, jwt.strategy).
    if (user.type === UserType.MEMBER && user.permissions) {
      return requiredPermissions.every((permission) =>
        user.permissions!.includes(permission),
      );
    }

    return false;
  }
}
